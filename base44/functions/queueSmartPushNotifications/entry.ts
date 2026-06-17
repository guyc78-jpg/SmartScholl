import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const EVENT_LABELS = {
  attendance_exception: 'חריג נוכחות',
  community_exception: 'מעורבות חברתית',
  parent_communication: 'שיחת הורים',
  discipline_event: 'משמעת',
  new_task: 'משימה',
  urgent_treatment: 'טיפול דחוף',
};

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

function getEventDescriptor(entityName, data, oldData, eventType) {
  const studentName = data?.student_name || data?.studentName || data?.student_full_name || data?.student || '';
  const studentId = data?.student_id || data?.studentId || '';

  if (entityName === 'AttendanceRecord') {
    if (eventType !== 'create' || PRESENT_STATUSES.has(data?.status)) return null;
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
    return {
      event_type: 'discipline_event',
      title: 'אירוע משמעת חדש',
      body: `${studentName || 'תלמיד/ה'} · ${data?.severity || data?.category || 'אירוע חדש'}`,
      url: studentId ? `/students/${studentId}` : '/discipline',
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

function actorMatchesUser(user, data) {
  const actorUserId = data?.updated_by_id || data?.created_by_id || '';
  const actorEmail = data?.updated_by_email || data?.submitted_by_email || data?.created_by_email || '';
  return (actorUserId && actorUserId === user?.id) || (actorEmail && actorEmail === user?.email);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
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

    const descriptor = getEventDescriptor(entityName, data, oldData, eventType);
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});