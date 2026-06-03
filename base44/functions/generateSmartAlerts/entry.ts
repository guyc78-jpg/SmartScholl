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

function getScopedStudents(students, user, role) {
  if (role === 'admin') return students;
  if (role === 'student') return students.filter(student => student.user_email === user?.email || student.email === user?.email || student.created_by_id === user?.id);
  if (role === 'homeroom_teacher') {
    const classId = normalize(user?.profile_class_id);
    const className = normalize(user?.profile_homeroom_class || user?.profile_class);
    return students.filter(student => (!!classId && normalize(student.class_id) === classId) || (!!className && normalize(student.class_name) === className));
  }
  if (role === 'coordinator') {
    const grade = normalize(user?.profile_grade_managed || user?.profile_grade);
    return students.filter(student => !!grade && getStudentGrade(student) === grade);
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

    const [allStudents, attendance, exams, tasks, incidents] = await Promise.all([
      base44.asServiceRole.entities.Student.list(),
      base44.asServiceRole.entities.AttendanceRecord.list(),
      base44.asServiceRole.entities.Exam.list(),
      base44.asServiceRole.entities.Task.filter({ status: 'לביצוע' }),
      base44.asServiceRole.entities.DisciplineEvent.filter({ status: 'פתוח' }),
    ]);

    const students = getScopedStudents(allStudents || [], user, role);
    const scopedStudentIds = new Set(students.map(student => student.id));
    const attByStudent = groupBy((attendance || []).filter(record => scopedStudentIds.has(record.student_id)), 'student_id');
    const tasksByStudent = groupBy((tasks || []).filter(record => scopedStudentIds.has(record.student_id)), 'student_id');
    const incidentsByStudent = groupBy((incidents || []).filter(record => scopedStudentIds.has(record.student_id)), 'student_id');
    const alerts = [];

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

      const relevantExamItems = (exams || []).map(exam => ({ exam, audience: isExamRelevantToStudent(exam, student) })).filter(item => item.audience);
      const upcomingExamItems = relevantExamItems.filter(({ exam }) => {
        const daysUntil = (new Date(exam.date) - today) / (1000 * 60 * 60 * 24);
        return daysUntil >= 0 && daysUntil <= 2;
      });
      if (upcomingExamItems.length > 0) {
        const { exam, audience } = upcomingExamItems[0];
        alerts.push({
          student_id: student.id,
          student_name: student.full_name,
          class_id: student.class_id,
          alert_type: 'upcoming_exam',
          severity: 'medium',
          message: `מבחן קרוב: ${exam.title} - ${exam.subject} ב-${exam.date}`,
          details: { source_info: sourceInfo('Exam', student, { exam_id: exam.id, exam_title: exam.title, exam_subject: exam.subject, exam_date: exam.date, class_or_group: audience.values.join(', '), audience_type: audience.label }) },
          is_active: true,
        });
      }

      const threeDaysExamItems = relevantExamItems.filter(({ exam }) => {
        const daysUntil = (new Date(exam.date) - today) / (1000 * 60 * 60 * 24);
        return daysUntil >= 0 && daysUntil <= 3;
      });
      if (threeDaysExamItems.length >= 3) {
        alerts.push({
          student_id: student.id,
          student_name: student.full_name,
          class_id: student.class_id,
          alert_type: 'exam_overload',
          severity: 'critical',
          message: `עומס מבחנים: ${threeDaysExamItems.length} מבחנים ב-3 ימים הקרובים`,
          details: {
            exam_count: threeDaysExamItems.length,
            exams: threeDaysExamItems.map(({ exam }) => ({ id: exam.id, title: exam.title, subject: exam.subject, date: exam.date })),
            source_info: sourceInfo('Exam', student, { exam_ids: threeDaysExamItems.map(({ exam }) => exam.id), exam_titles: threeDaysExamItems.map(({ exam }) => exam.title) }),
          },
          is_active: true,
        });
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