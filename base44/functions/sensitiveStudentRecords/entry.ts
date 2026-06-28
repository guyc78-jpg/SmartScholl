import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SUPPORTED = new Set(['Communication', 'DisciplineEvent']);
const STAFF_ROLES = ['homeroom_teacher', 'grade_coordinator', 'coordinator', 'division_manager', 'system_admin', 'admin'];

function normalize(value = '') {
  return String(value || '').replace(/[׳״'"\s]/g, '').trim();
}
function normalizeEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}
function parseRoles(value) {
  if (Array.isArray(value)) return value;
  const text = String(value || '').trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try { const parsed = JSON.parse(text); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return text.split(',').map(item => item.trim()).filter(Boolean);
}
function divisionGrades(value) {
  if (value === 'upper') return ['י', 'יא', 'יב'];
  if (value === 'middle') return ['ז', 'ח', 'ט'];
  return [];
}

async function getClaims(base44, user) {
  const email = normalizeEmail(user.email);
  const records = await base44.asServiceRole.entities.ApprovedUser.filter({ email }).catch(() => []);
  const active = records.filter(record => record.isActive !== false);
  const roles = new Set();
  if (user.role === 'admin' || user.role === 'system_admin') roles.add('system_admin');
  for (const record of active) {
    [record.role, ...parseRoles(record.roles)].filter(Boolean).forEach(role => roles.add(role));
  }
  const primary = active[0] || {};
  const scope = primary.scope || {};
  return {
    authorized: roles.size > 0,
    roles,
    email,
    fullName: primary.fullName || user.full_name || email,
    homeroomClassId: primary.homeroomClassId || scope.homeroomClassId || scope.classId || '',
    gradeId: normalize(primary.gradeId || scope.gradeId || ''),
    divisionType: primary.divisionType || scope.divisionType || '',
  };
}

function canViewStudent(claims, student) {
  if (!claims?.authorized || !student) return false;
  if (claims.roles.has('system_admin') || claims.roles.has('admin')) return true;
  if (claims.roles.has('homeroom_teacher') && claims.homeroomClassId && student.class_id === claims.homeroomClassId) return true;
  if ((claims.roles.has('grade_coordinator') || claims.roles.has('coordinator')) && claims.gradeId && normalize(student.grade) === claims.gradeId) return true;
  if (claims.roles.has('division_manager') && divisionGrades(claims.divisionType).map(normalize).includes(normalize(student.grade))) return true;
  return false;
}
function canEdit(claims) {
  return STAFF_ROLES.some(role => claims.roles.has(role));
}
function sortByDateDesc(list) {
  return [...(list || [])].sort((a, b) => String(b.date || b.created_date || '').localeCompare(String(a.date || a.created_date || '')));
}
function sanitizeRecord(entity, body, student, existing = {}) {
  if (entity === 'Communication') {
    return {
      student_id: student.id,
      student_name: body.student_name || student.full_name || student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      class_id: student.class_id || '',
      date: body.date || existing.date || new Date().toISOString().split('T')[0],
      type: body.type || existing.type || 'שיחה טלפונית',
      with_whom: body.with_whom || existing.with_whom || 'הורה 1',
      summary: String(body.summary || existing.summary || '').trim(),
      follow_up: body.follow_up || '',
      follow_up_date: body.follow_up_date || '',
    };
  }
  if (entity === 'DisciplineEvent') {
    return {
      student_id: student.id,
      student_name: body.student_name || student.full_name || student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      class_id: student.class_id || '',
      date: body.date || existing.date || new Date().toISOString().split('T')[0],
      time: body.time || '',
      severity: body.severity || existing.severity || 'קלה',
      category: body.category || existing.category || 'התנהגות',
      description: String(body.description || existing.description || '').trim(),
      treatment: body.treatment || '',
      parents_updated: Boolean(body.parents_updated),
      follow_up_date: body.follow_up_date || '',
      status: body.status || existing.status || 'פתוח',
    };
  }
  return {};
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';
    const entity = body.entity;
    if (!SUPPORTED.has(entity)) return Response.json({ error: 'Unsupported entity' }, { status: 400 });

    const claims = await getClaims(base44, user);
    if (!claims.authorized || !canEdit(claims)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const students = await base44.asServiceRole.entities.Student.list('-updated_date', 2000).catch(() => []);
    const scopedStudents = students.filter(student => canViewStudent(claims, student));
    const scopedStudentIds = new Set(scopedStudents.map(student => student.id));
    const requestedClassId = String(body.class_id || '').trim();

    if (action === 'list') {
      const visibleStudents = requestedClassId ? scopedStudents.filter(student => student.class_id === requestedClassId) : scopedStudents;
      const visibleIds = new Set(visibleStudents.map(student => student.id));
      const classIds = [...new Set(visibleStudents.map(student => student.class_id).filter(Boolean))];
      const recordsByClass = await Promise.all(classIds.map(classId => base44.asServiceRole.entities[entity].filter({ class_id: classId }).catch(() => [])));
      const records = sortByDateDesc(recordsByClass.flat().filter(record => visibleIds.has(record.student_id)));
      return Response.json({ records, students: visibleStudents });
    }

    if (action === 'listForStudent') {
      const studentId = String(body.student_id || '').trim();
      if (!scopedStudentIds.has(studentId)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const records = await base44.asServiceRole.entities[entity].filter({ student_id: studentId }).catch(() => []);
      return Response.json({ records: sortByDateDesc(records) });
    }

    if (action === 'save') {
      const student = scopedStudents.find(item => item.id === body.student_id);
      if (!student) return Response.json({ error: 'Forbidden' }, { status: 403 });
      let existing = null;
      if (body.id) {
        const rows = await base44.asServiceRole.entities[entity].filter({ id: body.id }).catch(() => []);
        existing = rows[0] || null;
        if (!existing || !scopedStudentIds.has(existing.student_id)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const data = sanitizeRecord(entity, body, student, existing || {});
      if ((entity === 'Communication' && !data.summary) || (entity === 'DisciplineEvent' && !data.description)) {
        return Response.json({ error: 'Missing required content' }, { status: 400 });
      }
      const record = existing
        ? await base44.asServiceRole.entities[entity].update(existing.id, data)
        : await base44.asServiceRole.entities[entity].create(data);
      return Response.json({ record });
    }

    if (action === 'updateStatus') {
      const rows = await base44.asServiceRole.entities[entity].filter({ id: body.id }).catch(() => []);
      const existing = rows[0] || null;
      if (!existing || !scopedStudentIds.has(existing.student_id)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const record = await base44.asServiceRole.entities[entity].update(existing.id, { status: body.status });
      return Response.json({ record });
    }

    if (action === 'delete') {
      const rows = await base44.asServiceRole.entities[entity].filter({ id: body.id }).catch(() => []);
      const existing = rows[0] || null;
      if (!existing || !scopedStudentIds.has(existing.student_id)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      await base44.asServiceRole.entities[entity].delete(existing.id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});