const CLAIMS_KEY = '__approved_user_claims';

let claimsCache = null;
const classCache = { rows: null };
const studentCache = new Map();

const normalize = (value = '') => String(value).replace(/[׳״'"\s]/g, '').trim();
const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

export function setBase44AccessClaims(claims) {
  claimsCache = claims || null;
  if (typeof window !== 'undefined') {
    if (claimsCache) sessionStorage.setItem(CLAIMS_KEY, JSON.stringify(claimsCache));
    else sessionStorage.removeItem(CLAIMS_KEY);
  }
}

export function clearBase44AccessClaims() {
  setBase44AccessClaims(null);
}

function getClaims() {
  if (claimsCache) return claimsCache;
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(CLAIMS_KEY);
  if (!raw) return null;
  claimsCache = JSON.parse(raw);
  return claimsCache;
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
  if (!classCache.rows) classCache.rows = await rawClient.entities.ClassRoom.list('grade', 500);
  return classCache.rows || [];
}

async function classGrade(rawClient, classIdOrName) {
  if (!classIdOrName) return '';
  const classes = await getClasses(rawClient);
  const cls = classes.find(item => item.id === classIdOrName || normalize(item.name) === normalize(classIdOrName));
  return normalize(cls?.grade || '');
}

async function studentById(rawClient, studentId) {
  if (!studentId) return null;
  if (studentCache.has(studentId)) return studentCache.get(studentId);
  const rows = await rawClient.entities.Student.filter({ id: studentId });
  const student = rows?.[0] || null;
  studentCache.set(studentId, student);
  return student;
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

async function recordAllowed(rawClient, entityName, record, mode = 'read') {
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

  if (['ExamGradeReport', 'CommunityServiceReport'].includes(entityName) && ['grade_coordinator', 'coordinator', 'division_manager'].includes(role) && mode !== 'read') {
    return false;
  }

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

async function filterRecords(rawClient, entityName, rows) {
  const allowed = [];
  for (const row of rows || []) {
    if (await recordAllowed(rawClient, entityName, row, 'read')) allowed.push(row);
  }
  return allowed;
}

async function existingRecord(rawClient, entityName, id) {
  const rows = await rawClient.entities[entityName].filter({ id });
  return rows?.[0] || null;
}

function createEntityProxy(rawClient, entityName, entity) {
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

export function createGuardedBase44Client(rawClient) {
  const entityProxyCache = new Map();
  const entitiesProxy = new Proxy(rawClient.entities, {
    get(target, entityName) {
      const entity = target[entityName];
      if (!entity || typeof entityName === 'symbol') return entity;
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