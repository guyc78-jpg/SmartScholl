export function getStudentClassName(user) {
  return user?.profile_class || user?.profile_homeroom_class || '';
}

export function getStudentGrade(user) {
  return user?.profile_grade_managed || '';
}

export function getStudentClassId(user, fallbackClassId = '') {
  return user?.profile_class_id || fallbackClassId || getStudentClassName(user);
}