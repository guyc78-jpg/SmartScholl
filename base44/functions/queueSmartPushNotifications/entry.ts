import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const EVENT_LABELS = {
  attendance_exception: 'חריג נוכחות',
  community_exception: 'מעורבות חברתית',
  parent_communication: 'שיחת הורים',
  discipline_event: 'משמעת',
  new_task: 'משימה',
  urgent_treatment: 'טיפול דחוף',
  exam_grade: 'ציון מבחן',
};

// ספים להתראות חכמות (ניתן לכוונון)
const ATTENDANCE_STREAK_THRESHOLD = 3; // רצף חיסורים/איחורים שמחייב התראה
const DISCIPLINE_RECURRENCE_DAYS = 30; // חלון לזיהוי חזרתיות אירועי משמעת
const DISCIPLINE_RECURRENCE_THRESHOLD = 3; // מספר אירועים בחלון שמחייב התראה
const EXAM_LOW_GRADE = 55; // ציון מתחת לסף
const EXAM_DROP_THRESHOLD = 20; // ירידה חריגה בנקודות לעומת ממוצע קודם

const ABSENCE_STATUSES = new Set(['נעדר', 'נעדר/ת']);
const LATE_STATUSES = new Set(['מאחר', 'מאחר/ת']);
const SEVERE_DISCIPLINE = new Set(['חמורה', 'דחוף', 'דחופה']);
const PRESENT_STATUSES = new Set(['נוכח', 'נוכח/ת']);
const COMMUNITY_EXCEPTION_STATUSES = new Set(['ממתין לאישור', 'דורש תיקון', 'נדחה']);
const MIDDLE_GRADES = new Set(['ז', 'ח', 'ט', '7', '8', '9']);
const UPPER_GRADES = new Set(['י', 'יא', 'יב', 'י׳', 'י״א', 'י״ב', '10', '11', '12']);

function parseRoles(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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
  return [...new Set(values.filter(value => value !== undefined && value !== null && String(value).trim() !== '').map(value => String(value).trim()))];
}

function getUserClassValues(user) {
  return compact([
    user?.profile_class_id,
    user?.profile_homeroom_class_id,
    user?.homeroomClassId,
    user?.authorization?.scope?.homeroomClassId,
    user?.authorization?.scopes_by_role?.homeroom_teacher?.homeroomClassId,
    user?.profile_class,
    user?.profile_homeroom_class,
  ]);
}

function getUserGradeValues(user) {
  return compact([
    user?.profile_grade_managed,
    user?.gradeId,
    user?.authorization?.scope?.gradeId,
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

function buildClassInfo(classes, data) {
  const classId = data?.class_id || data?.classId || '';
  const byId = classes.find(item => item.id === classId);
  const byName = classes.find(item => item.name === classId || item.class_code === classId);
  const klass = byId || byName || null;
  return {
    class_id: classId || klass?.id || '',
    class_name: data?.class_name || klass?.name || '',
    grade: data?.grade || data?.grade_id || klass?.grade || '',
    division: normalizeDivision(data?.divisionType || data?.division_type) || gradeToDivision(data?.grade || data?.grade_id || klass?.grade),
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

function getEventDescriptor(entityName, data, oldData, eventType, history) {
  const studentName = data?.student_name || data?.studentName || data?.student_full_name || data?.student || '';
  const studentId = data?.student_id || data?.studentId || '';

  if (entityName === 'AttendanceRecord') {
    if (eventType !== 'create' || PRESENT_STATUSES.has(data?.status)) return null;
    const isAbsence = ABSENCE_STATUSES.has(data?.status);
    const isLate = LATE_STATUSES.has(data?.status);
    const streak = history?.attendanceStreak || 1;

    // רצף חיסורים/איחורים שחצה את הסף — התראה מודגשת
    if ((isAbsence || isLate) && streak >= ATTENDANCE_STREAK_THRESHOLD) {
      const kind = isAbsence ? 'חיסורים' : 'איחורים';
      return {
        event_type: 'attendance_exception',
        title: `רצף ${kind} — ${streak} ברצף`,
        body: `${studentName || 'תלמיד/ה'} · ${streak} ${kind} ברצף · מומלץ ליצור קשר`,
        url: studentId ? `/students/${studentId}` : '/class-attendance',
        student_id: studentId,
        student_name: studentName,
      };
    }

    return {
      event_type: 'attendance_exception',
      title: 'חריג נוכחות חדש',
      body: `${studentName || 'תלמיד/ה'} · ${data?.status || 'חריג נוכחות'}`,
      url: studentId ? `/students/${studentId}` : '/class-attendance',
      student_id: studentId,
      student_name: studentName,
    };
  }

  if (entityName === 'CommunityServiceReport') {
    const statusChanged = oldData && oldData.status !== data?.status;
    if (!COMMUNITY_EXCEPTION_STATUSES.has(data?.status) || (eventType === 'update' && !statusChanged)) return null;
    return {
      event_type: 'community_exception',
      title: 'עדכון מעורבות חברתית',
      body: `${studentName || 'תלמיד/ה'} · ${data?.status}`,
      url: '/community',
      student_id: studentId,
      student_name: studentName,
    };
  }

  if (entityName === 'Communication') {
    if (eventType !== 'create') return null;
    return {
      event_type: 'parent_communication',
      title: 'שיחת הורים חדשה',
      body: `${studentName || 'תלמיד/ה'} · ${data?.type || 'תקשורת חדשה'}`,
      url: studentId ? `/students/${studentId}` : '/communications',
      student_id: studentId,
      student_name: studentName,
    };
  }

  if (entityName === 'DisciplineEvent') {
    if (eventType !== 'create') return null;
    const isSevere = SEVERE_DISCIPLINE.has(data?.severity);
    const recentCount = history?.disciplineCount || 1;
    const isRecurring = recentCount >= DISCIPLINE_RECURRENCE_THRESHOLD;

    if (isRecurring) {
      return {
        event_type: 'discipline_event',
        title: `אירוע משמעת חוזר — ${recentCount} בחודש`,
        body: `${studentName || 'תלמיד/ה'} · ${recentCount} אירועים בחודש האחרון · מצריך טיפול`,
        url: studentId ? `/students/${studentId}` : '/discipline',
        student_id: studentId,
        student_name: studentName,
      };
    }
    if (isSevere) {
      return {
        event_type: 'discipline_event',
        title: 'אירוע משמעת חמור/דחוף',
        body: `${studentName || 'תלמיד/ה'} · ${data?.category || 'אירוע חמור'} · ${data?.severity}`,
        url: studentId ? `/students/${studentId}` : '/discipline',
        student_id: studentId,
        student_name: studentName,
      };
    }
    return {
      event_type: 'discipline_event',
      title: 'אירוע משמעת חדש',
      body: `${studentName || 'תלמיד/ה'} · ${data?.severity || data?.category || 'אירוע חדש'}`,
      url: studentId ? `/students/${studentId}` : '/discipline',
      student_id: studentId,
      student_name: studentName,
    };
  }

  if (entityName === 'ExamGradeReport') {
    // רק כשהציון אושר (ולא דיווח גולמי של תלמיד) — או בעדכון לסטטוס אושר
    const justApproved = data?.status === 'אושר' && (eventType === 'create' || oldData?.status !== 'אושר');
    if (!justApproved) return null;
    const grade = Number(data?.reported_grade);
    if (Number.isNaN(grade)) return null;

    const subject = data?.subject || '';
    const prevAvg = history?.examPrevAvg;
    const isLow = grade < EXAM_LOW_GRADE;
    const drop = (typeof prevAvg === 'number' && prevAvg - grade >= EXAM_DROP_THRESHOLD);
    if (!isLow && !drop) return null;

    const reason = drop
      ? `ירידה חריגה: ${Math.round(prevAvg)} → ${grade}`
      : `ציון ${grade} (מתחת ל-${EXAM_LOW_GRADE})`;
    return {
      event_type: 'exam_grade',
      title: drop ? 'ירידה חריגה בציון' : 'ציון נמוך במבחן',
      body: `${studentName || 'תלמיד/ה'}${subject ? ` · ${subject}` : ''} · ${reason}`,
      url: studentId ? `/students/${studentId}` : '/exams',
      student_id: studentId,
      student_name: studentName,
    };
  }

  if (entityName === 'Task') {
    if (eventType !== 'create') return null;
    return {
      event_type: data?.priority === 'דחופה' ? 'urgent_treatment' : 'new_task',
      title: data?.priority === 'דחופה' ? 'טיפול דחוף חדש' : 'משימה חדשה',
      body: `${studentName ? `${studentName} · ` : ''}${data?.title || 'משימה חדשה'}`,
      url: '/tasks',
      student_id: studentId,
      student_name: studentName,
    };
  }

  if (entityName === 'UrgentFlag') {
    const isUrgent = data?.priority === 'דחוף' || data?.priority === 'דחופה';
    const becameUrgent = eventType === 'create' || oldData?.priority !== data?.priority || oldData?.status !== data?.status;
    if (!isUrgent || !becameUrgent) return null;
    return {
      event_type: 'urgent_treatment',
      title: 'טיפול דחוף חדש',
      body: data?.title || 'נוסף טיפול דחוף למעקב',
      url: '/',
      student_id: studentId,
      student_name: studentName,
    };
  }

  if (entityName === 'TreatmentCase') {
    const isUrgent = ['דחוף', 'דחופה', 'גבוהה', 'critical', 'urgent'].includes(data?.priority || data?.severity);
    if (!isUrgent && eventType !== 'create') return null;
    return {
      event_type: 'urgent_treatment',
      title: 'טיפול דחוף חדש',
      body: `${studentName ? `${studentName} · ` : ''}${data?.title || data?.summary || 'נפתח טיפול למעקב'}`,
      url: '/treatment-center',
      student_id: studentId,
      student_name: studentName,
    };
  }

  return null;
}

// טוען היסטוריה רלוונטית לזיהוי חריגות "חכמות" (רצף / חזרתיות / ירידת ציון)
async function loadHistory(base44, entityName, data, eventType) {
  const studentId = data?.student_id || data?.studentId || '';
  if (!studentId) return {};

  try {
    if (entityName === 'AttendanceRecord' && eventType === 'create') {
      const records = await base44.asServiceRole.entities.AttendanceRecord.filter(
        { student_id: studentId }, '-date', 30
      );
      // ספירת רצף עוקב של אותו סוג חריגה (חיסור או איחור) מהאחרון אחורה
      const isAbsence = ABSENCE_STATUSES.has(data?.status);
      const isLate = LATE_STATUSES.has(data?.status);
      const matches = (status) => (isAbsence ? ABSENCE_STATUSES.has(status) : isLate ? LATE_STATUSES.has(status) : false);
      let streak = 0;
      for (const record of (records || [])) {
        if (matches(record.status)) streak += 1;
        else break;
      }
      return { attendanceStreak: Math.max(streak, 1) };
    }

    if (entityName === 'DisciplineEvent' && eventType === 'create') {
      const events = await base44.asServiceRole.entities.DisciplineEvent.filter(
        { student_id: studentId }, '-date', 50
      );
      const cutoff = new Date(Date.now() - DISCIPLINE_RECURRENCE_DAYS * 24 * 60 * 60 * 1000);
      const count = (events || []).filter(event => {
        const eventDate = new Date(event.date);
        return !Number.isNaN(eventDate.getTime()) && eventDate >= cutoff;
      }).length;
      return { disciplineCount: Math.max(count, 1) };
    }

    if (entityName === 'ExamGradeReport') {
      const reports = await base44.asServiceRole.entities.ExamGradeReport.filter(
        { student_id: studentId, status: 'אושר' }, '-exam_date', 20
      );
      const others = (reports || []).filter(report => report.id !== data?.id && typeof report.reported_grade === 'number');
      const recent = others.slice(0, 3);
      if (!recent.length) return {};
      const avg = recent.reduce((sum, report) => sum + Number(report.reported_grade), 0) / recent.length;
      return { examPrevAvg: avg };
    }
  } catch {
    return {};
  }
  return {};
}

function actorMatchesUser(user, data) {
  const actorUserId = data?.updated_by_id || data?.created_by_id || '';
  const actorEmail = data?.updated_by_email || data?.submitted_by_email || data?.created_by_email || '';
  return (actorUserId && actorUserId === user?.id) || (actorEmail && actorEmail === user?.email);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Block anonymous external callers — this endpoint is reachable publicly.
    // Entity-trigger automations run with an authenticated context.
    const isAuthenticated = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuthenticated) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const entityName = payload?.event?.entity_name;
    const eventType = payload?.event?.type;
    let data = payload?.data;
    const oldData = payload?.old_data;

    if (!entityName || !eventType || eventType === 'delete') return Response.json({ ok: true, queued: 0 });
    if (!data && payload?.payload_too_large && payload?.event?.entity_id) {
      data = await base44.asServiceRole.entities[entityName].get(payload.event.entity_id);
    }
    if (!data) return Response.json({ ok: true, queued: 0 });

    const history = await loadHistory(base44, entityName, data, eventType);
    const descriptor = getEventDescriptor(entityName, data, oldData, eventType, history);
    if (!descriptor) return Response.json({ ok: true, queued: 0 });

    const [users, subscriptions, classes] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.PushSubscription.filter({ is_active: true }),
      base44.asServiceRole.entities.ClassRoom.list(),
    ]);

    const subscribedUserIds = new Set((subscriptions || []).map(item => item.user_id).filter(Boolean));
    const classInfo = buildClassInfo(classes || [], data);
    const now = new Date().toISOString();
    const actorUserId = data?.updated_by_id || data?.created_by_id || '';

    const recipients = (users || []).filter(user => {
      if (!subscribedUserIds.has(user.id)) return false;
      if (actorMatchesUser(user, data)) return false;
      return userCanReceive(user, classInfo);
    });

    const records = recipients.map(user => ({
      recipient_user_id: user.id,
      recipient_email: user.email || '',
      actor_user_id: actorUserId,
      event_type: descriptor.event_type,
      student_id: descriptor.student_id || '',
      student_name: descriptor.student_name || '',
      class_id: classInfo.class_id || '',
      title: descriptor.title,
      body: descriptor.body,
      url: descriptor.url,
      status: 'pending',
      queued_at: now,
    }));

    if (records.length) await base44.asServiceRole.entities.PushNotificationQueue.bulkCreate(records);
    return Response.json({ ok: true, queued: records.length, event_type: descriptor.event_type });
  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});