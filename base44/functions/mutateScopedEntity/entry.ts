import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';

const MUTABLE_ENTITIES = new Set([
  'Announcement', 'AnnouncementRead', 'AttendanceRecord', 'Communication',
  'CommunityServiceReport', 'DisciplineEvent', 'Exam', 'ExamCompletion',
  'ExamGradeReport', 'FamilySensitiveInfo', 'ParentContact', 'PerformanceReview',
  'ScheduleSlot', 'ScheduledConversation', 'SmartAlert', 'Student', 'Task',
  'TeacherNote', 'TreatmentCase', 'UrgentFlag',
]);
const OPERATIONS = new Set(['create', 'update', 'delete', 'bulkCreate', 'bulkUpdate']);
const ADMIN_ONLY_DELETE = new Set([
  'AnnouncementRead', 'CommunityServiceReport', 'Exam', 'ExamCompletion',
  'ExamGradeReport', 'Student',
]);
const STUDENT_OPERATIONS = {
  AnnouncementRead: new Set(['create', 'update']),
  CommunityServiceReport: new Set(['create', 'update']),
  ExamCompletion: new Set(['create', 'update']),
  ExamGradeReport: new Set(['create', 'update']),
};
const STAFF_ROLES = new Set([
  'division_manager', 'grade_coordinator', 'coordinator', 'homeroom_teacher',
]);
const REPORT_REVIEW_ENTITIES = new Set(['CommunityServiceReport', 'ExamGradeReport']);
const IDEMPOTENT_CREATE_KEYS = {
  AnnouncementRead: ['announcement_id', 'student_id'],
  ExamCompletion: ['exam_id', 'student_id'],
  ExamGradeReport: ['exam_id', 'student_id'],
};
const BUILT_IN_FIELDS = new Set([
  'id', 'created_date', 'updated_date', 'created_by', 'created_by_id', 'app_id',
]);
const UPPER_GRADES = new Set(['\u05d9', '\u05d9\u05d0', '\u05d9\u05d1']);
const MIDDLE_GRADES = new Set(['\u05d6', '\u05d7', '\u05d8']);
const STUDENT_REPORT = '\u05d3\u05d9\u05d5\u05d5\u05d7 \u05ea\u05dc\u05de\u05d9\u05d3';
const NEEDS_CORRECTION = '\u05d3\u05d5\u05e8\u05e9 \u05ea\u05d9\u05e7\u05d5\u05df';
const PENDING_APPROVAL = '\u05de\u05de\u05ea\u05d9\u05df \u05dc\u05d0\u05d9\u05e9\u05d5\u05e8';
const PERSONAL_ANNOUNCEMENT = '\u05d0\u05d9\u05e9\u05d9\u05ea';
const PARENT_ANNOUNCEMENT = '\u05dc\u05d4\u05d5\u05e8\u05d9\u05dd';
const GRADUATED = '\u05e1\u05d9\u05d9\u05dd';
const COMPLETION_STATUSES = new Set(['not_started', 'in_progress', 'ready', 'not_relevant', 'done']);

function parseRoles(value) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try { const parsed = JSON.parse(text); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; }
  }
  return text.split(',').map(role => role.trim()).filter(Boolean);
}

function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase();
}

function normalizeGrade(value = '') {
  return String(value).replace(/[\u05f3\u05f4'"\s]/g, '').trim();
}

function cleanPayload(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const clean = {};
  for (const [key, fieldValue] of Object.entries(source)) {
    if (BUILT_IN_FIELDS.has(key) || ['__proto__', 'prototype', 'constructor'].includes(key)) continue;
    clean[key] = fieldValue;
  }
  return clean;
}

class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function fail(message, status = 400) {
  throw new HttpError(message, status);
}

async function getById(entity, id) {
  if (!id || typeof id !== 'string') return null;
  const rows = await entity.filter({ id }, '-updated_date', 2);
  return rows?.[0] || null;
}

function studentName(student) {
  return String(student?.full_name || student?.fullName || [
    student?.firstName || student?.first_name,
    student?.lastName || student?.last_name,
  ].filter(Boolean).join(' ') || '').trim();
}

async function loadCaller(base44, user) {
  const email = normalizeEmail(user.email);
  const roles = new Set();
  const classIds = new Set();
  const grades = new Set();
  const divisions = new Set();

  const approved = email
    ? await base44.asServiceRole.entities.ApprovedUser.filter({ email }, '-created_date', 100)
    : [];
  for (const record of approved.filter(item => item.isActive !== false)) {
    const recordRoles = [record.role, ...parseRoles(record.roles)].filter(Boolean);
    recordRoles.forEach(role => roles.add(role));
    const scope = record.scope || {};
    const classId = record.homeroomClassId || scope.classId || scope.homeroomClassId || '';
    const grade = normalizeGrade(record.gradeId || scope.gradeId || '');
    const division = record.divisionType || scope.divisionType || '';
    if (classId) classIds.add(classId);
    if (grade) grades.add(grade);
    if (division) divisions.add(division);
  }

  if (user.authorization_active === true || user.role === 'admin') {
    [user.role, ...parseRoles(user.roles), ...parseRoles(user.available_roles)]
      .filter(Boolean)
      .forEach(role => roles.add(role));
    if (user.authorization_class_id) classIds.add(user.authorization_class_id);
    if (user.authorization_grade) grades.add(normalizeGrade(user.authorization_grade));
    if (user.authorization_division) divisions.add(user.authorization_division);
  }

  let ownStudent = null;
  if (user.authorization_student_id) {
    ownStudent = await getById(base44.asServiceRole.entities.Student, user.authorization_student_id);
  }
  if (!ownStudent && email) {
    const byUserEmail = await base44.asServiceRole.entities.Student.filter({ user_email: email }, '-updated_date', 10);
    const byEmail = byUserEmail.length
      ? byUserEmail
      : await base44.asServiceRole.entities.Student.filter({ email }, '-updated_date', 10);
    ownStudent = byEmail.find(student => student.status !== GRADUATED) || null;
  }
  if (ownStudent?.status === GRADUATED) ownStudent = null;
  if (ownStudent && ownStudent.status !== GRADUATED) {
    roles.add('student');
    if (ownStudent.class_id) classIds.add(ownStudent.class_id);
    if (ownStudent.grade) grades.add(normalizeGrade(ownStudent.grade));
  } else roles.delete('student');

  const isAdmin = user.is_service === true
    || user.role === 'admin'
    || roles.has('admin')
    || roles.has('system_admin');
  if (!isAdmin && roles.size === 0) fail('Forbidden', 403);
  return {
    id: user.id,
    email,
    name: String(user.full_name || user.profile_full_name || email),
    roles,
    classIds,
    grades,
    divisions,
    ownStudent,
    isAdmin,
  };
}

function createContext(base44) {
  const classCache = new Map();
  const studentCache = new Map();
  const recordCache = new Map();
  return {
    base44,
    classCache,
    studentCache,
    recordCache,
    async classByReference(reference) {
      const key = String(reference || '').trim();
      if (!key) return null;
      if (classCache.has(key)) return classCache.get(key);
      let rows = await base44.asServiceRole.entities.ClassRoom.filter({ id: key }, '-updated_date', 2);
      if (!rows.length) rows = await base44.asServiceRole.entities.ClassRoom.filter({ name: key }, '-updated_date', 20);
      const found = rows.find(item => item.id === key || normalizeGrade(item.name) === normalizeGrade(key)) || rows[0] || null;
      classCache.set(key, found);
      if (found?.id) classCache.set(found.id, found);
      return found;
    },
    async studentById(id) {
      if (!id) return null;
      if (!studentCache.has(id)) {
        studentCache.set(id, await getById(base44.asServiceRole.entities.Student, id));
      }
      return studentCache.get(id);
    },
    async recordById(entityName, id) {
      const key = `${entityName}:${id}`;
      if (!recordCache.has(key)) {
        recordCache.set(key, await getById(base44.asServiceRole.entities[entityName], id));
      }
      return recordCache.get(key);
    },
  };
}

async function bindCanonicalScope(entityName, data, context) {
  const record = { ...data };
  let student = null;
  let classReference = record.class_id || '';

  if (entityName !== 'Student' && record.student_id) {
    student = await context.studentById(record.student_id);
    if (!student?.class_id) fail('Student not found or has no class', 404);
    if (classReference && classReference !== student.class_id) {
      fail('student_id does not belong to class_id', 403);
    }
    classReference = student.class_id;
  }

  const classRoom = await context.classByReference(classReference);
  if (!classRoom?.id || !normalizeGrade(classRoom.grade)) fail('Class scope could not be verified', 400);
  const canonicalGrade = normalizeGrade(classRoom.grade);
  if (record.grade && normalizeGrade(record.grade) !== canonicalGrade) {
    fail('grade does not match class_id', 403);
  }
  if (student && student.class_id !== classRoom.id) fail('Student/class mismatch', 403);

  record.class_id = classRoom.id;
  record.grade = canonicalGrade;
  if (student) record.student_name = studentName(student) || record.student_name || '';
  if (entityName === 'Announcement' && record.target_student_id) {
    const targetStudent = await context.studentById(record.target_student_id);
    if (!targetStudent || targetStudent.class_id !== classRoom.id) {
      fail('target_student_id does not belong to class_id', 403);
    }
  }
  return { record, student, classRoom };
}

async function collectScope(record, context) {
  const classReferences = new Set([
    record.class_id,
    ...(Array.isArray(record.class_ids) ? record.class_ids : []),
    ...(Array.isArray(record.audience_classes) ? record.audience_classes : []),
  ].filter(Boolean));
  const classIds = new Set();
  const grades = new Set([
    record.grade,
    record.grade_id,
    ...(Array.isArray(record.grade_ids) ? record.grade_ids : []),
    ...(Array.isArray(record.audience_grades) ? record.audience_grades : []),
  ].map(normalizeGrade).filter(Boolean));

  for (const reference of classReferences) {
    const classRoom = await context.classByReference(reference);
    if (!classRoom?.id) fail('Referenced class was not found', 400);
    classIds.add(classRoom.id);
    const grade = normalizeGrade(classRoom.grade);
    if (grade) grades.add(grade);
  }
  return { classIds, grades };
}

function divisionAllows(divisions, grade) {
  return (divisions.has('upper') && UPPER_GRADES.has(grade))
    || (divisions.has('middle') && MIDDLE_GRADES.has(grade));
}

async function staffAllows(caller, entityName, operation, record, context) {
  const { classIds, grades } = await collectScope(record, context);
  if (!classIds.size || !grades.size) return false;

  if (caller.roles.has('homeroom_teacher')) {
    const classAllowed = [...classIds].every(id => caller.classIds.has(id));
    const allowedClassGrades = new Set();
    for (const id of caller.classIds) {
      const classRoom = await context.classByReference(id);
      if (classRoom?.grade) allowedClassGrades.add(normalizeGrade(classRoom.grade));
    }
    if (classAllowed && [...grades].every(grade => allowedClassGrades.has(grade))) {
      if (entityName !== 'FamilySensitiveInfo'
          || operation === 'create'
          || normalizeEmail(record.owner_email) === caller.email) return true;
    }
  }

  if (caller.roles.has('grade_coordinator') || caller.roles.has('coordinator')) {
    if ([...grades].every(grade => caller.grades.has(grade))) return true;
  }

  if (caller.roles.has('division_manager') && !REPORT_REVIEW_ENTITIES.has(entityName)) {
    if ([...grades].every(grade => divisionAllows(caller.divisions, grade))) return true;
  }
  return false;
}

async function examVisibleToStudent(exam, student) {
  const studentGrade = normalizeGrade(student.grade);
  const classIds = new Set([
    exam.class_id,
    ...(Array.isArray(exam.class_ids) ? exam.class_ids : []),
    ...(Array.isArray(exam.audience_classes) ? exam.audience_classes : []),
  ].filter(Boolean));
  const grades = new Set([
    exam.grade,
    exam.grade_id,
    ...(Array.isArray(exam.grade_ids) ? exam.grade_ids : []),
    ...(Array.isArray(exam.audience_grades) ? exam.audience_grades : []),
  ].map(normalizeGrade).filter(Boolean));
  return exam.audience_scope === 'school'
    || classIds.has(student.class_id)
    || grades.has(studentGrade);
}

async function validateRelatedReferences(entityName, record, context) {
  if (entityName === 'AnnouncementRead') {
    const student = await context.studentById(record.student_id);
    const announcement = await context.recordById('Announcement', record.announcement_id);
    const ownPersonal = announcement?.target_student_id === student?.id;
    const ownClass = announcement?.class_id === student?.class_id
      && ![PERSONAL_ANNOUNCEMENT, PARENT_ANNOUNCEMENT].includes(announcement.type);
    if (!student || !announcement?.is_published || (!ownPersonal && !ownClass)) {
      fail('Announcement/student relationship is invalid', 403);
    }
  }
  if (entityName === 'ExamCompletion' || entityName === 'ExamGradeReport') {
    const student = await context.studentById(record.student_id);
    const exam = await context.recordById('Exam', record.exam_id);
    if (!student || !exam || !await examVisibleToStudent(exam, student)) {
      fail('Exam/student relationship is invalid', 403);
    }
  }
}

async function sanitizeStudentMutation(entityName, operation, record, current, caller, context) {
  const ownStudent = caller.ownStudent;
  if (!ownStudent || record.student_id !== ownStudent.id) fail('Forbidden', 403);
  const next = { ...record, student_id: ownStudent.id, student_name: studentName(ownStudent) };

  if (entityName === 'AnnouncementRead') {
    const announcement = await context.recordById('Announcement', next.announcement_id);
    const ownPersonal = announcement?.target_student_id === ownStudent.id;
    const ownClass = announcement?.class_id === ownStudent.class_id
      && ![PERSONAL_ANNOUNCEMENT, PARENT_ANNOUNCEMENT].includes(announcement.type);
    if (!announcement?.is_published || (!ownPersonal && !ownClass)) fail('Announcement is not available to this student', 403);
  }

  if (entityName === 'ExamCompletion' || entityName === 'ExamGradeReport') {
    const exam = await context.recordById('Exam', next.exam_id);
    if (!exam || !await examVisibleToStudent(exam, ownStudent)) fail('Exam is not available to this student', 403);
    if (entityName === 'ExamCompletion') {
      if (!COMPLETION_STATUSES.has(next.status)) fail('Invalid completion status', 400);
    } else {
      if (operation === 'update' && current
          && ![STUDENT_REPORT, NEEDS_CORRECTION].includes(current.status)) {
        fail('Reviewed grade reports cannot be edited by students', 403);
      }
      const grade = Number(next.reported_grade);
      if (!Number.isFinite(grade) || grade < 0 || grade > 100) fail('Invalid reported grade', 400);
      next.reported_grade = grade;
      next.status = STUDENT_REPORT;
      next.exam_title = exam.title || '';
      next.exam_type = exam.type || '';
      next.subject = exam.subject || '';
      next.exam_date = exam.date || '';
    }
  }

  if (entityName === 'CommunityServiceReport') {
    if (operation === 'update' && current
        && ![PENDING_APPROVAL, NEEDS_CORRECTION].includes(current.status)) {
      fail('Approved reports cannot be edited by students', 403);
    }
    next.status = PENDING_APPROVAL;
  }

  if (entityName === 'CommunityServiceReport' || entityName === 'ExamGradeReport') {
    const now = new Date().toISOString();
    next.submitted_by_name = current?.submitted_by_name || caller.name;
    next.submitted_by_email = current?.submitted_by_email || caller.email;
    next.submitted_at = current?.submitted_at || now;
    next.updated_by_name = caller.name;
    next.updated_by_email = caller.email;
    next.updated_action_at = now;
    for (const field of ['staff_note', 'reviewed_by_name', 'reviewed_by_email', 'reviewed_at']) {
      next[field] = current?.[field] || '';
    }
  }
  return next;
}

async function authorizeMutation(entityName, operation, record, current, caller, context) {
  if (caller.isAdmin) return 'admin';
  if (operation === 'delete' && ADMIN_ONLY_DELETE.has(entityName)) fail('Forbidden', 403);
  if (await staffAllows(caller, entityName, operation, record, context)) return 'staff';
  if (STUDENT_OPERATIONS[entityName]?.has(operation)
      && caller.roles.has('student')
      && record.student_id === caller.ownStudent?.id) return 'student';
  fail('Forbidden', 403);
}

function relationshipChanged(entityName, current, next) {
  if ((current.student_id && next.student_id !== current.student_id)
      || (current.class_id && next.class_id !== current.class_id)) return true;
  if (entityName === 'AnnouncementRead' && current.announcement_id !== next.announcement_id) return true;
  if (['ExamCompletion', 'ExamGradeReport'].includes(entityName) && current.exam_id !== next.exam_id) return true;
  if (entityName === 'FamilySensitiveInfo' && current.owner_email !== next.owner_email) return true;
  return false;
}

async function prepareCreate(entityName, input, caller, context) {
  const payload = cleanPayload(input);
  if (entityName === 'FamilySensitiveInfo') payload.owner_email = caller.email;
  let bound = await bindCanonicalScope(entityName, payload, context);
  await validateRelatedReferences(entityName, bound.record, context);
  const mode = await authorizeMutation(entityName, 'create', bound.record, null, caller, context);
  if (mode === 'student') {
    const sanitized = await sanitizeStudentMutation(entityName, 'create', bound.record, null, caller, context);
    bound = await bindCanonicalScope(entityName, sanitized, context);
  }
  return bound.record;
}

async function mutateOne(entityName, operation, input, caller, context) {
  const entity = context.base44.asServiceRole.entities[entityName];
  if (operation === 'create') {
    const prepared = await prepareCreate(entityName, input, caller, context);
    const idempotentKeys = IDEMPOTENT_CREATE_KEYS[entityName];
    if (idempotentKeys) {
      const query = Object.fromEntries(idempotentKeys.map(key => [key, prepared[key]]));
      if (Object.values(query).every(Boolean)) {
        const existing = await entity.filter(query, '-updated_date', 2);
        if (existing[0]) {
          return mutateOne(entityName, 'update', { id: existing[0].id, data: prepared }, caller, context);
        }
      }
    }
    return entity.create(prepared);
  }

  const id = String(input?.id || '');
  const current = await context.recordById(entityName, id);
  if (!current) fail('Record not found', 404);
  const currentBound = await bindCanonicalScope(entityName, current, context);

  if (operation === 'delete') {
    await authorizeMutation(entityName, operation, currentBound.record, current, caller, context);
    await entity.delete(id);
    return { id, deleted: true };
  }

  const patch = cleanPayload(input?.data || input);
  let nextBound = await bindCanonicalScope(entityName, { ...current, ...patch }, context);
  await validateRelatedReferences(entityName, nextBound.record, context);
  const mode = await authorizeMutation(entityName, 'update', nextBound.record, current, caller, context);
  if (!caller.isAdmin && relationshipChanged(entityName, currentBound.record, nextBound.record)) {
    fail('Scope relationships are immutable', 403);
  }
  if (mode === 'student') {
    const sanitized = await sanitizeStudentMutation(entityName, 'update', nextBound.record, current, caller, context);
    nextBound = await bindCanonicalScope(entityName, sanitized, context);
  }
  return entity.update(id, cleanPayload(nextBound.record));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.disabled === true) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ error: 'Invalid body' }, { status: 400 });
    if (JSON.stringify(body).length > 1_000_000) return Response.json({ error: 'Payload too large' }, { status: 413 });

    const entityName = String(body.entity || '');
    const operation = String(body.operation || '');
    if (!MUTABLE_ENTITIES.has(entityName) || !OPERATIONS.has(operation)) {
      return Response.json({ error: 'Unsupported mutation' }, { status: 400 });
    }

    const caller = await loadCaller(base44, user);
    const context = createContext(base44);
    if (operation === 'bulkCreate') {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length || items.length > 500) return Response.json({ error: 'Invalid batch size' }, { status: 400 });
      const records = [];
      for (const item of items) records.push(await prepareCreate(entityName, item, caller, context));
      const results = await base44.asServiceRole.entities[entityName].bulkCreate(records);
      return Response.json({ result: results });
    }
    if (operation === 'bulkUpdate') {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length || items.length > 100) return Response.json({ error: 'Invalid batch size' }, { status: 400 });
      const results = [];
      for (const item of items) results.push(await mutateOne(entityName, 'update', item, caller, context));
      return Response.json({ result: results });
    }

    const mutationInput = operation === 'create' ? body.data : body;
    const result = await mutateOne(entityName, operation, mutationInput, caller, context);
    return Response.json({ result });
  } catch (error) {
    console.error('mutateScopedEntity error:', error?.message || error);
    const status = Number(error?.status) || 500;
    return Response.json({ error: status >= 500 ? 'Internal server error' : error.message }, { status });
  }
});
