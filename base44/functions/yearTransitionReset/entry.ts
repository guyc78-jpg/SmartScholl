import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';

const TRANSITION_LEASE_MS = 15 * 60 * 1000;

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

async function safeList(base44, entityName, limit = 5000) {
  const rows = [];
  let skip = 0;
  const pageSize = Math.min(5000, Math.max(1, limit));
  while (true) {
    const page = await base44.asServiceRole.entities[entityName].list('-created_date', pageSize, skip);
    rows.push(...(page || []));
    if (!page || page.length < pageSize) break;
    skip += page.length;
  }
  return rows;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function transitionConflict(message) {
  const error = new Error(message);
  error.status = 409;
  return error;
}

async function acquireTransitionLock(base44, classes, jobKey, options, actorEmail) {
  const anchor = [...classes].sort((a, b) => String(a.id).localeCompare(String(b.id)))[0];
  if (!anchor) throw transitionConflict('At least one classroom is required for a year transition');
  const now = new Date();
  const heartbeat = new Date(anchor.year_transition_heartbeat_at || 0).getTime();
  const activeLease = Boolean(anchor.year_transition_lock_id)
    && Number.isFinite(heartbeat)
    && now.getTime() - heartbeat < TRANSITION_LEASE_MS;

  if (anchor.year_transition_phase === 'completed' && anchor.year_transition_job_key === jobKey) {
    return { completed: true, anchorId: anchor.id };
  }
  if (activeLease) throw transitionConflict('A year transition is already running');
  if (anchor.year_transition_job_key && anchor.year_transition_job_key !== jobKey
      && anchor.year_transition_phase !== 'completed') {
    throw transitionConflict('A previous year transition must be resumed before starting another one');
  }
  if (anchor.year_transition_job_key === jobKey && anchor.year_transition_options
      && anchor.year_transition_options !== options) {
    throw transitionConflict('Resume the transition with the same options used by the original run');
  }

  const token = crypto.randomUUID();
  const claimed = await base44.asServiceRole.entities.ClassRoom.updateMany(
    { id: anchor.id, updated_date: anchor.updated_date },
    { $set: {
      year_transition_lock_id: token,
      year_transition_job_key: jobKey,
      year_transition_phase: 'running',
      year_transition_heartbeat_at: now.toISOString(),
      year_transition_options: options,
      year_transition_checkpoint: JSON.stringify({ phase: 'running', actorEmail }),
      year_transition_error: '',
      year_transition_completed_at: '',
    } },
  );
  if (claimed?.updated !== 1) throw transitionConflict('The year transition state changed; reload and try again');
  return { completed: false, anchorId: anchor.id, token, jobKey, base44 };
}

async function checkpointTransition(context, phase, checkpoint = {}) {
  const updated = await context.base44.asServiceRole.entities.ClassRoom.updateMany(
    { id: context.anchorId, year_transition_lock_id: context.token, year_transition_job_key: context.jobKey },
    { $set: {
      year_transition_phase: phase,
      year_transition_heartbeat_at: new Date().toISOString(),
      year_transition_checkpoint: JSON.stringify({ phase, ...checkpoint }).slice(0, 5000),
    } },
  );
  if (updated?.updated !== 1) throw transitionConflict('Year transition lease was lost');
}

async function completeTransition(context, checkpoint) {
  const completedAt = new Date().toISOString();
  const updated = await context.base44.asServiceRole.entities.ClassRoom.updateMany(
    { id: context.anchorId, year_transition_lock_id: context.token, year_transition_job_key: context.jobKey },
    { $set: {
      year_transition_lock_id: '',
      year_transition_phase: 'completed',
      year_transition_heartbeat_at: completedAt,
      year_transition_completed_at: completedAt,
      year_transition_checkpoint: JSON.stringify({ phase: 'completed', ...checkpoint }).slice(0, 5000),
      year_transition_error: '',
    } },
  );
  if (updated?.updated !== 1) throw transitionConflict('Year transition lease was lost before completion');
}

async function failTransition(context, error) {
  if (!context?.token) return;
  await context.base44.asServiceRole.entities.ClassRoom.updateMany(
    { id: context.anchorId, year_transition_lock_id: context.token, year_transition_job_key: context.jobKey },
    { $set: {
      year_transition_lock_id: '',
      year_transition_phase: 'failed',
      year_transition_heartbeat_at: new Date().toISOString(),
      year_transition_error: String(error?.message || 'Transition failed').replace(/\s+/g, ' ').slice(0, 500),
    } },
  ).catch(() => {});
}

function emptyDeletionCounts() {
  return Object.fromEntries(OPERATIONAL_ENTITIES.map((entityName) => [entityName, true]));
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

async function deleteOperationalData(base44, onCheckpoint = async () => {}) {
  const deletedCounts = {};
  for (const entityName of OPERATIONAL_ENTITIES) {
    const records = await safeList(base44, entityName, 5000);
    let deleted = 0;
    for (let index = 0; index < records.length; index += 20) {
      const batch = records.slice(index, index + 20);
      await Promise.all(batch.map(record => base44.asServiceRole.entities[entityName].delete(record.id)));
      deleted += batch.length;
      if (index % 400 === 0) await onCheckpoint({ entityName, deleted, deletedCounts });
      if (index + 20 < records.length) await sleep(150);
    }
    await sleep(120);
    deletedCounts[entityName] = deleted;
    await onCheckpoint({ entityName, deleted, deletedCounts });
  }
  return deletedCounts;
}

Deno.serve(async (req) => {
  let transitionFailureContext = null;
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
    const newSchoolYear = String(body.newSchoolYear || '').trim();
    const transitionKey = newSchoolYear;

    const [students, classes] = await Promise.all([
      safeList(base44, 'Student', 5000),
      safeList(base44, 'ClassRoom', 5000)
    ]);
    const pendingStudents = students.filter(student => student.last_year_transition !== transitionKey);
    const preview = buildPreview({ students: pendingStudents, classes, moveTeachers });

    if (mode === 'preview') return Response.json({
      ...preview,
      alreadyTransitionedStudents: students.length - pendingStudents.length,
      deletionCounts: emptyDeletionCounts(),
      operationalEntities: OPERATIONAL_ENTITIES,
    });

    if (!newSchoolYear) {
      return Response.json({ error: 'נדרשת שנת לימודים חדשה' }, { status: 400 });
    }

    if (body.confirmationText !== 'איפוס שנת לימודים' || body.confirmed !== true) {
      return Response.json({ error: 'נדרש אישור כפול לפני ביצוע האיפוס' }, { status: 400 });
    }
    if (preview.hasBlockingMissingTargets) {
      return Response.json({ error: 'יש תלמידים ללא כיתת יעד. יש ליצור/לתקן כיתות יעד לפני ביצוע המעבר.' }, { status: 400 });
    }

    const transitionOptions = stableStringify({ moveTeachers, graduateTwelfth, teacherOverrides });
    if (newSchoolYear.length > 40 || transitionOptions.length > 20_000) {
      return Response.json({ error: 'Invalid year transition options' }, { status: 400 });
    }
    const transitionLock = await acquireTransitionLock(base44, classes, transitionKey, transitionOptions, user.email);
    if (transitionLock.completed) {
      return Response.json({ success: true, alreadyCompleted: true, updatedStudents: 0, graduatedStudents: 0, updatedClasses: 0, updatedTeachers: 0, deletedCounts: {} });
    }
    transitionFailureContext = transitionLock;
    await checkpointTransition(transitionLock, 'students', { pendingStudents: pendingStudents.length });

    const classMappings = preview.classMappings;
    const mappingByClassId = new Map(classMappings.map((item) => [item.sourceClassId, item]));
    const classesById = new Map(classes.map((item) => [item.id, item]));
    let updatedStudents = 0;
    let graduatedStudents = 0;

    for (const [studentIndex, student] of pendingStudents.entries()) {
      if (studentIndex % 50 === 0) {
        await checkpointTransition(transitionLock, 'students', { studentIndex, updatedStudents, graduatedStudents });
      }
      if (student.status === 'סיים') continue;
      const mapping = mappingByClassId.get(student.class_id);
      if (!mapping) continue;
      if (mapping.isGraduation) {
        if (!graduateTwelfth) continue;
        await base44.asServiceRole.entities.Student.update(student.id, {
          status: 'סיים',
          last_year_transition: transitionKey,
        });
        if (student.user_email) {
          const studentUsers = await base44.asServiceRole.entities.User.filter({ email: student.user_email }, '-created_date', 10);
          for (const studentUser of studentUsers) await base44.asServiceRole.entities.User.update(studentUser.id, {
            profile_class: 'בוגרים',
            profile_class_id: '',
            authorization_class_id: '',
            authorization_grade: '',
          });
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
        status: 'פעיל',
        last_year_transition: transitionKey,
      });
      if (student.user_email) {
        const studentUsers = await base44.asServiceRole.entities.User.filter({ email: student.user_email }, '-created_date', 10);
        for (const studentUser of studentUsers) await base44.asServiceRole.entities.User.update(studentUser.id, {
          profile_class_id: targetClass.id,
          profile_class: targetClass.name,
          profile_grade_managed: classGrade(targetClass.name, targetClass.grade),
          authorization_class_id: targetClass.id,
          authorization_grade: classGrade(targetClass.name, targetClass.grade),
        });
      }
      updatedStudents += 1;
    }

    let updatedClasses = 0;
    if (newSchoolYear) {
      await checkpointTransition(transitionLock, 'classes', { updatedStudents, graduatedStudents });
      for (const [classIndex, klass] of classes.entries()) {
        if (classIndex % 25 === 0) await checkpointTransition(transitionLock, 'classes', { classIndex, updatedClasses });
        if (klass.last_year_transition === transitionKey) continue;
        await base44.asServiceRole.entities.ClassRoom.update(klass.id, {
          year: newSchoolYear,
          last_year_transition: transitionKey,
        });
        updatedClasses += 1;
      }
    }

    let updatedTeachers = 0;
    if (moveTeachers) {
      await checkpointTransition(transitionLock, 'teachers', { teacherCount: preview.teacherMappings.length });
      for (const [teacherIndex, item] of preview.teacherMappings.entries()) {
        if (teacherIndex % 20 === 0) await checkpointTransition(transitionLock, 'teachers', { teacherIndex, updatedTeachers });
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

    await checkpointTransition(transitionLock, 'deleting', { updatedStudents, graduatedStudents, updatedClasses, updatedTeachers });
    const deletedCounts = await deleteOperationalData(base44, checkpoint =>
      checkpointTransition(transitionLock, 'deleting', { updatedStudents, graduatedStudents, updatedClasses, updatedTeachers, ...checkpoint })
    );
    await completeTransition(transitionLock, { updatedStudents, graduatedStudents, updatedClasses, updatedTeachers, deletedCounts });
    transitionFailureContext = null;
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
    }).catch(error => console.error('Year transition audit log failed:', error));

    return Response.json({ success: true, updatedStudents, graduatedStudents, updatedClasses, updatedTeachers, deletedCounts });
  } catch (error) {
    if (transitionFailureContext) await failTransition(transitionFailureContext, error);
    console.error('Function error:', error);
    const status = Number(error?.status);
    if (status >= 400 && status < 500) return Response.json({ error: error.message }, { status });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});
