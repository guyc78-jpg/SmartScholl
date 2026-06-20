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
  return user?.active_homeroom_class_id || user?.profile_homeroom_class_id || user?.homeroomClassId || user?.authorization?.scope?.homeroomClassId || user?.authorization?.homeroomClassId || user?.profile_class_id || fallbackClassId || '';
}

export function getUserHomeroomClassId(user, fallbackClassId = '') {
  return user?.active_homeroom_class_id || user?.profile_homeroom_class_id || user?.homeroomClassId || user?.authorization?.scope?.homeroomClassId || user?.authorization?.homeroomClassId || user?.profile_class_id || fallbackClassId || '';
}

export function getActiveScopeMode() {
  if (typeof window === 'undefined') return 'grade';
  return new URLSearchParams(window.location.search).get('scope') === 'class' ? 'class' : 'grade';
}

export function coordinatorHasHomeroom(user) {
  return !!(user?.profile_homeroom_class_id || user?.homeroomClassId || user?.authorization?.scope?.homeroomClassId || user?.authorization?.homeroomClassId);
}

export function isStudentInApprovedScope(student, user, role) {
  if (role === 'system_admin' || role === 'admin') return true;
  const studentGrade = normalizeGrade(student?.grade || extractGradeFromClass(student?.class_name));
  const studentClass = normalizeClassName(student?.class_name || '');
  const approvedClassId = getUserHomeroomClassId(user, '');

  if (role === 'grade_coordinator' || role === 'coordinator') {
    const homeroomClassId = getUserHomeroomClassId(user, '');
    if (getActiveScopeMode() === 'class' && homeroomClassId) return student?.class_id === homeroomClassId;
    const approvedGrade = getUserApprovedGrade(user);
    return (!!approvedGrade && studentGrade === approvedGrade) || (!!homeroomClassId && student?.class_id === homeroomClassId);
  }

  if (role === 'division_manager') {
    return isGradeInUserDivision(user, studentGrade);
  }

  if (role === 'homeroom_teacher') {
    return !!approvedClassId && student?.class_id === approvedClassId;
  }

  return false;
}