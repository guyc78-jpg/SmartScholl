import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Server-side authorization for TreatmentCase — sensitive student treatment files.
// Roles + scope resolved strictly from ApprovedUser / Student (never client claims).

const STAFF_ROLES = ['homeroom_teacher', 'grade_coordinator', 'coordinator', 'division_manager', 'system_admin', 'admin'];

function normalize(value = '') {
  return String(value || '').replace(/[׳״'"\s]/g, '').trim();
}
function normalizeEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

function allowedDivisionGrades(claims) {
  const division = claims?.scope?.divisionType || claims?.profile_division;
  if (division === 'upper') return ['י', 'יא', 'יב'];
  if (division === 'middle') return ['ז', 'ח', 'ט'];
  return [];
}

async function getClaims(base44, user) {
  const email = normalizeEmail(user.email);
  const approved = await base44.asServiceRole.entities.ApprovedUser.filter({ email }).catch(() => []);
  const record = approved[0];
  if (record && record.isActive !== false) {
    const scope = record.role === 'grade_coordinator'
      ? { ...(record.scope || {}), homeroomClassId: record.homeroomClassId || record.scope?.homeroomClassId || '' }
      : (record.scope || {});
    return {
      authorized: true,
      role: record.role,
      email,
      fullName: record.fullName,
      scope,
      profile_class_id: record.role === 'homeroom_teacher' ? scope.classId || '' : '',
      profile_grade_managed: record.role === 'grade_coordinator' ? normalize(scope.gradeId || '') : '',
      profile_division: record.role === 'division_manager' ? scope.divisionType || '' : '',
    };
  }

  if (user.role === 'admin' || user.role === 'system_admin') {
    return { authorized: true, role: 'system_admin', email, fullName: user.full_name || email, scope: {} };
  }

  return { authorized: false, role: '', email };
}

async function loadStudent(base44, studentId) {
  const rows = await base44.asServiceRole.entities.Student.filter({ id: studentId }).catch(() => []);
  return rows[0] || null;
}

function canViewStudent(claims, student) {
  if (!claims?.authorized || !student) return false;
  const role = claims.role;
  if (role === 'system_admin' || role === 'admin') return true;
  if (role === 'homeroom_teacher') return student.class_id === claims.scope?.classId || student.class_id === claims.profile_class_id;
  if (role === 'grade_coordinator' || role === 'coordinator') return normalize(student.grade) === normalize(claims.scope?.gradeId || claims.profile_grade_managed);
  if (role === 'division_manager') return allowedDivisionGrades(claims).includes(normalize(student.grade));
  return false;
}

function canEdit(claims) {
  return STAFF_ROLES.includes(claims.role) && claims.role !== 'student';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';
    const claims = await getClaims(base44, user);
    if (!claims.authorized || !canEdit(claims)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const actor = { fullName: claims.fullName || user.full_name || user.email, email: claims.email || user.email };

    // List all treatment cases the user is authorized to see (scoped by student).
    if (action === 'list') {
      const all = await base44.asServiceRole.entities.TreatmentCase.list('-created_date', 1000).catch(() => []);
      const students = await base44.asServiceRole.entities.Student.list('-updated_date', 2000).catch(() => []);
      const studentsById = new Map((students || []).map(s => [s.id, s]));
      const cases = (all || []).filter(c => canViewStudent(claims, studentsById.get(c.student_id)));
      return Response.json({ cases });
    }

    async function authorizeCase(caseId) {
      const rows = await base44.asServiceRole.entities.TreatmentCase.filter({ id: caseId }).catch(() => []);
      const current = rows[0];
      if (!current) return { error: 'Not found', status: 404 };
      const student = await loadStudent(base44, current.student_id);
      if (!canViewStudent(claims, student)) return { error: 'Forbidden', status: 403 };
      return { current };
    }

    if (action === 'updateStatus') {
      const auth = await authorizeCase(body.case_id);
      if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
      const data = { status: body.status };
      if (body.status === 'נסגר') data.closed_at = new Date().toISOString();
      const saved = await base44.asServiceRole.entities.TreatmentCase.update(body.case_id, data);
      return Response.json({ record: saved });
    }

    if (action === 'addNote') {
      const auth = await authorizeCase(body.case_id);
      if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
      const content = String(body.content || '').trim();
      if (!content) return Response.json({ error: 'Empty note' }, { status: 400 });
      const notes = [...(auth.current.notes || []), {
        author_email: actor.email,
        author_name: actor.fullName,
        content,
        timestamp: new Date().toISOString(),
      }];
      const saved = await base44.asServiceRole.entities.TreatmentCase.update(body.case_id, { notes });
      return Response.json({ record: saved });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});