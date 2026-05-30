import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Group an array of records by a key field into a Map of key -> records[]
function groupBy(records, keyField) {
  const map = new Map();
  for (const r of records) {
    const k = r[keyField];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return map;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only staff can generate alerts
    const isStaff = ['admin', 'homeroom_teacher', 'coordinator'].includes(user.role);
    if (!isStaff) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Date context (Israel timezone)
    const nowIsrael = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
    const todayStr = nowIsrael.toISOString().split('T')[0];
    const today = new Date(todayStr);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // ⚡ Load everything in parallel — a fixed, small number of queries
    // instead of 6 queries per student (which caused 429 rate limits).
    const [students, attendance, exams, tasks, incidents] = await Promise.all([
      base44.asServiceRole.entities.Student.list(),
      base44.asServiceRole.entities.AttendanceRecord.list(),
      base44.asServiceRole.entities.Exam.list(),
      base44.asServiceRole.entities.Task.filter({ status: 'לביצוע' }),
      base44.asServiceRole.entities.DisciplineEvent.filter({ status: 'פתוח' }),
    ]);

    // Index for O(1) lookups per student / class
    const attByStudent = groupBy(attendance, 'student_id');
    const examsByClass = groupBy(exams, 'class_id');
    const tasksByStudent = groupBy(tasks, 'student_id');
    const incidentsByStudent = groupBy(incidents, 'student_id');

    const alerts = [];

    for (const student of students) {
      const sAtt = attByStudent.get(student.id) || [];

      // Check 1: High absences this week (3+)
      const weekAbsences = sAtt.filter(a =>
        (a.status === 'נעדר' || a.status === 'נעדר/ת') &&
        a.date >= weekStartStr && a.date <= weekEndStr
      );
      if (weekAbsences.length >= 3) {
        alerts.push({
          student_id: student.id,
          student_name: student.full_name,
          class_id: student.class_id,
          alert_type: 'high_absences',
          severity: 'high',
          message: `${student.full_name} היה נעדר ${weekAbsences.length} פעמים בשבוע הזה`,
          details: { absences: weekAbsences.length, period: 'weekly' },
          is_active: true
        });
      }

      // Check 2: Consecutive lates (2+ within 2 days)
      const lates = sAtt
        .filter(a => a.status === 'מאחר' || a.status === 'מאחר/ת')
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      if (lates.length >= 2) {
        const recent = lates.slice(-2);
        const dayDiff = (new Date(recent[1].date) - new Date(recent[0].date)) / (1000 * 60 * 60 * 24);
        if (dayDiff <= 2) {
          alerts.push({
            student_id: student.id,
            student_name: student.full_name,
            class_id: student.class_id,
            alert_type: 'consecutive_lates',
            severity: 'medium',
            message: `${student.full_name} היה מאחר בתקופה אחרונה`,
            details: { count: 2, recent: true },
            is_active: true
          });
        }
      }

      // Exams for this class
      const classExams = examsByClass.get(student.class_id) || [];

      // Check 3: Upcoming exam (within 2 days)
      const upcomingExams = classExams.filter(exam => {
        const daysUntil = (new Date(exam.date) - today) / (1000 * 60 * 60 * 24);
        return daysUntil >= 0 && daysUntil <= 2;
      });
      if (upcomingExams.length > 0) {
        const exam = upcomingExams[0];
        alerts.push({
          student_id: student.id,
          student_name: student.full_name,
          class_id: student.class_id,
          alert_type: 'upcoming_exam',
          severity: 'medium',
          message: `מבחן קרוב: ${exam.title} - ${exam.subject} ב-${exam.date}`,
          details: { exam_id: exam.id, subject: exam.subject, date: exam.date },
          is_active: true
        });
      }

      // Check 4: Exam overload (3+ in 3 days)
      const threeDaysExams = classExams.filter(exam => {
        const daysUntil = (new Date(exam.date) - today) / (1000 * 60 * 60 * 24);
        return daysUntil >= 0 && daysUntil <= 3;
      });
      if (threeDaysExams.length >= 3) {
        alerts.push({
          student_id: student.id,
          student_name: student.full_name,
          class_id: student.class_id,
          alert_type: 'exam_overload',
          severity: 'critical',
          message: `עומס מבחנים: ${threeDaysExams.length} מבחנים ב-3 ימים הקרובים`,
          details: { exam_count: threeDaysExams.length, exams: threeDaysExams.map(e => ({ subject: e.subject, date: e.date })) },
          is_active: true
        });
      }

      // Check 5: Pending tasks (due today or overdue)
      const pendingTasks = (tasksByStudent.get(student.id) || []).filter(task =>
        new Date(task.due_date) <= today
      );
      if (pendingTasks.length > 0) {
        alerts.push({
          student_id: student.id,
          student_name: student.full_name,
          class_id: student.class_id,
          alert_type: 'pending_task',
          severity: 'high',
          message: `${student.full_name} לא ביצע ${pendingTasks.length} משימות עד למועדן`,
          details: { task_count: pendingTasks.length },
          is_active: true
        });
      }

      // Check 6: Open incidents
      const openIncidents = incidentsByStudent.get(student.id) || [];
      if (openIncidents.length > 0) {
        alerts.push({
          student_id: student.id,
          student_name: student.full_name,
          class_id: student.class_id,
          alert_type: 'open_incident',
          severity: 'high',
          message: `${student.full_name} יש ${openIncidents.length} אירוע חריג פתוח`,
          details: { incident_count: openIncidents.length },
          is_active: true
        });
      }
    }

    return Response.json({ alerts, count: alerts.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});