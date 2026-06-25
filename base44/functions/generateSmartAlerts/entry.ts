import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const EXAM_ALERT_TYPES = new Set(['מבחן', 'בחן', 'בגרות', 'מתכונת', 'מועד ב׳']);

function groupBy(records, keyField) {
  const map = new Map();
  for (const record of records || []) {
    const key = record?.[keyField];
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(record);
  }
  return map;
}

function normalize(value = '') {
  return String(value || '').replace(/[׳״'"\s]/g, '').trim().toLowerCase();
}

function toList(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (!value) return [];
  const text = String(value).trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return text.split(',').map(item => item.trim()).filter(Boolean);
}

function firstPresent(...values) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== '') || '';
}

function getUserRoles(user) {
  const roles = new Set([user?.role].filter(Boolean));
  toList(user?.approved_roles).forEach(role => roles.add(role));
  toList(user?.available_roles).forEach(role => roles.add(role));
  toList(user?.profile_roles).forEach(role => roles.add(role));
  toList(user?.roles).forEach(role => roles.add(role));
  if (user?.profile_role) roles.add(user.profile_role);
  return [...roles];
}

function getRequestedRole(user, payloadRole) {
  const roles = getUserRoles(user);
  if (payloadRole && (roles.includes(payloadRole) || roles.includes('admin'))) return payloadRole;
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('coordinator')) return 'coordinator';
  if (roles.includes('homeroom_teacher')) return 'homeroom_teacher';
  if (roles.includes('student')) return 'student';
  return user?.role || 'user';
}

function getStudentGrade(student) {
  const grade = firstPresent(student?.grade, String(student?.class_name || '').replace(/\d+$/, ''));
  return normalize(grade);
}

function getStudentExactValues(student) {
  return new Set([
    student?.id,
    student?.class_id,
    student?.class_name,
    student?.grade,
    student?.major,
    student?.track,
    student?.magama,
    ...toList(student?.tags),
    ...toList(student?.subject_group_ids),
    ...toList(student?.subjectGroupIds),
    ...toList(student?.subject_groups),
    ...toList(student?.learning_group_ids),
    ...toList(student?.learningGroupIds),
    ...toList(student?.learning_groups),
    ...toList(student?.group_ids),
    ...toList(student?.groups),
  ].filter(Boolean).map(normalize));
}

function hasExactMatch(student, values) {
  if (!values?.length) return false;
  const studentValues = getStudentExactValues(student);
  return values.some(value => studentValues.has(normalize(value)));
}

function getExamAudienceSource(exam, student) {
  const classIds = toList(firstPresent(exam?.class_id, exam?.classId)).concat(toList(exam?.class_ids), toList(exam?.classIds));
  if (classIds.length && hasExactMatch(student, classIds)) return { type: 'classId', label: 'כיתה', values: classIds };

  const gradeIds = toList(firstPresent(exam?.grade_id, exam?.gradeId, exam?.grade, exam?.class_or_grade)).concat(toList(exam?.grade_ids), toList(exam?.gradeIds), toList(exam?.audience_grades));
  if (gradeIds.length && gradeIds.some(grade => normalize(grade) === getStudentGrade(student))) return { type: 'gradeId', label: 'שכבה', values: gradeIds };

  const subjectGroups = toList(firstPresent(exam?.subject_group_id, exam?.subjectGroupId)).concat(toList(exam?.subject_group_ids), toList(exam?.subjectGroupIds), toList(exam?.audience_subjects));
  if (subjectGroups.length && hasExactMatch(student, subjectGroups)) return { type: 'subjectGroupId', label: 'קבוצת מקצוע', values: subjectGroups };

  const tracks = toList(firstPresent(exam?.track_id, exam?.trackId, exam?.track, exam?.major, exam?.magama)).concat(toList(exam?.track_ids), toList(exam?.trackIds), toList(exam?.audience_tracks));
  if (tracks.length && hasExactMatch(student, tracks)) return { type: 'track', label: 'מגמה', values: tracks };

  const groups = toList(firstPresent(exam?.learning_group_id, exam?.learningGroupId, exam?.group_id, exam?.groupId, exam?.audience_group_label)).concat(toList(exam?.learning_group_ids), toList(exam?.learningGroupIds), toList(exam?.group_ids), toList(exam?.groupIds), toList(exam?.audience_classes));
  if (groups.length && hasExactMatch(student, groups)) return { type: 'learningGroup', label: 'קבוצת לימוד', values: groups };

  return null;
}

function isExamRelevantToStudent(exam, student) {
  if (!EXAM_ALERT_TYPES.has(exam?.type)) return null;
  return getExamAudienceSource(exam, student);
}

async function getScopedStudents(base44, user, role) {
  if (role === 'admin') return await base44.asServiceRole.entities.Student.list('-updated_date', 1000);

  if (role === 'student') {
    const queries = [
      base44.asServiceRole.entities.Student.filter({ user_email: user?.email }, '-updated_date', 20),
      base44.asServiceRole.entities.Student.filter({ email: user?.email }, '-updated_date', 20),
      base44.asServiceRole.entities.Student.filter({ created_by_id: user?.id }, '-updated_date', 20),
    ];
    const results = await Promise.all(queries);
    return [...new Map(results.flat().filter(Boolean).map(student => [student.id, student])).values()];
  }

  if (role === 'homeroom_teacher') {
    if (user?.profile_class_id) return await base44.asServiceRole.entities.Student.filter({ class_id: user.profile_class_id }, '-updated_date', 200);
    const className = user?.profile_homeroom_class || user?.profile_class;
    if (className) return await base44.asServiceRole.entities.Student.filter({ class_name: className }, '-updated_date', 200);
    return [];
  }

  if (role === 'coordinator') {
    const grade = user?.profile_grade_managed || user?.profile_grade;
    if (!grade) return [];
    return await base44.asServiceRole.entities.Student.filter({ grade }, '-updated_date', 1000);
  }

  return [];
}

function sourceInfo(source, student, extra = {}) {
  return {
    source,
    class_or_group: student?.class_name || student?.class_id || '',
    related_student_ids: [student?.id].filter(Boolean),
    related_student_names: [student?.full_name].filter(Boolean),
    ...extra,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const role = getRequestedRole(user, payload?.role);
    if (!['admin', 'homeroom_teacher', 'coordinator', 'student'].includes(role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const nowIsrael = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
    const todayStr = nowIsrael.toISOString().split('T')[0];
    const today = new Date(todayStr);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const students = await getScopedStudents(base44, user, role);
    const scopedStudentIds = new Set(students.map(student => student.id));
    const scopedClassIds = new Set(students.map(s => s.class_id).filter(Boolean));
    const scopedGrades = new Set(students.map(s => normalize(s.grade || '')).filter(Boolean));

    const [attendance, exams, tasks, incidents] = await Promise.all([
      base44.asServiceRole.entities.AttendanceRecord.list('-date', 1000),
      base44.asServiceRole.entities.Exam.list('date', 500),
      base44.asServiceRole.entities.Task.filter({ status: 'לביצוע' }, 'due_date', 1000),
      base44.asServiceRole.entities.DisciplineEvent.filter({ status: 'פתוח' }, '-date', 1000),
    ]);

    const attByStudent = groupBy((attendance || []).filter(record => scopedStudentIds.has(record.student_id)), 'student_id');
    const tasksByStudent = groupBy((tasks || []).filter(record => scopedStudentIds.has(record.student_id)), 'student_id');
    const incidentsByStudent = groupBy((incidents || []).filter(record => scopedStudentIds.has(record.student_id)), 'student_id');
    const alerts = [];

    // ── 1. Exam alerts — class/grade level only, no student names ──────────────
    // An exam is relevant to the scoped scope when:
    //   a) its class_id is in scope, OR
    //   b) its audience_grades/grade_ids overlap with scoped grades, OR
    //   c) scope=school (admin) and exam has audience_scope='school'
    // When there IS a precise sub-group (subjectGroup/track/learningGroup), show the group label.
    // Never list individual student names or counts for exams.
    const seenExamIds = new Set();
    for (const exam of (exams || [])) {
      if (!EXAM_ALERT_TYPES.has(exam?.type)) continue;
      const daysUntil = (new Date(exam.date) - today) / (1000 * 60 * 60 * 24);
      if (daysUntil < 0 || daysUntil > 7) continue;
      if (seenExamIds.has(exam.id)) continue;

      // Check scope relevance
      const examClassIds = toList(firstPresent(exam?.class_id)).concat(toList(exam?.class_ids));
      const examGrades = toList(exam?.grade_id).concat(toList(exam?.grade_ids), toList(exam?.audience_grades));
      const examScope = exam?.audience_scope;

      const classMatch = examClassIds.some(id => scopedClassIds.has(id));
      const gradeMatch = examGrades.some(g => scopedGrades.has(normalize(g)));
      const schoolMatch = role === 'admin' && examScope === 'school';

      if (!classMatch && !gradeMatch && !schoolMatch) continue;
      seenExamIds.add(exam.id);

      // Determine group label if exam has precise sub-group targeting
      const subjectGroups = toList(exam?.subject_group_id).concat(toList(exam?.subject_group_ids), toList(exam?.audience_subjects));
      const tracks = toList(exam?.track_id).concat(toList(exam?.track_ids), toList(exam?.audience_tracks));
      const learningGroups = toList(exam?.learning_group_id).concat(toList(exam?.learning_group_ids));
      const groupLabel = exam?.audience_group_label ||
        (subjectGroups.length ? subjectGroups[0] : null) ||
        (tracks.length ? tracks[0] : null) ||
        (learningGroups.length ? learningGroups[0] : null) ||
        null;

      const scopeLabel = groupLabel
        ? `קבוצה: ${groupLabel}`
        : examGrades.length ? `שכבה ${examGrades.join(', ')}`
        : examClassIds.length ? `כיתה ${examClassIds.join(', ')}`
        : '';

      const daysText = daysUntil === 0 ? 'היום' : daysUntil === 1 ? 'מחר' : `בעוד ${Math.round(daysUntil)} ימים`;
      const subject = exam.subject ? ` ב${exam.subject}` : '';
      const message = `יש ${exam.type}${subject} קרוב: "${exam.title}" — ${daysText}`;
      const severity = daysUntil <= 1 ? 'high' : 'medium';

      // Use a placeholder student_id (empty) — this is a class-level alert
      alerts.push({
        student_id: '',
        student_name: '',
        class_id: examClassIds[0] || '',
        alert_type: 'upcoming_exam',
        severity,
        message,
        details: {
          source_info: {
            source: 'Exam',
            class_or_group: scopeLabel,
            exam_id: exam.id,
            exam_title: exam.title,
            exam_subject: exam.subject,
            exam_date: exam.date,
            audience_type: groupLabel ? 'קבוצה/מגמה' : gradeMatch ? 'שכבה' : 'כיתה',
          },
        },
        is_active: true,
      });
    }

    // ── 2. Per-student alerts (absences, lates, tasks, incidents) ───────────────
    for (const student of students) {
      const sAtt = attByStudent.get(student.id) || [];
      const weekAbsences = sAtt.filter(record => ['נעדר', 'נעדר/ת'].includes(record.status) && record.date >= weekStartStr && record.date <= weekEndStr);
      if (weekAbsences.length >= 3) {
        alerts.push({
          student_id: student.id,
          student_name: student.full_name,
          class_id: student.class_id,
          alert_type: 'high_absences',
          severity: 'high',
          message: `${student.full_name} היה נעדר ${weekAbsences.length} פעמים בשבוע הזה`,
          details: { absences: weekAbsences.length, source_info: sourceInfo('AttendanceRecord', student) },
          is_active: true,
        });
      }

      const lates = sAtt.filter(record => ['מאחר', 'מאחר/ת'].includes(record.status)).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
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
            details: { count: 2, source_info: sourceInfo('AttendanceRecord', student) },
            is_active: true,
          });
        }
      }

      const pendingTasks = (tasksByStudent.get(student.id) || []).filter(task => new Date(task.due_date) <= today);
      if (pendingTasks.length > 0) {
        alerts.push({
          student_id: student.id,
          student_name: student.full_name,
          class_id: student.class_id,
          alert_type: 'pending_task',
          severity: 'high',
          message: `${student.full_name} לא ביצע ${pendingTasks.length} משימות עד למועדן`,
          details: { task_count: pendingTasks.length, source_info: sourceInfo('Task', student) },
          is_active: true,
        });
      }

      const openIncidents = incidentsByStudent.get(student.id) || [];
      if (openIncidents.length > 0) {
        alerts.push({
          student_id: student.id,
          student_name: student.full_name,
          class_id: student.class_id,
          alert_type: 'open_incident',
          severity: 'high',
          message: `${student.full_name} יש ${openIncidents.length} אירוע חריג פתוח`,
          details: { incident_count: openIncidents.length, source_info: sourceInfo('DisciplineEvent', student) },
          is_active: true,
        });
      }
    }

    return Response.json({ alerts, count: alerts.length, role, scoped_students: students.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});