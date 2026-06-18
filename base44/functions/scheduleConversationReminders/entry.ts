import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Israel local time → UTC. Handles DST (Apr-Oct = +3, otherwise +2) well enough for reminders.
function israelOffsetHours(date) {
  const month = date.getUTCMonth(); // 0-11
  return month >= 3 && month <= 9 ? 3 : 2;
}

// Build a UTC Date from a local Israel "YYYY-MM-DD" + "HH:MM"
function israelLocalToUtc(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  if ([y, m, d, hh, mm].some(v => Number.isNaN(v))) return null;
  // approximate the offset using the naive UTC of the local time
  const naive = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offset = israelOffsetHours(naive);
  return new Date(Date.UTC(y, m - 1, d, hh - offset, mm));
}

const MIDDLE_GRADES = new Set(['ז', 'ח', 'ט', '7', '8', '9']);
const UPPER_GRADES = new Set(['י', 'יא', 'יב', 'י׳', 'י״א', 'י״ב', '10', '11', '12']);

function parseRoles(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try { const parsed = JSON.parse(trimmed); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return trimmed.split(',').map(item => item.trim()).filter(Boolean);
}

function getRoles(user) {
  const roles = [
    ...parseRoles(user?.authorization?.roles || user?.roles || user?.available_roles),
    user?.authorization?.role,
    user?.role,
  ].filter(Boolean);
  return [...new Set(roles)];
}

function compact(values) {
  return [...new Set(values.filter(v => v !== undefined && v !== null && String(v).trim() !== '').map(v => String(v).trim()))];
}

function getUserClassValues(user) {
  return compact([
    user?.profile_class_id, user?.profile_homeroom_class_id, user?.homeroomClassId,
    user?.authorization?.scope?.homeroomClassId,
    user?.authorization?.scopes_by_role?.homeroom_teacher?.homeroomClassId,
    user?.profile_class, user?.profile_homeroom_class,
  ]);
}

function getUserGradeValues(user) {
  return compact([
    user?.profile_grade_managed, user?.gradeId, user?.authorization?.scope?.gradeId,
    user?.authorization?.scopes_by_role?.grade_coordinator?.gradeId,
    user?.authorization?.scopes_by_role?.coordinator?.gradeId,
  ]);
}

function normalizeDivision(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text === 'middle' || text.includes('ביניים')) return 'middle';
  if (text === 'upper' || text.includes('עליונה')) return 'upper';
  return text;
}

function gradeToDivision(grade) {
  const value = String(grade || '').trim();
  if (MIDDLE_GRADES.has(value)) return 'middle';
  if (UPPER_GRADES.has(value)) return 'upper';
  return '';
}

function getUserDivision(user) {
  return normalizeDivision(user?.profile_division || user?.divisionType || user?.authorization?.scope?.divisionType);
}

function buildClassInfo(classes, conv) {
  const classId = conv?.class_id || '';
  const klass = classes.find(c => c.id === classId) || classes.find(c => c.name === classId || c.class_code === classId) || null;
  const grade = klass?.grade || '';
  return {
    class_id: classId || klass?.id || '',
    class_name: klass?.name || '',
    grade,
    division: gradeToDivision(grade),
  };
}

function userCanReceive(user, classInfo) {
  const roles = getRoles(user);
  if (roles.includes('system_admin') || roles.includes('admin')) return true;
  if (roles.includes('homeroom_teacher')) {
    const userClasses = getUserClassValues(user);
    if (userClasses.includes(classInfo.class_id) || userClasses.includes(classInfo.class_name)) return true;
  }
  if (roles.includes('grade_coordinator') || roles.includes('coordinator')) {
    const userGrades = getUserGradeValues(user);
    if (userGrades.includes(String(classInfo.grade || '').trim())) return true;
  }
  if (roles.includes('division_manager')) {
    const userDivision = getUserDivision(user);
    if (userDivision && classInfo.division && userDivision === classInfo.division) return true;
  }
  return false;
}

const TYPE_PREFIX = {
  'שיחה אישית עם תלמיד': 'שיחה אישית',
  'שיחת הורים': 'שיחה עם הורים',
  'פגישה טיפולית': 'פגישה טיפולית',
  'תזכורת טיפולית': 'תזכורת טיפולית',
};

function buildReminder(conv) {
  const typeLabel = TYPE_PREFIX[conv.conversation_type] || 'שיחה';
  const parts = [];
  if (conv.student_name) parts.push(conv.student_name);
  parts.push(`היום בשעה ${conv.time}`);
  return {
    title: `תזכורת: ${typeLabel} בעוד שעה`,
    body: parts.join(' · '),
    url: conv.student_id ? `/students/${conv.student_id}` : '/conversations',
  };
}

function buildOverdue(conv) {
  const typeLabel = TYPE_PREFIX[conv.conversation_type] || 'שיחה';
  const parts = [];
  if (conv.student_name) parts.push(conv.student_name);
  parts.push(`נקבעה ל-${conv.date} ${conv.time} וטרם טופלה`);
  return {
    title: `${typeLabel} שלא טופלה בזמן`,
    body: parts.join(' · '),
    url: conv.student_id ? `/students/${conv.student_id}` : '/conversations',
  };
}

// שולח התראות פוש לרשימת שיחות, עם בונה הודעה ואירוע נתונים, ומסמן את השדה שניתן
async function queueForConversations(base44, list, buildFn, eventType, users, subscribedUserIds, classes, nowIso, markFields) {
  let queued = 0;
  for (const conv of list) {
    const classInfo = buildClassInfo(classes || [], conv);
    const message = buildFn(conv);
    const recipientIds = new Set();
    if (conv.owner_user_id && subscribedUserIds.has(conv.owner_user_id)) recipientIds.add(conv.owner_user_id);
    for (const user of (users || [])) {
      if (!subscribedUserIds.has(user.id)) continue;
      if (userCanReceive(user, classInfo)) recipientIds.add(user.id);
    }
    const records = [...recipientIds].map(userId => {
      const user = (users || []).find(u => u.id === userId);
      return {
        recipient_user_id: userId,
        recipient_email: user?.email || '',
        actor_user_id: '',
        event_type: eventType,
        student_id: conv.student_id || '',
        student_name: conv.student_name || '',
        class_id: classInfo.class_id || '',
        title: message.title,
        body: message.body,
        url: message.url,
        status: 'pending',
        queued_at: nowIso,
      };
    });
    if (records.length) {
      await base44.asServiceRole.entities.PushNotificationQueue.bulkCreate(records);
      queued += records.length;
    }
    await base44.asServiceRole.entities.ScheduledConversation.update(conv.id, markFields(conv));
  }
  return queued;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const nowIso = now.toISOString();

    // Window: conversations starting between now and ~65 minutes from now.
    const windowStart = now.getTime();
    const windowEnd = windowStart + 65 * 60 * 1000;

    const conversations = await base44.asServiceRole.entities.ScheduledConversation.filter(
      { status: 'מתוכננת' }, '-updated_date', 500
    );

    const dueNow = (conversations || []).filter(conv => {
      const startUtc = israelLocalToUtc(conv.date, conv.time);
      if (!startUtc) return false;
      const t = startUtc.getTime();
      if (t < windowStart || t > windowEnd) return false;
      // Skip if a reminder was already sent for this exact start time (handles edits).
      if (conv.reminder_sent && conv.reminder_for_datetime === startUtc.toISOString()) return false;
      return true;
    });

    // שיחות שעברו יותר משעתיים מהמועד ועדיין מתוכננות — לא טופלו בזמן
    const overdueCutoff = windowStart - 2 * 60 * 60 * 1000;
    const overdue = (conversations || []).filter(conv => {
      if (conv.overdue_notified) return false;
      const startUtc = israelLocalToUtc(conv.date, conv.time);
      if (!startUtc) return false;
      return startUtc.getTime() < overdueCutoff;
    });

    if (!dueNow.length && !overdue.length) {
      return Response.json({ ok: true, queued: 0, checked: (conversations || []).length });
    }

    const [users, subscriptions, classes] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.PushSubscription.filter({ is_active: true }),
      base44.asServiceRole.entities.ClassRoom.list(),
    ]);

    const subscribedUserIds = new Set((subscriptions || []).map(s => s.user_id).filter(Boolean));

    const remindersQueued = await queueForConversations(
      base44, dueNow, buildReminder, 'conversation_reminder', users, subscribedUserIds, classes, nowIso,
      (conv) => ({ reminder_sent: true, reminder_for_datetime: israelLocalToUtc(conv.date, conv.time).toISOString() })
    );

    const overdueQueued = await queueForConversations(
      base44, overdue, buildOverdue, 'parent_communication', users, subscribedUserIds, classes, nowIso,
      () => ({ overdue_notified: true })
    );

    return Response.json({ ok: true, queued: remindersQueued + overdueQueued, reminders: dueNow.length, overdue: overdue.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});