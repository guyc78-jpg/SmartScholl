import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    const alerts = [];
    const students = await base44.asServiceRole.entities.Student.list();
    
    // Get current date for week calculation
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday

    for (const student of students) {
      // Check 1: High absences (3+ in a week)
      const absences = await base44.asServiceRole.entities.AttendanceRecord.filter({
        student_id: student.id,
        status: { $in: ['נעדר', 'מאחר'] },
        date: {
          $gte: weekStart.toISOString().split('T')[0],
          $lte: weekEnd.toISOString().split('T')[0]
        }
      });

      const absentCount = absences.filter(a => a.status === 'נעדר').length;
      if (absentCount >= 3) {
        alerts.push({
          student_id: student.id,
          student_name: student.full_name,
          class_id: student.class_id,
          alert_type: 'high_absences',
          severity: 'high',
          message: `${student.full_name} היה נעדר ${absentCount} פעמים בשבוע הזה`,
          details: { absences: absentCount, period: 'weekly' },
          is_active: true
        });
      }

      // Check 2: Consecutive lates (2+)
      const lates = await base44.asServiceRole.entities.AttendanceRecord.filter({
        student_id: student.id,
        status: 'מאחר'
      });

      if (lates.length >= 2) {
        const recentLates = lates.slice(-2);
        const datesConsecutive = recentLates.every((late, idx) => {
          if (idx === 0) return true;
          const prevDate = new Date(recentLates[idx - 1].date);
          const currDate = new Date(late.date);
          const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
          return dayDiff <= 2; // Within 2 days
        });

        if (datesConsecutive) {
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

      // Check 3: Upcoming exam (within 2 days)
      const exams = await base44.asServiceRole.entities.Exam.filter({
        class_id: student.class_id
      });

      const upcomingExams = exams.filter(exam => {
        const examDate = new Date(exam.date);
        const daysUntil = (examDate - today) / (1000 * 60 * 60 * 24);
        return daysUntil > 0 && daysUntil <= 2;
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

      // Check 4: Exam overload (3+ exams in 3 days)
      const threeDaysExams = exams.filter(exam => {
        const examDate = new Date(exam.date);
        const daysUntil = (examDate - today) / (1000 * 60 * 60 * 24);
        return daysUntil > 0 && daysUntil <= 3;
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

      // Check 5: Pending task (due today or overdue)
      const tasks = await base44.asServiceRole.entities.Task.filter({
        student_id: student.id,
        status: 'לביצוע'
      });

      const pendingTasks = tasks.filter(task => {
        const dueDate = new Date(task.due_date);
        return dueDate <= today;
      });

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

      // Check 6: Open incident (open discipline event)
      const incidents = await base44.asServiceRole.entities.DisciplineEvent.filter({
        student_id: student.id,
        status: 'פתוח'
      });

      if (incidents.length > 0) {
        alerts.push({
          student_id: student.id,
          student_name: student.full_name,
          class_id: student.class_id,
          alert_type: 'open_incident',
          severity: 'high',
          message: `${student.full_name} יש ${incidents.length} אירוע חריג פתוח`,
          details: { incident_count: incidents.length },
          is_active: true
        });
      }
    }

    return Response.json({ alerts, count: alerts.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});