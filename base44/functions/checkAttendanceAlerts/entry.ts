import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { event } = body;

    // Handle only AttendanceRecord creation/update
    if (event.entity_name !== 'AttendanceRecord') {
      return Response.json({ skipped: 'Not an AttendanceRecord event' });
    }

    const recordId = event.entity_id;
    const record = await base44.asServiceRole.entities.AttendanceRecord.get(recordId);
    
    if (!record) {
      return Response.json({ error: 'Record not found' });
    }

    // Only process absences (נעדר)
    if (record.status !== 'נעדר') {
      return Response.json({ processed: false, reason: 'Not an absence' });
    }

    // Count absences for this student in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];

    const absenceRecords = await base44.asServiceRole.entities.AttendanceRecord.filter({
      student_id: record.student_id,
      class_id: record.class_id,
      status: 'נעדר',
    });

    // Filter for last 30 days
    const recentAbsences = absenceRecords.filter(r => r.date >= fromDate);
    const absenceCount = recentAbsences.length;

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
      class_id: record.class_id,
      alert_type: 'high_absences',
      is_active: true,
    });

    // If active alert exists, update it instead of creating a new one
    if (existingAlerts.length > 0) {
      const existingAlert = existingAlerts[0];
      await base44.asServiceRole.entities.SmartAlert.update(existingAlert.id, {
        message: `⚠️ ${record.student_name} חסר/ה ${absenceCount} ימים בחודש האחרון. דרוש דיון עם הוריו.`,
        severity,
        is_active: true,
        details: {
          absenceCount,
          threshold: HIGH_THRESHOLD,
          lastAbsenceDate: record.date,
        },
      });
      return Response.json({ processed: true, alertCreated: false, alertUpdated: true });
    }

    // Create new SmartAlert
    const newAlert = await base44.asServiceRole.entities.SmartAlert.create({
      student_id: record.student_id,
      student_name: record.student_name,
      class_id: record.class_id,
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});