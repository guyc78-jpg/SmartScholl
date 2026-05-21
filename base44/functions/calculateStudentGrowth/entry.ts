import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // Fetch all relevant data for the student
    const [
      attendanceRecords,
      exams,
      examCompletions,
      tasks,
      disciplineEvents,
      performanceReviews
    ] = await Promise.all([
      base44.entities.AttendanceRecord.filter({ student_id }),
      base44.entities.Exam.list(),
      base44.entities.ExamCompletion.filter({ student_id }),
      base44.entities.Task.filter({ student_id }),
      base44.entities.DisciplineEvent.filter({ student_id }),
      base44.entities.PerformanceReview.filter({ student_id })
    ]);

    // Calculate attendance metrics (month-over-month)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentAttendance = attendanceRecords.filter(r => new Date(r.date) >= thirtyDaysAgo);
    const priorAttendance = attendanceRecords.filter(r => {
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

    // Exam completion rate
    const studentExams = exams.filter(e => {
      const completions = examCompletions.filter(ec => ec.exam_id === e.id);
      return completions.some(ec => ec.student_id === student_id);
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
    const latestReview = performanceReviews.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
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