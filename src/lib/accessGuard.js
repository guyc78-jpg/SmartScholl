const CLAIMS_KEY = '__approved_user_claims';
const DIRECT_ENTITY_BLOCKLIST = new Set(['ApprovedUser']);
const RESTRICTED_BULK_METHODS = new Set(['updateMany', 'deleteMany', 'importEntities']);
const DERIVED_SCOPE_ENTITIES = new Set([
  'Announcement',
  'AnnouncementRead',
  'AttendanceRecord',
  'Communication',
  'CommunityServiceReport',
  'DisciplineEvent',
  'Exam',
  'ExamCompletion',
  'ExamGradeReport',
  'FamilySensitiveInfo',
  'ParentContact',
  'PerformanceReview',
  'ScheduleSlot',
  'ScheduledConversation',
  'SmartAlert',
  'Student',
  'StudentAccommodation',
  'Task',
  'TeacherNote',
  'TreatmentCase',
  'UrgentFlag',
]);
const SERVER_MUTATION_ENTITIES = new Set(
  [...DERIVED_SCOPE_ENTITIES].filter(entityName => entityName !== 'StudentAccommodation')
);

let claimsCache = null;
let simulationClaimsCache = null;
const classCache = { rows: null };
const studentCache = new Map();

const normalize = (value = '') => String(value).replace(/[׳״'"\s]/g, '').trim();
const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

export function setBase44AccessClaims(claims) {
  claimsCache = claims || null;
  // Reset per-request caches whenever the active user/claims change,
  // so data from a previous session never leaks into authorization checks.
  classCache.rows = null;
  studentCache.clear();
  // Authorization claims are intentionally memory-only. sessionStorage is
  // user-editable and therefore cannot be a trusted source of roles/scopes.
  if (typeof window !== 'undefined') sessionStorage.removeItem(CLAIMS_KEY);
}

export function clearBase44AccessClaims() {
  claimsCache = null;
  simulationClaimsCache = null;
  classCache.rows = null;
  studentCache.clear();
  if (typeof window !== 'undefined') sessionStorage.removeItem(CLAIMS_KEY);
}

export function setBase44SimulationClaims(claims) {
  simulationClaimsCache = claims || null;
  classCache.rows = null;
  studentCache.clear();
}

export function clearBase44SimulationClaims() {
  simulationClaimsCache = null;
  classCache.rows = null;
  studentCache.clear();
}

function getClaims() {
  return simulationClaimsCache || claimsCache;
}

function accessError() {
  const error = new Error('אין הרשאה לבצע פעולה זו');
  Object.defineProperty(error, 'code', { value: 'ACCESS_DENIED' });
  return error;
}

function getRole(claims) {
  return claims?.role === 'system_admin' ? 'system_admin' : claims?.role;
}

function isAdmin(claims) {
  return ['system_admin', 'admin'].includes(getRole(claims));
}

function allowedDivisionGrades(claims) {
  const division = claims?.scope?.divisionType || claims?.profile_division;
  if (division === 'upper') return ['י', 'יא', 'יב'];
  if (division === 'middle') return ['ז', 'ח', 'ט'];
  return [];
}

async function logBlocked(rawClient, entityName, method, details, metadata = {}) {
  const claims = getClaims();
  await rawClient.functions.invoke('authorizeAccess', {
    action: 'logUnauthorizedAccess',
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    attemptedAction: `${entityName}.${method}`,
    details,
    metadata,
    role: claims?.role || '',
  }).catch(() => {});
}

async function getClasses(rawClient) {
  if (!classCache.rows) classCache.rows = await rawClient.entities.ClassRoom.list('grade', 5000);
  return classCache.rows || [];
}

async function classByReference(rawClient, classIdOrName) {
  if (!classIdOrName) return null;
  const classes = await getClasses(rawClient);
  return classes.find(item => (
    item.id === classIdOrName
    || normalize(item.name) === normalize(classIdOrName)
  )) || null;
}

async function classGrade(rawClient, classIdOrName) {
  const cls = await classByReference(rawClient, classIdOrName);
  return normalize(cls?.grade || '');
}

async function studentById(rawClient, studentId) {
  if (!studentId) return null;
  if (studentCache.has(studentId)) return await studentCache.get(studentId);

  // Cache the in-flight request as well as the result so parallel checks for
  // the same student do not duplicate network traffic. Never fetch the entire
  // Student table merely to authorize a single related record.
  const pending = rawClient.entities.Student.filter({ id: studentId })
    .then(rows => rows?.[0] || null)
    .catch(() => null);
  studentCache.set(studentId, pending);
  const student = await pending;
  studentCache.set(studentId, student);
  return student;
}

async function deriveTrustedScope(rawClient, entityName, record) {
  if (!DERIVED_SCOPE_ENTITIES.has(entityName)) return { ...(record || {}) };

  const next = { ...(record || {}) };
  let classReference = next.class_id || '';

  // A related Student row is the authoritative source for both the class and
  // grade. Client-supplied class_id/grade values are deliberately ignored.
  if (next.student_id) {
    const student = await studentById(rawClient, next.student_id);
    if (!student?.class_id) throw accessError();
    classReference = student.class_id;
  }

  // Student records and class-level records derive their grade from the
  // canonical ClassRoom record. This also canonicalizes legacy class names to
  // the immutable ClassRoom id before authorization and persistence.
  const classRoom = await classByReference(rawClient, classReference);
  if (!classRoom?.id || !normalize(classRoom.grade)) throw accessError();

  return {
    ...next,
    class_id: classRoom.id,
    grade: normalize(classRoom.grade),
  };
}

function scopePatch(entityName, record, trustedRecord, currentRecord = null) {
  if (!DERIVED_SCOPE_ENTITIES.has(entityName)
      || !trustedRecord
      || !Object.prototype.hasOwnProperty.call(trustedRecord, 'grade')) {
    return { ...(record || {}) };
  }

  const patch = { ...(record || {}) };
  if (currentRecord && !isAdmin(getClaims())) {
    if (Object.prototype.hasOwnProperty.call(patch, 'student_id')
        && currentRecord.student_id
        && patch.student_id !== currentRecord.student_id) {
      throw accessError();
    }
    if (currentRecord.class_id && trustedRecord.class_id !== currentRecord.class_id) {
      throw accessError();
    }

    // Scope and relationship fields are immutable for direct staff/student
    // updates. Backend workflows with service-role validation own transfers.
    delete patch.student_id;
    delete patch.class_id;
    delete patch.grade;
    return patch;
  }

  return {
    ...patch,
    class_id: trustedRecord.class_id,
    grade: trustedRecord.grade,
  };
}

async function classAllowed(rawClient, claims, classIdOrName) {
  if (!classIdOrName) return false;
  const role = getRole(claims);
  if (isAdmin(claims)) return true;

  if (role === 'homeroom_teacher') {
    const approvedId = claims?.scope?.classId || claims?.profile_class_id;
    const approvedName = claims?.profile_class || claims?.profile_homeroom_class;
    return classIdOrName === approvedId || normalize(classIdOrName) === normalize(approvedName);
  }

  const coordinatorHomeroomId = claims?.scope?.homeroomClassId || claims?.homeroomClassId || claims?.profile_homeroom_class_id;
  if ((role === 'grade_coordinator' || role === 'coordinator') && coordinatorHomeroomId && classIdOrName === coordinatorHomeroomId) return true;

  const grade = await classGrade(rawClient, classIdOrName);
  if (!grade) return false;
  if (role === 'grade_coordinator' || role === 'coordinator') {
    return grade === normalize(claims?.scope?.gradeId || claims?.profile_grade_managed);
  }
  if (role === 'division_manager') return allowedDivisionGrades(claims).includes(grade);
  if (role === 'student') return classIdOrName === claims?.profile_class_id || normalize(classIdOrName) === normalize(claims?.profile_class);
  return false;
}

async function gradeAllowed(claims, grade) {
  const role = getRole(claims);
  const clean = normalize(grade);
  if (!clean) return false;
  if (isAdmin(claims)) return true;
  if (role === 'grade_coordinator' || role === 'coordinator') return clean === normalize(claims?.scope?.gradeId || claims?.profile_grade_managed);
  if (role === 'division_manager') return allowedDivisionGrades(claims).includes(clean);
  if (role === 'student') return clean === normalize(claims?.profile_grade_managed || claims?.gradeId);
  return false;
}

async function studentAllowed(rawClient, claims, student) {
  if (!student) return false;
  const role = getRole(claims);
  if (isAdmin(claims)) return true;
  if (role === 'student') {
    const email = normalizeEmail(claims?.email);
    return student.id === claims?.student_id || normalizeEmail(student.email) === email || normalizeEmail(student.user_email) === email;
  }
  if (student.class_id && await classAllowed(rawClient, claims, student.class_id)) return true;
  if (role === 'homeroom_teacher') return false;
  return gradeAllowed(claims, student.grade);
}

async function recordAllowedLegacy(rawClient, entityName, record, mode = 'read') {
  const claims = getClaims();
  if (!claims?.authorized || claims.isActive === false) return false;
  const role = getRole(claims);
  if (isAdmin(claims)) return true;

  if (entityName === 'ApprovedUser') return false;
  if (entityName === 'ActivityLog') return mode === 'create' && normalizeEmail(record?.actor_email) === normalizeEmail(claims.email);
  if (entityName === 'BellSchedule') return role !== 'student' || mode === 'read';

  if (entityName === 'ClassRoom') {
    if (record?.id && await classAllowed(rawClient, claims, record.id)) return true;
    if (record?.name && await classAllowed(rawClient, claims, record.name)) return true;
    if (role === 'homeroom_teacher' || role === 'student') return false;
    return gradeAllowed(claims, record?.grade);
  }

  if (entityName === 'Student') return studentAllowed(rawClient, claims, record);

  if (role === 'student') {
    if (record?.student_id) {
      const student = await studentById(rawClient, record.student_id);
      const ownRecord = await studentAllowed(rawClient, claims, student);
      if (!ownRecord) return false;
      if (entityName === 'ExamGradeReport') return mode === 'read' || ['דיווח תלמיד', 'דורש תיקון'].includes(record.status);
      if (entityName === 'CommunityServiceReport') return mode === 'read' || ['ממתין לאישור', 'דורש תיקון'].includes(record.status);
      return true;
    }
    if (record?.class_id) return classAllowed(rawClient, claims, record.class_id);
    return false;
  }

  if (['ExamGradeReport', 'CommunityServiceReport'].includes(entityName) && role === 'division_manager' && mode !== 'read') {
    return false;
  }

  if (record?.class_id && await classAllowed(rawClient, claims, record.class_id)) return true;

  if (record?.student_id) {
    const student = await studentById(rawClient, record.student_id);
    return studentAllowed(rawClient, claims, student);
  }

  const classValues = [record?.class_id, ...(Array.isArray(record?.class_ids) ? record.class_ids : []), ...(Array.isArray(record?.audience_classes) ? record.audience_classes : [])].filter(Boolean);
  if (classValues.length) {
    const checks = [];
    for (const classValue of classValues) checks.push(await classAllowed(rawClient, claims, classValue));
    return mode === 'read' ? checks.some(Boolean) : checks.every(Boolean);
  }

  const gradeValues = [record?.grade, record?.grade_id, ...(Array.isArray(record?.grade_ids) ? record.grade_ids : []), ...(Array.isArray(record?.audience_grades) ? record.audience_grades : [])].filter(Boolean);
  if (gradeValues.length) {
    const checks = [];
    for (const grade of gradeValues) checks.push(await gradeAllowed(claims, grade));
    return mode === 'read' ? checks.some(Boolean) : checks.every(Boolean);
  }

  return role !== 'student';
}

async function recordAllowed(rawClient, entityName, record, mode = 'read') {
  const claims = getClaims();
  if (!record || !claims?.authorized || claims.isActive === false) return false;
  const role = getRole(claims);

  // ApprovedUser must always go through authorizeAccess so its server-side
  // validation and audit trail cannot be bypassed by an admin UI call.
  if (entityName === 'ApprovedUser') return false;
  if (isAdmin(claims)) return true;

  if (entityName === 'ActivityLog') {
    return mode === 'create' && normalizeEmail(record.actor_email) === normalizeEmail(claims.email);
  }
  if (entityName === 'BellSchedule') return mode === 'read';
  if (entityName === 'User') {
    const sameUser = (claims.id && record.id === claims.id)
      || normalizeEmail(record.email) === normalizeEmail(claims.email);
    return sameUser && (mode === 'read' || mode === 'update');
  }

  if (entityName === 'ClassRoom') {
    if (record.id && await classAllowed(rawClient, claims, record.id)) return true;
    if (record.name && await classAllowed(rawClient, claims, record.name)) return true;
    if (role === 'homeroom_teacher' || role === 'student') return false;
    return gradeAllowed(claims, record.grade);
  }

  if (entityName === 'Student') return studentAllowed(rawClient, claims, record);

  const classValues = [
    record.class_id,
    ...(Array.isArray(record.class_ids) ? record.class_ids : []),
    ...(Array.isArray(record.audience_classes) ? record.audience_classes : []),
  ].filter(Boolean);
  const gradeValues = [
    record.grade,
    record.grade_id,
    ...(Array.isArray(record.grade_ids) ? record.grade_ids : []),
    ...(Array.isArray(record.audience_grades) ? record.audience_grades : []),
  ].filter(Boolean);

  if (role === 'student') {
    let hasScope = false;
    if (record.student_id) {
      hasScope = true;
      const student = await studentById(rawClient, record.student_id);
      if (!await studentAllowed(rawClient, claims, student)) return false;
      if (entityName === 'ExamGradeReport' && mode !== 'read') {
        if (!['דיווח תלמיד', 'דורש תיקון'].includes(record.status)) return false;
      }
      if (entityName === 'CommunityServiceReport' && mode !== 'read') {
        if (!['ממתין לאישור', 'דורש תיקון'].includes(record.status)) return false;
      }
    }

    if (classValues.length) {
      hasScope = true;
      const checks = await Promise.all(classValues.map(value => classAllowed(rawClient, claims, value)));
      if (!(mode === 'read' ? checks.some(Boolean) : checks.every(Boolean))) return false;
    }

    if (gradeValues.length) {
      hasScope = true;
      const checks = await Promise.all(gradeValues.map(value => gradeAllowed(claims, value)));
      if (!(mode === 'read' ? checks.some(Boolean) : checks.every(Boolean))) return false;
    }

    return hasScope;
  }

  if (['ExamGradeReport', 'CommunityServiceReport'].includes(entityName)
      && role === 'division_manager' && mode !== 'read') {
    return false;
  }

  const scopeDecisions = [];
  if (record.student_id) {
    const student = await studentById(rawClient, record.student_id);
    scopeDecisions.push(await studentAllowed(rawClient, claims, student));
  }
  if (classValues.length) {
    const checks = await Promise.all(classValues.map(value => classAllowed(rawClient, claims, value)));
    scopeDecisions.push(mode === 'read' ? checks.some(Boolean) : checks.every(Boolean));
  }
  if (gradeValues.length) {
    const checks = await Promise.all(gradeValues.map(value => gradeAllowed(claims, value)));
    scopeDecisions.push(mode === 'read' ? checks.some(Boolean) : checks.every(Boolean));
  }

  // If a record carries multiple independent scopes, every dimension must be
  // allowed. An allowed class_id must not mask an out-of-scope class/grade.
  if (scopeDecisions.length) return scopeDecisions.every(Boolean);
  return role !== 'student';
}

async function filterRecords(rawClient, entityName, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows || [];

  const claims = getClaims();
  // Admins see everything — skip all per-row work entirely.
  if (isAdmin(claims)) return rows;

  // Warm only class metadata required for scoped grade resolution.
  if (!classCache.rows) await getClasses(rawClient).catch(() => {});

  const decisions = await Promise.all(
    rows.map(row => recordAllowed(rawClient, entityName, row, 'read').catch(() => false))
  );
  return rows.filter((_, i) => decisions[i]);
}

async function existingRecord(rawClient, entityName, id) {
  const rows = await rawClient.entities[entityName].filter({ id });
  return rows?.[0] || null;
}

function createEntityProxyLegacy(rawClient, entityName, entity) {
  return new Proxy(entity, {
    get(target, prop) {
      const original = target[prop];
      if (typeof original !== 'function') return original;

      return async (...args) => {
        if (prop === 'list' || prop === 'filter') {
          const rows = await original.apply(target, args);
          return Array.isArray(rows) ? filterRecords(rawClient, entityName, rows) : rows;
        }

        if (prop === 'create') {
          if (!await recordAllowed(rawClient, entityName, args[0], 'create')) {
            await logBlocked(rawClient, entityName, prop, 'ניסיון יצירה מחוץ להרשאה', { payload: args[0] });
            throw new Error('אין הרשאה לבצע פעולה זו');
          }
        }

        if (prop === 'bulkCreate') {
          for (const item of args[0] || []) {
            if (!await recordAllowed(rawClient, entityName, item, 'create')) {
              await logBlocked(rawClient, entityName, prop, 'ניסיון יצירה מרובה מחוץ להרשאה', { payload: item });
              throw new Error('אין הרשאה לבצע פעולה זו');
            }
          }
        }

        if (prop === 'update') {
          const current = await existingRecord(rawClient, entityName, args[0]);
          const next = { ...(current || {}), ...(args[1] || {}) };
          if (!current || !await recordAllowed(rawClient, entityName, current, 'update') || !await recordAllowed(rawClient, entityName, next, 'update')) {
            await logBlocked(rawClient, entityName, prop, 'ניסיון עריכה מחוץ להרשאה', { id: args[0] });
            throw new Error('אין הרשאה לבצע פעולה זו');
          }
        }

        if (prop === 'delete') {
          const current = await existingRecord(rawClient, entityName, args[0]);
          if (!current || !await recordAllowed(rawClient, entityName, current, 'delete')) {
            await logBlocked(rawClient, entityName, prop, 'ניסיון מחיקה מחוץ להרשאה', { id: args[0] });
            throw new Error('אין הרשאה לבצע פעולה זו');
          }
        }

        return original.apply(target, args);
      };
    }
  });
}

async function denyEntityAction(rawClient, entityName, method, details, metadata = {}) {
  await logBlocked(rawClient, entityName, method, details, metadata);
  throw accessError();
}

async function invokeScopedMutation(rawClient, entityName, operation, payload = {}) {
  const response = await rawClient.functions.invoke('mutateScopedEntity', {
    entity: entityName,
    operation,
    ...payload,
  });
  return response?.data?.result;
}

function createEntityProxy(rawClient, entityName, entity) {
  return new Proxy(entity, {
    get(target, prop) {
      const original = target[prop];
      if (typeof prop === 'symbol') return original;
      if (typeof original !== 'function') return original;

      // subscribe() is synchronous and must return an unsubscribe function.
      // Wrapping it in an async function turns that function into a Promise,
      // which breaks every React effect cleanup using realtime subscriptions.
      if (prop === 'subscribe') {
        return (callback) => {
          if (DIRECT_ENTITY_BLOCKLIST.has(entityName)) {
            void logBlocked(rawClient, entityName, prop, 'Direct subscription to a protected entity was blocked');
            throw accessError();
          }
          return original.call(target, (event) => {
            Promise.resolve(recordAllowed(rawClient, entityName, event?.data, 'read'))
              .then(allowed => {
                if (allowed && typeof callback === 'function') callback(event);
              })
              .catch(() => {});
          });
        };
      }

      return async (...args) => {
        if (DIRECT_ENTITY_BLOCKLIST.has(entityName)) {
          return denyEntityAction(
            rawClient,
            entityName,
            prop,
            'Direct access to a protected entity was blocked'
          );
        }

        if (prop === 'list' || prop === 'filter') {
          const rows = await original.apply(target, args);
          return Array.isArray(rows) ? filterRecords(rawClient, entityName, rows) : rows;
        }

        if (prop === 'get') {
          const record = await original.apply(target, args);
          if (!await recordAllowed(rawClient, entityName, record, 'read')) {
            return denyEntityAction(rawClient, entityName, prop, 'Out-of-scope record read was blocked', { id: args[0] });
          }
          return record;
        }

        if (RESTRICTED_BULK_METHODS.has(prop) && !isAdmin(getClaims())) {
          return denyEntityAction(
            rawClient,
            entityName,
            prop,
            'A bulk operation that cannot be safely scoped was blocked'
          );
        }

        if (prop === 'create') {
          const trustedRecord = await deriveTrustedScope(rawClient, entityName, args[0]);
          args[0] = trustedRecord;
          if (!await recordAllowed(rawClient, entityName, trustedRecord, 'create')) {
            return denyEntityAction(rawClient, entityName, prop, 'Out-of-scope record creation was blocked');
          }
          if (SERVER_MUTATION_ENTITIES.has(entityName)) {
            return invokeScopedMutation(rawClient, entityName, 'create', { data: trustedRecord });
          }
        }

        if (prop === 'bulkCreate') {
          const items = Array.isArray(args[0]) ? args[0] : [];
          const trustedItems = await Promise.all(
            items.map(item => deriveTrustedScope(rawClient, entityName, item))
          );
          const decisions = await Promise.all(
            trustedItems.map(item => recordAllowed(rawClient, entityName, item, 'create'))
          );
          if (decisions.some(allowed => !allowed)) {
            return denyEntityAction(rawClient, entityName, prop, 'Out-of-scope bulk creation was blocked', { count: items.length });
          }
          args[0] = trustedItems;
          if (SERVER_MUTATION_ENTITIES.has(entityName)) {
            return invokeScopedMutation(rawClient, entityName, 'bulkCreate', { items: trustedItems });
          }
        }

        if (prop === 'update') {
          const current = await existingRecord(rawClient, entityName, args[0]);
          const next = { ...(current || {}), ...(args[1] || {}) };
          const trustedNext = await deriveTrustedScope(rawClient, entityName, next);
          if (!current
              || !await recordAllowed(rawClient, entityName, current, 'update')
              || !await recordAllowed(rawClient, entityName, trustedNext, 'update')) {
            return denyEntityAction(rawClient, entityName, prop, 'Out-of-scope record update was blocked', { id: args[0] });
          }
          args[1] = scopePatch(entityName, args[1], trustedNext, current);
          if (SERVER_MUTATION_ENTITIES.has(entityName)) {
            return invokeScopedMutation(rawClient, entityName, 'update', { id: args[0], data: args[1] });
          }
        }

        if (prop === 'bulkUpdate') {
          const items = Array.isArray(args[0]) ? args[0] : [];
          const trustedItems = [];
          for (const item of items) {
            const current = item?.id ? await existingRecord(rawClient, entityName, item.id) : null;
            const next = { ...(current || {}), ...(item || {}) };
            const trustedNext = await deriveTrustedScope(rawClient, entityName, next);
            if (!current
                || !await recordAllowed(rawClient, entityName, current, 'update')
                || !await recordAllowed(rawClient, entityName, trustedNext, 'update')) {
              return denyEntityAction(rawClient, entityName, prop, 'Out-of-scope bulk update was blocked', { id: item?.id || '' });
            }
            trustedItems.push(scopePatch(entityName, item, trustedNext, current));
          }
          args[0] = trustedItems;
          if (SERVER_MUTATION_ENTITIES.has(entityName)) {
            return invokeScopedMutation(rawClient, entityName, 'bulkUpdate', { items: trustedItems });
          }
        }

        if (prop === 'delete') {
          const current = await existingRecord(rawClient, entityName, args[0]);
          if (!current || !await recordAllowed(rawClient, entityName, current, 'delete')) {
            return denyEntityAction(rawClient, entityName, prop, 'Out-of-scope record deletion was blocked', { id: args[0] });
          }
          if (SERVER_MUTATION_ENTITIES.has(entityName)) {
            return invokeScopedMutation(rawClient, entityName, 'delete', { id: args[0] });
          }
        }

        return original.apply(target, args);
      };
    }
  });
}

export function createGuardedBase44Client(rawClient) {
  const entityProxyCache = new Map();
  const entitiesProxy = new Proxy(rawClient.entities, {
    get(target, entityName) {
      if (typeof entityName === 'symbol') return target[entityName];
      const entity = target[entityName];
      if (!entity) return entity;
      if (!entityProxyCache.has(entityName)) entityProxyCache.set(entityName, createEntityProxy(rawClient, entityName, entity));
      return entityProxyCache.get(entityName);
    }
  });

  return new Proxy(rawClient, {
    get(target, prop) {
      if (prop === 'entities') return entitiesProxy;
      return target[prop];
    }
  });
}
