import { base44 } from '@/api/base44Client';
import { compareStudentsByLastName } from '@/lib/studentName';
import {
  isStudentInApprovedScope,
  getUserApprovedClass,
  getUserApprovedGrade,
  getUserHomeroomClassId,
  getActiveScopeMode,
  normalizeGrade,
} from '@/lib/schoolStructure';

export const ATTENDANCE_STATUSES = ['נוכח/ת', 'מאחר/ת', 'נעדר/ת', 'שוחרר/ת'];
export const ATTENDANCE_EXCEPTION_STATUSES = ['מאחר', 'מאחר/ת', 'נעדר', 'נעדר/ת', 'שוחרר', 'שוחרר/ת'];
export const PRESENT_STATUS = 'נוכח/ת';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const safeEntityRead = async (loader, fallback = []) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await loader();
    } catch (error) {
      if (attempt === 1) return fallback;
      await wait(350);
    }
  }
  return fallback;
};

const DB_TO_UI_STATUS = {
  'נוכח': 'נוכח/ת',
  'מאחר': 'מאחר/ת',
  'נעדר': 'נעדר/ת',
  'שוחרר': 'שוחרר/ת',
  'נוכח/ת': 'נוכח/ת',
  'מאחר/ת': 'מאחר/ת',
  'נעדר/ת': 'נעדר/ת',
  'שוחרר/ת': 'שוחרר/ת',
};

const UI_TO_DB_STATUS = {
  'נוכח/ת': 'נוכח',
  'מאחר/ת': 'מאחר',
  'נעדר/ת': 'נעדר',
  'שוחרר/ת': 'שוחרר',
  'נוכח': 'נוכח',
  'מאחר': 'מאחר',
  'נעדר': 'נעדר',
  'שוחרר': 'שוחרר',
};

export function toUiAttendanceStatus(status) {
  return DB_TO_UI_STATUS[status] || status;
}

export function toStoredAttendanceStatus(status) {
  return UI_TO_DB_STATUS[status] || status;
}
export const ATTENDANCE_DATE_KEY = 'attendance:selectedDate';

export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSelectedAttendanceDate() {
  return localStorage.getItem(ATTENDANCE_DATE_KEY) || getLocalDateString();
}

export function saveSelectedAttendanceDate(date) {
  localStorage.setItem(ATTENDANCE_DATE_KEY, date);
}

export async function getAttendanceScopedStudents(user, role) {
  let rows = [];

  if (role === 'homeroom_teacher') {
    const classId = getUserHomeroomClassId(user, '');
    rows = classId ? await safeEntityRead(() => base44.entities.Student.filter({ class_id: classId }, 'lastName', 300)) : [];
  } else if (role === 'coordinator' || role === 'grade_coordinator') {
    if (getActiveScopeMode() === 'class') {
      const classId = getUserHomeroomClassId(user, '');
      rows = classId ? await safeEntityRead(() => base44.entities.Student.filter({ class_id: classId }, 'lastName', 300)) : [];
    } else {
      const grade = normalizeGrade(getUserApprovedGrade(user));
      rows = grade ? await safeEntityRead(() => base44.entities.Student.filter({ grade }, 'lastName', 600)) : [];
    }
  } else {
    rows = await safeEntityRead(() => base44.entities.Student.list('-updated_date', 1000));
  }

  const activeStudents = (rows || []).filter(s => s.status === 'פעיל' || s.status === 'דורש מעקב');
  let scopedStudents = activeStudents.filter(s => isStudentInApprovedScope(s, user, role));
  if (scopedStudents.length === 0 && (role === 'admin' || role === 'system_admin')) scopedStudents = activeStudents;
  return scopedStudents.sort(compareStudentsByLastName);
}

export function getScopedClassIds(students) {
  return [...new Set(students.map(s => s.class_id).filter(Boolean))];
}

export function filterScopedAttendance(records, students) {
  const scopedIds = new Set(students.map(student => student.id));
  return records
    .map(record => ({ ...record, status: toUiAttendanceStatus(record.status) }))
    .filter(record => ATTENDANCE_STATUSES.includes(record.status) && scopedIds.has(record.student_id));
}

export async function loadScopedAttendanceForDate(students, date) {
  const classIds = getScopedClassIds(students);
  if (classIds.length === 0) return [];
  const attendanceByClass = await Promise.allSettled(
    classIds.map(classId => safeEntityRead(() => base44.entities.AttendanceRecord.filter({ class_id: classId, date })))
  );
  return filterScopedAttendance(
    attendanceByClass.flatMap(result => result.status === 'fulfilled' ? result.value : []),
    students
  );
}