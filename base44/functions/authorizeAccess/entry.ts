import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const VALID_STAFF_ROLES = ['homeroom_teacher', 'grade_coordinator', 'division_manager', 'system_admin'];
const VALID_DIVISIONS = ['upper', 'middle'];

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeGrade(value = '') {
  return String(value).replace(/[׳״'"\s]/g, '').trim();
}

function parseRoles(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return trimmed.split(',').map(role => role.trim());
}

function getRecordRoles(record) {
  const roles = [...parseRoles(record.roles), record.role].filter(role => VALID_STAFF_ROLES.includes(role));
  return [...new Set(roles)];
}

function getScopeForRole(record, role) {
  const scope = record.scope || {};
  if (role === 'homeroom_teacher') return { ...scope, classId: scope.classId || record.homeroomClassId || '' };
  if (role === 'grade_coordinator') return { ...scope, gradeId: scope.gradeId || record.gradeId || '', homeroomClassId: scope.homeroomClassId || record.homeroomClassId || '' };
  if (role === 'division_manager') return { ...scope, divisionType: scope.divisionType || record.divisionType || '' };
  return scope;
}

async function writeLog(base44, { eventType, actorEmail, targetEmail, targetName, actionName, role, details, metadata = {}, severity = 'info' }) {
  await base44.asServiceRole.entities.ActivityLog.create({
    event_type: eventType,
    actor_email: actorEmail || 'system',
    target_email: targetEmail || '',
    target_name: targetName || '',
    action_name: actionName || eventType,
    work_role: role || '',
    work_role_label: role || '',
    details: details || '',
    metadata: JSON.stringify({ ...metadata, timestamp: new Date().toISOString() }),
    severity,
  });
}

function validateScope(role, scope = {}) {
  if (role === 'homeroom_teacher') return !!scope.classId;
  if (role === 'grade_coordinator') return !!scope.gradeId && !!scope.homeroomClassId;
  if (role === 'division_manager') return VALID_DIVISIONS.includes(scope.divisionType);
  if (role === 'system_admin') return true;
  return false;
}

function buildClaimsFromApprovedUser(record, role = record.role, scope = getScopeForRole(record, role)) {
  return {
    authorized: true,
    source: 'approved_user',
    fullName: record.fullName,
    email: normalizeEmail(record.email),
    role,
    roles: [role],
    scope,
    isActive: record.isActive !== false,
    profile_full_name: record.fullName,
    profile_class_id: role === 'homeroom_teacher' ? scope.classId || '' : '',
    profile_homeroom_class_id: ['homeroom_teacher', 'grade_coordinator'].includes(role) ? scope.homeroomClassId || scope.classId || '' : '',
    homeroomClassId: ['homeroom_teacher', 'grade_coordinator'].includes(role) ? scope.homeroomClassId || scope.classId || '' : '',
    profile_grade_managed: role === 'grade_coordinator' ? normalizeGrade(scope.gradeId || '') : '',
    profile_division: role === 'division_manager' ? scope.divisionType || '' : '',
    profile_subject_area: record.teachingSubject || '',
    profile_subject: record.teachingSubject || '',
    profile_display_primary_role: record.primaryDisplayRole || '',
    onboarding_status: 'approved',
    onboardingCompleted: true,
  };
}

function buildClaimsFromStudent(student, email) {
  return {
    authorized: true,
    source: 'student',
    fullName: student.full_name || student.fullName || email,
    email,
    role: 'student',
    roles: ['student'],
    scope: null,
    isActive: true,
    student_id: student.id,
    profile_full_name: student.full_name || '',
    profile_class_id: student.class_id || '',
    profile_class: student.class_name || '',
    profile_homeroom_class: student.class_name || '',
    profile_grade_managed: normalizeGrade(student.grade || ''),
    onboarding_status: 'approved',
    onboardingCompleted: true,
  };
}

async function getAccess(base44, user, skipLog = false) {
  const email = normalizeEmail(user.email);
  let approvedRecords = await base44.asServiceRole.entities.ApprovedUser.filter({ email });

  if (!approvedRecords.length) {
    const firstAdmins = await base44.asServiceRole.entities.ApprovedUser.filter({ role: 'system_admin' });
    if (firstAdmins.length === 0 && user.role === 'admin') {
      const approvedRecord = await base44.asServiceRole.entities.ApprovedUser.create({
        fullName: user.full_name || user.email,
        email,
        role: 'system_admin',
        roles: ['system_admin'],
        primaryDisplayRole: 'system_admin',
        scope: null,
        homeroomClassId: '',
        gradeId: '',
        divisionType: '',
        teachingSubject: '',
        isActive: true,
      });
      approvedRecords = [approvedRecord];
      await writeLog(base44, {
        eventType: 'approved_user_created',
        actorEmail: email,
        targetEmail: email,
        targetName: approvedRecord.fullName,
        actionName: 'bootstrap_system_admin',
        role: 'system_admin',
        details: 'נוצר מנהל מערכת ראשי מתוך מנהל Base44 קיים',
        severity: 'warning',
      });
    }
  }

  if (approvedRecords.length) {
    const roleRecords = approvedRecords
      .filter(record => record.isActive !== false)
      .flatMap(record => getRecordRoles(record).map(role => ({ record, role, scope: getScopeForRole(record, role) })))
      .filter(item => validateScope(item.role, item.scope));

    if (!roleRecords.length) {
      await writeLog(base44, {
        eventType: 'login_blocked',
        actorEmail: email,
        targetEmail: email,
        targetName: approvedRecords[0]?.fullName || '',
        actionName: 'blocked_login',
        role: approvedRecords.flatMap(record => getRecordRoles(record)).join(','),
        details: 'ניסיון כניסה נחסם: אין תפקיד מאושר פעיל עם scope תקין',
        severity: 'warning',
      });
      return { allowed: false };
    }

    const priority = ['system_admin', 'division_manager', 'grade_coordinator', 'homeroom_teacher'];
    const allRoles = [...new Set(roleRecords.map(item => item.role))];
    const canUseMultipleRealRoles = allRoles.includes('system_admin');
    const primaryRole = priority.find(role => allRoles.includes(role)) || allRoles[0];
    const activeRoleRecords = canUseMultipleRealRoles
      ? roleRecords
      : roleRecords.filter(item => item.role === primaryRole).slice(0, 1);
    const roles = canUseMultipleRealRoles ? allRoles : [primaryRole];
    const primaryItem = activeRoleRecords.find(item => item.role === primaryRole) || activeRoleRecords[0];
    const homeroomItem = activeRoleRecords.find(item => item.role === 'homeroom_teacher');
    const coordinatorItem = activeRoleRecords.find(item => item.role === 'grade_coordinator');
    const divisionItem = activeRoleRecords.find(item => item.role === 'division_manager');
    const subjectItem = activeRoleRecords.find(item => item.record.teachingSubject);
    const scopesByRole = {};
    for (const item of activeRoleRecords) scopesByRole[item.role] = item.scope;

    const claims = {
      ...buildClaimsFromApprovedUser(primaryItem.record, primaryRole, primaryItem.scope),
      role: primaryRole,
      roles,
      scope: primaryItem.scope,
      scopes_by_role: scopesByRole,
      profile_class_id: homeroomItem?.scope?.classId || coordinatorItem?.scope?.homeroomClassId || '',
      profile_homeroom_class_id: homeroomItem?.scope?.classId || coordinatorItem?.scope?.homeroomClassId || '',
      homeroomClassId: homeroomItem?.scope?.classId || coordinatorItem?.scope?.homeroomClassId || '',
      profile_grade_managed: coordinatorItem ? normalizeGrade(coordinatorItem.scope?.gradeId || '') : '',
      profile_division: divisionItem?.scope?.divisionType || '',
      profile_subject_area: subjectItem?.record?.teachingSubject || '',
      profile_subject: subjectItem?.record?.teachingSubject || '',
      profile_display_primary_role: primaryRole,
      profile_display_additional_roles: [],
    };

    if (!skipLog) {
      await writeLog(base44, {
        eventType: 'login_success',
        actorEmail: email,
        targetEmail: email,
        targetName: primaryItem.record.fullName,
        actionName: 'login_success',
        role: primaryRole,
        details: 'כניסה מוצלחת למערכת',
        metadata: { roles, scopesByRole },
      });
    }
    return { allowed: true, claims };
  }

  const studentsByUserEmail = await base44.asServiceRole.entities.Student.filter({ user_email: email });
  const studentsByEmail = studentsByUserEmail.length ? studentsByUserEmail : await base44.asServiceRole.entities.Student.filter({ email });
  const student = studentsByEmail[0];

  if (student) {
    const claims = buildClaimsFromStudent(student, email);
    if (!skipLog) {
      await writeLog(base44, {
        eventType: 'login_success',
        actorEmail: email,
        targetEmail: email,
        targetName: claims.fullName,
        actionName: 'student_login_success',
        role: 'student',
        details: 'כניסת תלמיד מוצלחת',
        metadata: { student_id: student.id },
      });
    }
    return { allowed: true, claims };
  }

  await writeLog(base44, {
    eventType: 'login_blocked',
    actorEmail: email,
    targetEmail: email,
    actionName: 'blocked_login_unknown_email',
    details: 'המשתמש אינו מופיע בטבלאות המאושרות',
    severity: 'warning',
  });
  return { allowed: false };
}

async function requireSystemAdmin(base44, user, skipLog = false) {
  const access = await getAccess(base44, user, skipLog);
  return access.allowed && access.claims?.role === 'system_admin';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'getAccess';

    if (action === 'getAccess') {
      const access = await getAccess(base44, user);
      if (!access.allowed) {
        return Response.json({ error: 'המשתמש אינו מורשה להיכנס למערכת' }, { status: 403 });
      }
      return Response.json({ user: access.claims });
    }

    if (action === 'logUnauthorizedAccess') {
      const access = await getAccess(base44, user, true);
      await writeLog(base44, {
        eventType: 'unauthorized_access',
        actorEmail: normalizeEmail(user.email),
        targetEmail: normalizeEmail(user.email),
        targetName: access.claims?.fullName || user.full_name || '',
        actionName: body.attemptedAction || body.actionName || 'unauthorized_access',
        role: access.claims?.role || body.role || '',
        details: body.details || 'ניסיון גישה לא מורשה',
        metadata: { ...(body.metadata || {}), path: body.path || '' },
        severity: 'critical',
      });
      return Response.json({ success: true });
    }

    if (action === 'listHomeroomAssignments') {
      const access = await getAccess(base44, user, true);
      if (!access.allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const claims = access.claims;
      const roles = claims.roles || [claims.role];
      const isSystemAdmin = roles.includes('system_admin') || claims.role === 'system_admin';
      const isCoordinator = roles.includes('grade_coordinator') || roles.includes('coordinator') || claims.role === 'grade_coordinator' || claims.role === 'coordinator';
      const isHomeroomTeacher = roles.includes('homeroom_teacher') || claims.role === 'homeroom_teacher';
      const managedGrade = normalizeGrade(claims.profile_grade_managed || claims.scope?.gradeId || '');
      const homeroomClassId = claims.homeroomClassId || claims.profile_homeroom_class_id || '';
      const allClasses = (await base44.asServiceRole.entities.ClassRoom.list('grade', 500)).filter(item => item.is_active !== false);
      const visibleClasses = allClasses.filter(classRoom => {
        if (isSystemAdmin) return true;
        if (isCoordinator) return normalizeGrade(classRoom.grade) === managedGrade;
        if (isHomeroomTeacher) return classRoom.id === homeroomClassId;
        return false;
      });
      const approvedUsers = await base44.asServiceRole.entities.ApprovedUser.list('fullName', 500);
      const teachers = approvedUsers
        .filter(record => record.isActive !== false && getRecordRoles(record).includes('homeroom_teacher'))
        .map(record => ({ id: record.id, fullName: record.fullName, email: normalizeEmail(record.email), homeroomClassId: record.homeroomClassId || '' }));
      const teacherByEmail = new Map(teachers.map(teacher => [teacher.email, teacher]));
      const classes = visibleClasses.map(classRoom => {
        const teacher = teacherByEmail.get(normalizeEmail(classRoom.homeroom_teacher_email));
        return { ...classRoom, assigned_teacher_id: teacher?.id || '' };
      });
      return Response.json({ classes, teachers, canAssign: isSystemAdmin || isCoordinator });
    }

    if (action === 'assignHomeroomTeacher') {
      const access = await getAccess(base44, user, true);
      if (!access.allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const claims = access.claims;
      const roles = claims.roles || [claims.role];
      const isSystemAdmin = roles.includes('system_admin') || claims.role === 'system_admin';
      const isCoordinator = roles.includes('grade_coordinator') || roles.includes('coordinator') || claims.role === 'grade_coordinator' || claims.role === 'coordinator';
      if (!isSystemAdmin && !isCoordinator) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const targetClass = (await base44.asServiceRole.entities.ClassRoom.filter({ id: body.classId }))[0];
      if (!targetClass || targetClass.is_active === false) return Response.json({ error: 'Class not found' }, { status: 404 });
      const managedGrade = normalizeGrade(claims.profile_grade_managed || claims.scope?.gradeId || '');
      if (!isSystemAdmin && normalizeGrade(targetClass.grade) !== managedGrade) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const teacherId = String(body.teacherId || '').trim();
      const previousEmail = normalizeEmail(targetClass.homeroom_teacher_email);
      let teacher = null;
      if (teacherId) {
        teacher = (await base44.asServiceRole.entities.ApprovedUser.filter({ id: teacherId }))[0];
        if (!teacher || teacher.isActive === false || !getRecordRoles(teacher).includes('homeroom_teacher')) {
          return Response.json({ error: 'Teacher is not approved' }, { status: 400 });
        }
      }

      if (previousEmail) {
        const previousRecords = await base44.asServiceRole.entities.ApprovedUser.filter({ email: previousEmail });
        for (const record of previousRecords) {
          const scope = { ...(record.scope || {}) };
          if (scope.classId === targetClass.id) scope.classId = '';
          if (scope.homeroomClassId === targetClass.id) scope.homeroomClassId = '';
          await base44.asServiceRole.entities.ApprovedUser.update(record.id, {
            homeroomClassId: record.homeroomClassId === targetClass.id ? '' : record.homeroomClassId,
            scope,
          });
        }
      }

      if (teacher) {
        const teacherEmail = normalizeEmail(teacher.email);
        const previousClasses = await base44.asServiceRole.entities.ClassRoom.filter({ homeroom_teacher_email: teacherEmail });
        for (const classRoom of previousClasses.filter(item => item.id !== targetClass.id)) {
          await base44.asServiceRole.entities.ClassRoom.update(classRoom.id, { homeroom_teacher_email: '', homeroom_teacher_name: '' });
        }
        const scope = { ...(teacher.scope || {}), classId: targetClass.id, homeroomClassId: targetClass.id };
        await base44.asServiceRole.entities.ApprovedUser.update(teacher.id, { homeroomClassId: targetClass.id, scope });
      }

      const classPatch = {
        homeroom_teacher_email: teacher ? normalizeEmail(teacher.email) : '',
        homeroom_teacher_name: teacher ? teacher.fullName : '',
      };
      const savedClass = await base44.asServiceRole.entities.ClassRoom.update(targetClass.id, classPatch);
      await writeLog(base44, {
        eventType: 'permission_changed',
        actorEmail: normalizeEmail(user.email),
        targetEmail: teacher ? normalizeEmail(teacher.email) : previousEmail,
        targetName: teacher ? teacher.fullName : targetClass.name,
        actionName: 'homeroom_assignment_changed',
        role: claims.role,
        details: `שיוך מחנך/ת לכיתה ${targetClass.name} עודכן`,
        metadata: { classId: targetClass.id, className: targetClass.name, previousEmail, nextEmail: classPatch.homeroom_teacher_email },
        severity: 'warning',
      });
      return Response.json({ classRoom: savedClass, assignedTeacherEmail: classPatch.homeroom_teacher_email });
    }

    const isAdmin = await requireSystemAdmin(base44, user, true);
    if (!isAdmin) {
      await writeLog(base44, {
        eventType: 'unauthorized_access',
        actorEmail: normalizeEmail(user.email),
        targetEmail: normalizeEmail(user.email),
        actionName: action,
        details: 'ניסיון לבצע פעולת ניהול ללא הרשאה',
        severity: 'critical',
      });
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'listAuthorizedUsers') {
      const users = await base44.asServiceRole.entities.ApprovedUser.list('fullName', 500);
      return Response.json({ users });
    }

    if (action === 'saveAuthorizedUser') {
      const record = body.user || {};
      const email = normalizeEmail(record.email);
      const role = record.role;
      const scope = role === 'system_admin' ? null : (record.scope || {});
      const homeroomClassId = ['homeroom_teacher', 'grade_coordinator', 'system_admin'].includes(role) ? (record.homeroomClassId || scope?.homeroomClassId || scope?.classId || '') : '';
      const gradeId = record.gradeId || scope?.gradeId || '';
      const roles = role === 'system_admin'
        ? ['system_admin', ...(homeroomClassId ? ['homeroom_teacher'] : []), ...(gradeId && homeroomClassId ? ['grade_coordinator'] : [])]
        : [role];
      if (!email || !record.fullName || !VALID_STAFF_ROLES.includes(role) || !validateScope(role, scope || {})) {
        return Response.json({ error: 'Invalid approved user details' }, { status: 400 });
      }

      const data = {
        fullName: String(record.fullName).trim(),
        email,
        role,
        roles,
        primaryDisplayRole: role,
        scope: role === 'grade_coordinator' ? { ...scope, homeroomClassId } : scope,
        homeroomClassId: role === 'homeroom_teacher' ? scope?.classId || '' : homeroomClassId,
        gradeId: ['grade_coordinator', 'system_admin'].includes(role) ? gradeId : '',
        divisionType: role === 'division_manager' ? scope?.divisionType || '' : '',
        teachingSubject: record.teachingSubject || '',
        isActive: record.isActive !== false,
      };

      if (record.id) {
        const current = (await base44.asServiceRole.entities.ApprovedUser.filter({ id: record.id }))[0];
        if (current?.role === 'system_admin' && (data.role !== 'system_admin' || data.isActive === false)) {
          const admins = await base44.asServiceRole.entities.ApprovedUser.filter({ role: 'system_admin' });
          const activeAdmins = admins.filter(item => item.isActive !== false);
          if (activeAdmins.length <= 1) {
            return Response.json({ error: 'לא ניתן להשבית או להוריד הרשאה למנהל המערכת האחרון הפעיל' }, { status: 400 });
          }
        }
        const saved = await base44.asServiceRole.entities.ApprovedUser.update(record.id, data);
        await writeLog(base44, {
          eventType: 'permission_changed',
          actorEmail: user.email,
          targetEmail: email,
          targetName: data.fullName,
          actionName: 'permission_changed',
          role,
          details: 'הרשאת משתמש עודכנה',
          metadata: { scope },
          severity: 'warning',
        });
        return Response.json({ user: saved });
      }

      const existing = await base44.asServiceRole.entities.ApprovedUser.filter({ email });
      if (existing.some(item => item.role === role || parseRoles(item.roles).includes(role))) return Response.json({ error: 'למשתמש כבר קיימת הרשאה לתפקיד זה' }, { status: 400 });
      const created = await base44.asServiceRole.entities.ApprovedUser.create(data);
      await writeLog(base44, {
        eventType: 'approved_user_created',
        actorEmail: user.email,
        targetEmail: email,
        targetName: data.fullName,
        actionName: 'approved_user_created',
        role,
        details: 'נוצר משתמש מאושר חדש',
        metadata: { scope },
        severity: 'warning',
      });
      return Response.json({ user: created });
    }

    if (action === 'deleteAuthorizedUser') {
      const id = body.id;
      const target = (await base44.asServiceRole.entities.ApprovedUser.filter({ id }))[0];
      if (!target) return Response.json({ error: 'Not found' }, { status: 404 });
      if (target.role === 'system_admin') {
        const admins = await base44.asServiceRole.entities.ApprovedUser.filter({ role: 'system_admin' });
        const activeAdmins = admins.filter(item => item.isActive !== false);
        if (activeAdmins.length <= 1) {
          return Response.json({ error: 'לא ניתן למחוק את מנהל המערכת האחרון הפעיל' }, { status: 400 });
        }
      }
      await base44.asServiceRole.entities.ApprovedUser.delete(id);
      await writeLog(base44, {
        eventType: 'approved_user_deleted',
        actorEmail: user.email,
        targetEmail: target.email,
        targetName: target.fullName,
        actionName: 'approved_user_deleted',
        role: target.role,
        details: 'משתמש מאושר נמחק',
        severity: 'critical',
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});