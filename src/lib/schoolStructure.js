export const GRADES = ['ז', 'ח', 'ט', 'י', 'יא', 'יב'];
export const CLASS_NUMBERS = Array.from({ length: 10 }, (_, index) => String(index + 1));

// חטיבות: עליונה (י׳-י״ב) וביניים (ז׳-ט׳)
export const DIVISIONS = {
  upper: { label: 'חטיבה עליונה', grades: ['י', 'יא', 'יב'] },
  middle: { label: 'חטיבת ביניים', grades: ['ז', 'ח', 'ט'] },
};

export function getDivisionGrades(division) {
  return DIVISIONS[division]?.grades || [];
}

export function getDivisionLabel(division) {
  return DIVISIONS[division]?.label || '';
}

// השכבות שמנהל/ת החטיבה מורשה/ת להן, לפי profile_division
export function getUserDivisionGrades(user) {
  return getDivisionGrades(user?.profile_division || user?.authorization?.scope?.divisionType);
}

export function isGradeInUserDivision(user, grade) {
  return getUserDivisionGrades(user).includes(normalizeGrade(grade));
}

export function formatGrade(grade) {
  const clean = normalizeGrade(grade);
  if (clean === 'יא') return 'י״א';
  if (clean === 'יב') return 'י״ב';
  return clean ? `${clean}׳` : '';
}

export function normalizeGrade(value = '') {
  return String(value).replace(/[׳״'"\s]/g, '').trim();
}

export function buildClassName(grade, classNumber) {
  if (!grade || !classNumber) return '';
  return `${formatGrade(grade)}${classNumber}`;
}

export function extractGradeFromClass(className = '') {
  const clean = normalizeGrade(className).replace(/\d+$/, '');
  return GRADES.includes(clean) ? clean : '';
}

export function normalizeClassName(value = '') {
  return normalizeGrade(value);
}

export function getUserApprovedGrade(user) {
  return normalizeGrade(user?.profile_grade_managed) || extractGradeFromClass(user?.profile_homeroom_class || user?.profile_class || '');
}

export function getUserApprovedClass(user) {
  return user?.profile_homeroom_class || user?.profile_class || '';
}

export function getUserApprovedClassId(user, fallbackClassId = '') {
  return user?.profile_class_id || fallbackClassId || getUserApprovedClass(user);
}

export function isStudentInApprovedScope(student, user, role) {
  if (role === 'system_admin' || role === 'admin') return true;
  const studentGrade = normalizeGrade(student?.grade || extractGradeFromClass(student?.class_name));
  const studentClass = normalizeClassName(student?.class_name || '');
  const approvedClassId = user?.profile_class_id || '';

  if (role === 'grade_coordinator' || role === 'coordinator') {
    const approvedGrade = getUserApprovedGrade(user);
    return !!approvedGrade && studentGrade === approvedGrade;
  }

  if (role === 'division_manager') {
    return isGradeInUserDivision(user, studentGrade);
  }

  if (role === 'homeroom_teacher') {
    const approvedClass = normalizeClassName(getUserApprovedClass(user));
    return (!!approvedClassId && student?.class_id === approvedClassId) || (!!approvedClass && studentClass === approvedClass);
  }

  return false;
}