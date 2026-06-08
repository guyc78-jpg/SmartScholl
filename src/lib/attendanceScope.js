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
export const PRESENT_STATUS = 'נוכח/ת';
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
    const classId = user?.profile_class_id || getUserHomeroomClassId(user, '');
    const className = getUserApprovedClass(user);
    rows = classId
      ? await base44.entities.Student.filter({ class_id: classId }, 'lastName', 300)
      : className
        ? await base44.entities.Student.filter({ class_name: className }, 'lastName', 300)
        : [];
  } else if (role === 'coordinator' || role === 'grade_coordinator') {
    if (getActiveScopeMode() === 'class') {
      const classId = getUserHomeroomClassId(user, '');
      rows = classId ? await base44.entities.Student.filter({ class_id: classId }, 'lastName', 300) : [];
    } else {
      const grade = normalizeGrade(getUserApprovedGrade(user));
      rows = grade ? await base44.entities.Student.filter({ grade }, 'lastName', 600) : [];
    }
  } else {
    rows = await base44.entities.Student.list('-updated_date', 1000);
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
  return records.filter(record => ATTENDANCE_STATUSES.includes(record.status) && scopedIds.has(record.student_id));
}