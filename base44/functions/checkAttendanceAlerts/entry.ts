import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';

function parseRoles(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try { const parsed = JSON.parse(text); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return text.split(',').map(role => role.trim()).filter(Boolean);
}

function israelDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { event } = body;

    if (!event || !event.entity_id) {
      return Response.json({ skipped: 'Missing event data' });
    }

    // Handle only AttendanceRecord creation/update
    if (event.entity_name !== 'AttendanceRecord' || !['create', 'update'].includes(event.type)) {
      return Response.json({ skipped: 'Not an AttendanceRecord event' });
    }

    const recordId = event.entity_id;
    const record = await base44.asServiceRole.entities.AttendanceRecord.get(recordId);

    if (!record) {
      return Response.json({ error: 'Record not found' });
    }

    const roles = [...new Set([...parseRoles(user.roles), ...parseRoles(user.available_roles), user.role].filter(Boolean))];
    const privilegedCaller = user?.is_service === true || roles.includes('admin') || roles.includes('system_admin');
    const callerOwnsEvent = (record.created_by_id && record.created_by_id === user.id)
      || (record.created_by && String(record.created_by).toLowerCase() === String(user.email || '').toLowerCase());
    if (!privilegedCaller && !callerOwnsEvent) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only process absences (נעדר / נעדר/ת)
    const ABSENCE_STATUSES = ['נעדר', 'נעדר/ת'];
    if (!ABSENCE_STATUSES.includes(record.status)) {
      return Response.json({ processed: false, reason: 'Not an absence' });
    }

    const students = await base44.asServiceRole.entities.Student.filter({ id: record.student_id });
    const student = students[0];
    const classId = student?.class_id || record.class_id || '';
    const grade = student?.grade || record.grade || '';
    if (!student || !classId || !grade) {
      return Response.json({ processed: false, reason: 'Student scope could not be verified' });
    }

    // Count absences for this student in the last 30 days
    const today = new Date(`${israelDateString()}T00:00:00Z`);
    today.setUTCDate(today.getUTCDate() - 30);
    const fromDate = today.toISOString().split('T')[0];

    const absenceRecords = await base44.asServiceRole.entities.AttendanceRecord.filter({
      student_id: record.student_id,
      class_id: classId,
    });

    // Filter for last 30 days, counting both 'נעדר' and 'נעדר/ת'
    const recentAbsences = absenceRecords.filter(r => ABSENCE_STATUSES.includes(r.status) && r.date >= fromDate);
    const absenceCount = new Set(recentAbsences.map(item => item.date).filter(Boolean)).size;

    // Thresholds for alerts
    const MEDIUM_THRESHOLD = 3; // 3+ in 30 days
    const HIGH_THRESHOLD = 5;   // 5+ in 30 days

    let shouldAlert = false;
    let severity = 'medium';

    if (absenceCount >= HIGH_THRESHOLD) {
      shouldAlert = true;
      severity = 'high';
    } else if (absenceCount >= MEDIUM_THRESHOLD) {
      shouldAlert = true;
      severity = 'medium';
    }

    if (!shouldAlert) {
      return Response.json({ processed: true, alertCreated: false, reason: 'Below threshold' });
    }

    // Check if there's already an active alert for this student
    const existingAlerts = await base44.asServiceRole.entities.SmartAlert.filter({
      student_id: record.student_id,
      class_id: classId,
      alert_type: 'high_absences',
      is_active: true,
    });

    // If active alert exists, update it instead of creating a new one
    if (existingAlerts.length > 0) {
      const existingAlert = existingAlerts[0];
      const activeThreshold = severity === 'high' ? HIGH_THRESHOLD : MEDIUM_THRESHOLD;
      await base44.asServiceRole.entities.SmartAlert.update(existingAlert.id, {
        class_id: classId,
        grade,
        message: `⚠️ ${record.student_name} חסר/ה ${absenceCount} ימים בחודש האחרון. דרוש דיון עם הוריו.`,
        severity,
        is_active: true,
        details: {
          absenceCount,
          threshold: activeThreshold,
          lastAbsenceDate: record.date,
        },
      });
      return Response.json({ processed: true, alertCreated: false, alertUpdated: true });
    }

    // Create new SmartAlert
    const newAlert = await base44.asServiceRole.entities.SmartAlert.create({
      student_id: record.student_id,
      student_name: record.student_name,
      class_id: classId,
      grade,
      alert_type: 'high_absences',
      severity,
      message: `⚠️ ${record.student_name} חסר/ה ${absenceCount} ימים בחודש האחרון. דרוש דיון עם הוריו.`,
      is_active: true,
      details: {
        absenceCount,
        threshold: MEDIUM_THRESHOLD,
        lastAbsenceDate: record.date,
      },
    });

    return Response.json({
      processed: true,
      alertCreated: true,
      alertId: newAlert.id,
      message: `התראה יצורה ל${record.student_name}: ${absenceCount} היעדרויות`,
    });
  } catch (error) {
    console.error('checkAttendanceAlerts error:', error.message);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});
