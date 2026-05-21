// Utility for gender-based phrasing of statuses and labels.
// Does NOT change stored values — only display.

// Student gender values stored in the DB: 'זכר' | 'נקבה'
// Current user gender values stored on user.profile_gender: 'male' | 'female'

const ATTENDANCE_MALE = {
  'נוכח/ת': 'נוכח',
  'נוכח': 'נוכח',
  'נעדר/ת': 'נעדר',
  'נעדר': 'נעדר',
  'מאחר/ת': 'מאחר',
  'מאחר': 'מאחר',
  'שוחרר/ה': 'שוחרר',
  'שוחרר': 'שוחרר',
};

const ATTENDANCE_FEMALE = {
  'נוכח/ת': 'נוכחת',
  'נוכח': 'נוכחת',
  'נעדר/ת': 'נעדרת',
  'נעדר': 'נעדרת',
  'מאחר/ת': 'מאחרת',
  'מאחר': 'מאחרת',
  'שוחרר/ה': 'שוחררה',
  'שוחרר': 'שוחררה',
};

const STUDENT_STATUS_MALE = {
  'דורש מעקב': 'דורש מעקב',
};
const STUDENT_STATUS_FEMALE = {
  'דורש מעקב': 'דורשת מעקב',
};

/**
 * Resolves gender from a student record (stored as 'זכר'/'נקבה') or a user record (stored as 'male'/'female').
 * Returns 'male' | 'female' | null
 */
export function resolveGender(subject) {
  if (!subject) return null;
  if (subject.profile_gender === 'male' || subject.profile_gender === 'female') return subject.profile_gender;
  if (subject.gender === 'זכר') return 'male';
  if (subject.gender === 'נקבה') return 'female';
  return null;
}

/**
 * Formats an attendance status string for display, based on subject gender.
 * Falls back to the original (neutral) string if gender is unknown.
 */
export function formatAttendanceStatus(status, subject) {
  if (!status) return status;
  const gender = resolveGender(subject);
  if (gender === 'male') return ATTENDANCE_MALE[status] || status;
  if (gender === 'female') return ATTENDANCE_FEMALE[status] || status;
  return status;
}

/**
 * Formats a student status (e.g. "דורש מעקב") for display.
 */
export function formatStudentStatus(status, subject) {
  if (!status) return status;
  const gender = resolveGender(subject);
  if (gender === 'male') return STUDENT_STATUS_MALE[status] || status;
  if (gender === 'female') return STUDENT_STATUS_FEMALE[status] || status;
  return status;
}