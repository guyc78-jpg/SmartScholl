import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const VALID_STAFF_ROLES = ['homeroom_teacher', 'grade_coordinator', 'division_manager', 'system_admin'];
const VALID_DIVISIONS = ['upper', 'middle'];

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeGrade(value = '') {
  return String(value).replace(/[׳״'"\s]/g, '').trim();
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
  if (role === 'grade_coordinator') return !!scope.gradeId;
  if (role === 'division_manager') return VALID_DIVISIONS.includes(scope.divisionType);
  if (role === 'system_admin') return true;
  return false;
}

function buildClaimsFromApprovedUser(record) {
  const scope = record.scope || {};
  const role = record.role;
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
    profile_grade_managed: role === 'grade_coordinator' ? normalizeGrade(scope.gradeId || '') : '',
    profile_division: role === 'division_manager' ? scope.divisionType || '' : '',
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

async function getAccess(base44, user) {
  const email = normalizeEmail(user.email);
  const approved = await base44.asServiceRole.entities.ApprovedUser.filter({ email });
  let approvedRecord = approved[0];

  if (!approvedRecord) {
    const firstAdmins = await base44.asServiceRole.entities.ApprovedUser.filter({ role: 'system_admin' });
    if (firstAdmins.length === 0 && user.role === 'admin') {
      approvedRecord = await base44.asServiceRole.entities.ApprovedUser.create({
        fullName: user.full_name || user.email,
        email,
        role: 'system_admin',
        scope: null,
        isActive: true,
      });
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

  if (approvedRecord) {
    if (approvedRecord.isActive === false || !validateScope(approvedRecord.role, approvedRecord.scope || {})) {
      await writeLog(base44, {
        eventType: 'login_blocked',
        actorEmail: email,
        targetEmail: email,
        targetName: approvedRecord.fullName,
        actionName: 'blocked_login',
        role: approvedRecord.role,
        details: 'ניסיון כניסה נחסם: משתמש לא פעיל או scope לא תקין',
        severity: 'warning',
      });
      return { allowed: false };
    }

    const claims = buildClaimsFromApprovedUser(approvedRecord);
    await writeLog(base44, {
      eventType: 'login_success',
      actorEmail: email,
      targetEmail: email,
      targetName: approvedRecord.fullName,
      actionName: 'login_success',
      role: approvedRecord.role,
      details: 'כניסה מוצלחת למערכת',
      metadata: { scope: claims.scope },
    });
    return { allowed: true, claims };
  }

  const studentsByUserEmail = await base44.asServiceRole.entities.Student.filter({ user_email: email });
  const studentsByEmail = studentsByUserEmail.length ? studentsByUserEmail : await base44.asServiceRole.entities.Student.filter({ email });
  const student = studentsByEmail[0];

  if (student) {
    const claims = buildClaimsFromStudent(student, email);
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

async function requireSystemAdmin(base44, user) {
  const access = await getAccess(base44, user);
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
      const access = await getAccess(base44, user);
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

    const isAdmin = await requireSystemAdmin(base44, user);
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
      if (!email || !record.fullName || !VALID_STAFF_ROLES.includes(role) || !validateScope(role, scope || {})) {
        return Response.json({ error: 'Invalid approved user details' }, { status: 400 });
      }

      const data = {
        fullName: String(record.fullName).trim(),
        email,
        role,
        scope,
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
      if (existing[0]) return Response.json({ error: 'משתמש עם מייל זה כבר קיים' }, { status: 400 });
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