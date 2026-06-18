import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const GRADES = ['ז', 'ח', 'ט', 'י', 'יא', 'יב'];
const OPERATIONAL_ENTITIES = [
  'AttendanceRecord',
  'DisciplineEvent',
  'Communication',
  'TeacherNote',
  'Task',
  'Announcement',
  'AnnouncementRead',
  'Exam',
  'ExamCompletion',
  'ExamGradeReport',
  'PerformanceReview',
  'SmartAlert',
  'ScheduledConversation',
  'PushNotificationQueue',
  'UrgentFlag',
  'CommunityServiceReport',
  'ScheduleSlot'
];

const normalize = (value) => String(value || '').replace(/[׳'״"\s-]/g, '').trim();
const classNumber = (value) => (normalize(value).match(/\d+$/) || [''])[0];
const classGrade = (className, fallback) => {
  const clean = normalize(className || fallback || '');
  if (clean.startsWith('יב')) return 'יב';
  if (clean.startsWith('יא')) return 'יא';
  return GRADES.find((grade) => clean.startsWith(grade)) || fallback || '';
};
const nextGrade = (grade) => GRADES[GRADES.indexOf(grade) + 1] || null;
const displayGrade = (grade) => grade === 'יא' ? 'י״א' : grade === 'יב' ? 'י״ב' : grade;
const displayClass = (grade, number) => `${displayGrade(grade)}${number || ''}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const parseRoles = (source) => {
  if (Array.isArray(source)) return source;
  const value = String(source || '').trim();
  if (!value) return [];
  if (value.startsWith('[')) {
    try {
      const json = JSON.parse(value);
      return Array.isArray(json) ? json : [];
    } catch (_) {
      return [];
    }
  }
  return value.split(',').map((role) => role.trim());
};
const rolesOf = (user) => [...new Set([...parseRoles(user?.authorization?.roles || user?.roles), user?.authorization?.role, user?.role].filter(Boolean))];

async function hasSystemAdminAccess(base44, user) {
  if (rolesOf(user).includes('system_admin')) return true;
  const email = normalizeEmail(user?.email);
  if (!email) return false;
  const approvedUsers = await base44.asServiceRole.entities.ApprovedUser.filter({ email }, '-created_date', 20);
  return approvedUsers.some((record) => record.isActive !== false && (record.role === 'system_admin' || parseRoles(record.roles).includes('system_admin')));
}

async function safeList(base44, entityName, limit = 1000) {
  try {
    return await base44.asServiceRole.entities[entityName].list('-created_date', limit);
  } catch (_) {
    return [];
  }
}

function emptyDeletionCounts() {
  return Object.fromEntries(OPERATIONAL_ENTITIES.map((entityName) => [entityName, 'יחושב בביצוע']));
}

function buildPreview({ students, classes, moveTeachers }) {
  const activeClasses = classes.filter((item) => item.is_active !== false);
  const classById = new Map(activeClasses.map((item) => [item.id, item]));
  const targetByKey = new Map();
  activeClasses.forEach((item) => {
    const grade = classGrade(item.name, item.grade);
    const number = classNumber(item.name);
    targetByKey.set(`${grade}:${number}`, item);
  });

  const classMappings = activeClasses.map((source) => {
    const grade = classGrade(source.name, source.grade);
    const number = classNumber(source.name);
    const toGrade = nextGrade(grade);
    const target = toGrade ? targetByKey.get(`${toGrade}:${number}`) : null;
    return {
      sourceClassId: source.id,
      sourceClassName: source.name || displayClass(grade, number),
      sourceGrade: grade,
      targetClassId: target?.id || null,
      targetClassName: target?.name || (toGrade ? displayClass(toGrade, number) : 'בוגרים / ארכיון'),
      targetGrade: toGrade || 'בוגרים',
      missingTarget: Boolean(toGrade && !target),
      isGraduation: !toGrade,
      studentCount: 0,
      teacherName: source.homeroom_teacher_name || '',
      teacherEmail: source.homeroom_teacher_email || '',
      targetTeacherName: target?.homeroom_teacher_name || '',
      targetTeacherEmail: target?.homeroom_teacher_email || ''
    };
  });

  const mappingByClassId = new Map(classMappings.map((item) => [item.sourceClassId, item]));
  let studentsToUpdate = 0;
  let graduatingStudents = 0;
  let studentsMissingTarget = 0;

  students.forEach((student) => {
    if (student.status === 'סיים') return;
    const sourceClass = classById.get(student.class_id);
    const mapping = mappingByClassId.get(student.class_id) || classMappings.find((item) => item.sourceGrade === classGrade(student.class_name, student.grade) && classNumber(item.sourceClassName) === classNumber(student.class_name));
    if (mapping) mapping.studentCount += 1;
    if (!mapping) return;
    if (mapping.isGraduation) graduatingStudents += 1;
    else if (mapping.targetClassId) studentsToUpdate += 1;
    else studentsMissingTarget += 1;
  });

  const teacherMappings = moveTeachers ? classMappings
    .filter((item) => !item.isGraduation && item.targetClassId && (item.teacherName || item.teacherEmail))
    .map((item) => ({
      sourceClassId: item.sourceClassId,
      sourceClassName: item.sourceClassName,
      targetClassId: item.targetClassId,
      targetClassName: item.targetClassName,
      teacherName: item.teacherName,
      teacherEmail: item.teacherEmail,
      targetTeacherName: item.targetTeacherName,
      targetTeacherEmail: item.targetTeacherEmail,
      hasExistingTargetTeacher: Boolean(item.targetTeacherName || item.targetTeacherEmail)
    })) : [];

  return {
    classMappings,
    teacherMappings,
    totals: {
      studentsToUpdate,
      graduatingStudents,
      studentsMissingTarget,
      classesToUpdate: classMappings.filter((item) => item.studentCount > 0).length,
      teachersToUpdate: teacherMappings.length
    },
    hasBlockingMissingTargets: studentsMissingTarget > 0
  };
}

async function deleteOperationalData(base44) {
  const deletedCounts = {};
  for (const entityName of OPERATIONAL_ENTITIES) {
    const records = await safeList(base44, entityName, 1000);
    let deleted = 0;
    for (const record of records) {
      await base44.asServiceRole.entities[entityName].delete(record.id);
      deleted += 1;
      if (deleted % 20 === 0) await sleep(250);
    }
    await sleep(120);
    deletedCounts[entityName] = deleted;
  }
  return deletedCounts;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isSystemAdmin = await hasSystemAdminAccess(base44, user);
    if (!isSystemAdmin) return Response.json({ error: 'הפעולה זמינה רק למנהל/ת מערכת ראשי/ת' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === 'execute' ? 'execute' : 'preview';
    const moveTeachers = Boolean(body.moveTeachers);
    const graduateTwelfth = body.graduateTwelfth !== false;
    const teacherOverrides = body.teacherOverrides || {};

    const [students, classes] = await Promise.all([
      safeList(base44, 'Student', 1000),
      safeList(base44, 'ClassRoom', 1000)
    ]);
    const preview = buildPreview({ students, classes, moveTeachers });

    if (mode === 'preview') return Response.json({ ...preview, deletionCounts: emptyDeletionCounts(), operationalEntities: OPERATIONAL_ENTITIES });

    if (body.confirmationText !== 'איפוס שנת לימודים' || body.confirmed !== true) {
      return Response.json({ error: 'נדרש אישור כפול לפני ביצוע האיפוס' }, { status: 400 });
    }
    if (preview.hasBlockingMissingTargets) {
      return Response.json({ error: 'יש תלמידים ללא כיתת יעד. יש ליצור/לתקן כיתות יעד לפני ביצוע המעבר.' }, { status: 400 });
    }

    const classMappings = preview.classMappings;
    const mappingByClassId = new Map(classMappings.map((item) => [item.sourceClassId, item]));
    const classesById = new Map(classes.map((item) => [item.id, item]));
    let updatedStudents = 0;
    let graduatedStudents = 0;

    for (const student of students) {
      if (student.status === 'סיים') continue;
      const mapping = mappingByClassId.get(student.class_id);
      if (!mapping) continue;
      if (mapping.isGraduation) {
        if (!graduateTwelfth) continue;
        await base44.asServiceRole.entities.Student.update(student.id, { status: 'סיים' });
        if (student.user_email) {
          const studentUsers = await base44.asServiceRole.entities.User.filter({ email: student.user_email }, '-created_date', 10);
          for (const studentUser of studentUsers) await base44.asServiceRole.entities.User.update(studentUser.id, { profile_class: 'בוגרים', profile_class_id: '' });
        }
        graduatedStudents += 1;
        continue;
      }
      const targetClass = classesById.get(mapping.targetClassId);
      if (!targetClass) continue;
      await base44.asServiceRole.entities.Student.update(student.id, {
        class_id: targetClass.id,
        class_name: targetClass.name,
        grade: classGrade(targetClass.name, targetClass.grade),
        status: 'פעיל'
      });
      if (student.user_email) {
        const studentUsers = await base44.asServiceRole.entities.User.filter({ email: student.user_email }, '-created_date', 10);
        for (const studentUser of studentUsers) await base44.asServiceRole.entities.User.update(studentUser.id, { profile_class_id: targetClass.id, profile_class: targetClass.name });
      }
      updatedStudents += 1;
    }

    let updatedClasses = 0;
    if (body.newSchoolYear) {
      for (const klass of classes) {
        await base44.asServiceRole.entities.ClassRoom.update(klass.id, { year: body.newSchoolYear });
        updatedClasses += 1;
      }
    }

    let updatedTeachers = 0;
    if (moveTeachers) {
      for (const item of preview.teacherMappings) {
        const override = teacherOverrides[item.targetClassId] || {};
        const teacherName = override.teacherName ?? item.teacherName;
        const teacherEmail = override.teacherEmail ?? item.teacherEmail;
        await base44.asServiceRole.entities.ClassRoom.update(item.targetClassId, {
          homeroom_teacher_name: teacherName,
          homeroom_teacher_email: teacherEmail
        });
        updatedTeachers += 1;

        const approvedUsers = teacherEmail ? await base44.asServiceRole.entities.ApprovedUser.filter({ email: teacherEmail }, '-created_date', 10) : [];
        for (const approved of approvedUsers) {
          await base44.asServiceRole.entities.ApprovedUser.update(approved.id, {
            homeroomClassId: item.targetClassId,
            scope: { ...(approved.scope || {}), homeroomClassId: item.targetClassId }
          });
        }
        const users = teacherEmail ? await base44.asServiceRole.entities.User.filter({ email: teacherEmail }, '-created_date', 10) : [];
        for (const appUser of users) {
          await base44.asServiceRole.entities.User.update(appUser.id, {
            profile_class_id: item.targetClassId,
            profile_homeroom_class_id: item.targetClassId,
            profile_class: item.targetClassName,
            profile_homeroom_class: item.targetClassName,
            profile_homeroom_teacher: teacherName
          });
        }
      }
    }

    const deletedCounts = await deleteOperationalData(base44);
    await base44.asServiceRole.entities.ActivityLog.create({
      event_type: 'user_action',
      actor_email: user.email,
      target_email: user.email,
      target_name: user.full_name || user.profile_full_name || user.email,
      action_name: 'מעבר שנת לימודים ואיפוס נתונים',
      work_role: 'system_admin',
      work_role_label: 'מנהל/ת מערכת',
      severity: 'critical',
      details: `בוצע איפוס שנת לימודים: ${updatedStudents} תלמידים עודכנו, ${graduatedStudents} סומנו כבוגרים, ${updatedClasses} כיתות עודכנו, ${updatedTeachers} מחנכים עודכנו.`,
      metadata: JSON.stringify({
        previousSchoolYear: body.previousSchoolYear || '',
        newSchoolYear: body.newSchoolYear || '',
        updatedStudents,
        graduatedStudents,
        updatedClasses,
        updatedTeachers,
        deletedCounts
      })
    });

    return Response.json({ success: true, updatedStudents, graduatedStudents, updatedClasses, updatedTeachers, deletedCounts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});