import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { student_id } = body;

    if (!student_id) {
      return Response.json({ error: 'student_id required' }, { status: 400 });
    }

    // Security: only staff or the student themselves may access growth data.
    // Resolve the user's real role/scope from server-side sources of truth
    // (ApprovedUser / Student) — never trust client-provided user.authorization.
    const STAFF_ROLES = ['admin', 'system_admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator', 'division_manager'];
    const email = String(user.email || '').trim().toLowerCase();
    const approvedRecords = await base44.asServiceRole.entities.ApprovedUser.filter({ email }).catch(() => []);
    const approvedRoles = approvedRecords
      .filter(record => record.isActive !== false)
      .flatMap(record => [record.role, ...(Array.isArray(record.roles) ? record.roles : [])])
      .filter(Boolean);
    const isStaff = user.role === 'admin' || user.role === 'system_admin' || approvedRoles.some(role => STAFF_ROLES.includes(role));

    let isOwnStudent = false;
    if (!isStaff) {
      const ownByUserEmail = await base44.asServiceRole.entities.Student.filter({ user_email: email }).catch(() => []);
      const ownByEmail = ownByUserEmail.length ? ownByUserEmail : await base44.asServiceRole.entities.Student.filter({ email }).catch(() => []);
      isOwnStudent = ownByEmail.some(item => item.id === student_id);
    }
    if (!isStaff && !isOwnStudent) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use asServiceRole for consistent access + fetch only what's needed for this student
    // Fetch the student first to get class_id for scoped exam query
    const studentRows = await base44.asServiceRole.entities.Student.filter({ id: student_id }).catch(() => []);
    const student = studentRows?.[0];
    if (!student) {
      return Response.json({ indicators: [], summary: {} });
    }
    const class_id = student.class_id;

    // Fetch all relevant data for the student — use asServiceRole for security
    // Exam: filter by class_id instead of listing all exams
    const [
      attendanceRecords,
      exams,
      examCompletions,
      tasks,
      disciplineEvents,
      performanceReviews
    ] = await Promise.all([
      base44.asServiceRole.entities.AttendanceRecord.filter({ student_id }),
      class_id
        ? base44.asServiceRole.entities.Exam.filter({ class_id })
        : Promise.resolve([]),
      base44.asServiceRole.entities.ExamCompletion.filter({ student_id }),
      base44.asServiceRole.entities.Task.filter({ student_id }),
      base44.asServiceRole.entities.DisciplineEvent.filter({ student_id }),
      base44.asServiceRole.entities.PerformanceReview.filter({ student_id })
    ]);

    // Calculate attendance metrics (month-over-month)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

    const validAttendance = attendanceRecords.filter(r => r.date && !isNaN(new Date(r.date).getTime()));
    const recentAttendance = validAttendance.filter(r => new Date(r.date) >= thirtyDaysAgo);
    const priorAttendance = validAttendance.filter(r => {
      const d = new Date(r.date);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    });

    const calcAttendanceStats = (records) => {
      const present = records.filter(r => r.status === 'נוכח' || r.status === 'נוכח/ת').length;
      const absent = records.filter(r => r.status === 'נעדר' || r.status === 'נעדר/ת').length;
      const late = records.filter(r => r.status === 'מאחר' || r.status === 'מאחר/ת').length;
      const total = records.length;
      return { present, absent, late, total, percentage: total > 0 ? (present / total * 100).toFixed(1) : 0 };
    };

    const recentStats = calcAttendanceStats(recentAttendance);
    const priorStats = calcAttendanceStats(priorAttendance);

    // Exam completion rate — exams relevant to this student
    const studentExams = (exams || []).filter(e => {
      return (examCompletions || []).some(ec => ec.exam_id === e.id && ec.student_id === student_id);
    });
    const examsCompleted = examCompletions.filter(ec => ec.student_id === student_id).length;
    const examCompletionRate = studentExams.length > 0 ? (examsCompleted / studentExams.length * 100).toFixed(1) : 0;

    // Task completion
    const completedTasks = tasks.filter(t => t.status === 'בוצע').length;
    const totalTasks = tasks.length;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;

    // Discipline events trend (open vs closed)
    const openDiscipline = disciplineEvents.filter(d => d.status === 'פתוח').length;
    const closedDiscipline = disciplineEvents.filter(d => d.status === 'סגור').length;
    const resolutionRate = (openDiscipline + closedDiscipline) > 0 ? (closedDiscipline / (openDiscipline + closedDiscipline) * 100).toFixed(1) : 0;

    // Performance participation (latest review)
    const latestReview = performanceReviews
      .filter(r => r.date && !isNaN(new Date(r.date).getTime()))
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const participationScore = latestReview?.participation || null;

    // Build growth indicators
    const indicators = [];

    // Attendance trend
    if (priorStats.total > 0) {
      const diff = recentStats.percentage - priorStats.percentage;
      indicators.push({
        category: 'נוכחות',
        current: `${recentStats.percentage}%`,
        trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
        change: diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`,
        details: `${recentStats.present} נוכח, ${recentStats.absent} נעדר, ${recentStats.late} מאחר`
      });
    }

    // Task completion trend
    if (totalTasks > 0) {
      indicators.push({
        category: 'משימות',
        current: `${completedTasks}/${totalTasks}`,
        rate: taskCompletionRate,
        details: `${taskCompletionRate}% משימות הושלמו`
      });
    }

    // Exam participation
    if (studentExams.length > 0) {
      indicators.push({
        category: 'מבחנים',
        current: `${examsCompleted}/${studentExams.length}`,
        rate: examCompletionRate,
        details: `השתתפות ב-${examCompletionRate}% מהמבחנים`
      });
    }

    // Discipline resolution
    if (openDiscipline + closedDiscipline > 0) {
      indicators.push({
        category: 'אירועים',
        current: `${closedDiscipline}/${openDiscipline + closedDiscipline}`,
        rate: resolutionRate,
        details: `${resolutionRate}% מהאירועים סגורים`,
        trend: closedDiscipline > 0 ? 'improving' : 'needs_attention'
      });
    }

    // Participation score
    if (participationScore) {
      indicators.push({
        category: 'השתתפות',
        score: participationScore,
        max: 5,
        details: `ניקוד השתתפות: ${participationScore}/5`
      });
    }

    return Response.json({
      student_id,
      indicators,
      summary: {
        recent_stats: recentStats,
        prior_stats: priorStats,
        completed_tasks: completedTasks,
        total_tasks: totalTasks,
        exams_completed: examsCompleted,
        discipline_resolution: resolutionRate,
        participation: participationScore
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});