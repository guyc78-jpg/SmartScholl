import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Server-side authorization for FamilySensitiveInfo — the most sensitive entity.
// All role/scope decisions are resolved from server sources of truth
// (ApprovedUser + Student + ClassRoom), never from client-supplied claims.

const normalize = (value = '') => String(value || '').replace(/[׳״'"\s]/g, '').trim();
const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();

function parseRoles(value) {
  if (Array.isArray(value)) return value;
  const text = String(value || '').trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try { const parsed = JSON.parse(text); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return text.split(',').map(item => item.trim()).filter(Boolean);
}

// Resolve the user's effective roles + scope strictly from ApprovedUser.
async function resolveAuthorization(base44, user) {
  const email = normalizeEmail(user?.email);
  const isBuiltinAdmin = user?.role === 'admin' || user?.role === 'system_admin';
  const records = email ? await base44.asServiceRole.entities.ApprovedUser.filter({ email }).catch(() => []) : [];
  const active = records.filter(record => record.isActive !== false);

  const roles = new Set();
  if (isBuiltinAdmin) roles.add('admin');
  active.flatMap(record => [record.role, ...parseRoles(record.roles)]).filter(Boolean)
    .forEach(role => roles.add(role === 'system_admin' ? 'admin' : role === 'grade_coordinator' ? 'coordinator' : role));

  // Merge scope from approved records
  const primary = active[0] || {};
  const scope = primary.scope || {};
  return {
    roles,
    isAdmin: roles.has('admin'),
    homeroomClassId: primary.homeroomClassId || scope.homeroomClassId || '',
    gradeId: primary.gradeId || scope.gradeId || '',
    divisionType: primary.divisionType || scope.divisionType || '',
  };
}

function divisionGrades(divisionType) {
  if (divisionType === 'upper') return ['י', 'יא', 'יב'];
  if (divisionType === 'middle') return ['ז', 'ח', 'ט'];
  return [];
}

// Can this authorized staff member access this specific student's sensitive info?
async function canAccessStudent(base44, auth, student) {
  if (!student) return false;
  if (auth.isAdmin) return true;

  if (auth.roles.has('homeroom_teacher')) {
    if (auth.homeroomClassId && student.class_id === auth.homeroomClassId) return true;
  }

  // Coordinator — same grade
  if (auth.roles.has('coordinator')) {
    if (auth.gradeId && normalize(student.grade) === normalize(auth.gradeId)) return true;
  }

  // Division manager — student's grade in their division
  if (auth.roles.has('division_manager')) {
    if (divisionGrades(auth.divisionType).map(normalize).includes(normalize(student.grade))) return true;
  }

  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'get';
    const studentId = body?.student_id;
    if (!studentId) return Response.json({ error: 'student_id required' }, { status: 400 });

    const auth = await resolveAuthorization(base44, user);
    if (!auth.roles.size) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Students may never access this entity at all.
    if (auth.roles.has('student') && !auth.isAdmin && auth.roles.size === 1) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const studentRows = await base44.asServiceRole.entities.Student.filter({ id: studentId }).catch(() => []);
    const student = studentRows?.[0];
    if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

    if (!await canAccessStudent(base44, auth, student)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = (await base44.asServiceRole.entities.FamilySensitiveInfo.filter({ student_id: studentId }).catch(() => []))[0] || null;

    if (action === 'get') {
      return Response.json({ record: existing });
    }

    if (action === 'save') {
      const payload = {
        student_id: studentId,
        student_name: body.student_name || student.full_name || '',
        no_sensitive_info: Boolean(body.no_sensitive_info),
        statuses: body.no_sensitive_info ? [] : (Array.isArray(body.statuses) ? body.statuses : []),
        note: body.no_sensitive_info ? '' : String(body.note || '').slice(0, 150),
      };
      const record = existing?.id
        ? await base44.asServiceRole.entities.FamilySensitiveInfo.update(existing.id, payload)
        : await base44.asServiceRole.entities.FamilySensitiveInfo.create(payload);
      return Response.json({ record });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});