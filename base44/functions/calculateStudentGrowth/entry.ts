import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';

function parseRoles(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return text.split(',').map(role => role.trim()).filter(Boolean);
}

function normalize(value) {
  return String(value || '').replace(/[׳״'"\s]/g, '').trim();
}

function recordAllowsStudent(record, student) {
  const roles = [...new Set([...parseRoles(record?.roles), record?.role].filter(Boolean))];
  if (roles.includes('system_admin') || roles.includes('admin')) return true;

  const scope = record?.scope || {};
  const classId = record?.homeroomClassId || scope.classId || scope.homeroomClassId || '';
  if (roles.includes('homeroom_teacher') && classId && student.class_id === classId) return true;

  const grade = normalize(record?.gradeId || scope.gradeId);
  if ((roles.includes('grade_coordinator') || roles.includes('coordinator'))
      && grade && normalize(student.grade) === grade) return true;

  const division = record?.divisionType || scope.divisionType;
  const divisionGrades = division === 'upper' ? ['י', 'יא', 'יב'] : division === 'middle' ? ['ז', 'ח', 'ט'] : [];
  return roles.includes('division_manager') && divisionGrades.includes(normalize(student.grade));
}

async function canAccessStudent(base44, user, student) {
  const email = String(user?.email || '').trim().toLowerCase();
  if (!email || !student) return false;
  if (String(student.user_email || '').trim().toLowerCase() === email
      || String(student.email || '').trim().toLowerCase() === email) return true;

  const approved = await base44.asServiceRole.entities.ApprovedUser.filter({ email }, '-updated_date', 20).catch(() => []);
  return approved.some(record => record?.isActive !== false && recordAllowsStudent(record, student));
}

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

    // Resolve the target before authorizing so scoped staff are checked against
    // the student's verified class/grade rather than editable request fields.
    const studentRows = await base44.asServiceRole.entities.Student.filter({ id: student_id }).catch(() => []);
    const student = studentRows?.[0];
    if (!student) {
      return Response.json({ indicators: [], summary: {} });
    }
    if (!await canAccessStudent(base44, user, student)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
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

    // Exam completion rate — exams relevant to this student
    const studentExams = exams || [];
    const relevantExamIds = new Set(studentExams.map(exam => exam.id));
    const completedExamIds = new Set((examCompletions || [])
      .filter(completion => completion.student_id === student_id && relevantExamIds.has(completion.exam_id))
      .map(completion => completion.exam_id));
    const examsCompleted = completedExamIds.size;
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
      const diff = Number(recentStats.percentage) - Number(priorStats.percentage);
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
    console.error('Function error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});
