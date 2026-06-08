import { normalizeGrade } from '@/lib/schoolStructure';

export function normalizeClassKey(value = '') {
  return String(value)
    .replace(/[׳״'"\s]/g, '')
    .trim();
}

export function findClassRoomByName(classRooms = [], className = '') {
  const key = normalizeClassKey(className);
  if (!key) return null;
  return classRooms.find(classRoom => normalizeClassKey(classRoom?.name) === key) || null;
}

export function resolveStudentClassRoom(student, classRooms = []) {
  if (!student) return null;
  return findClassRoomByName(classRooms, student.class_name || student.className || '') || null;
}

export function getStudentClassMismatch(student, classRooms = []) {
  const matchedClassRoom = resolveStudentClassRoom(student, classRooms);
  if (!matchedClassRoom) return null;
  if (student.class_id === matchedClassRoom.id && student.class_name === matchedClassRoom.name) return null;
  return {
    student,
    classRoom: matchedClassRoom,
    reason: !student.class_id
      ? 'חסר מזהה כיתה'
      : student.class_id !== matchedClassRoom.id
        ? 'מזהה כיתה לא תואם לשם הכיתה'
        : 'שם הכיתה לא כתוב בפורמט התקין'
  };
}

export function findStudentClassMismatches(students = [], classRooms = []) {
  return students
    .map(student => getStudentClassMismatch(student, classRooms))
    .filter(Boolean);
}

export function buildStudentClassPatch(student, classRoom) {
  return {
    class_id: classRoom.id,
    class_name: classRoom.name,
    grade: classRoom.grade || normalizeGrade(student?.grade || '')
  };
}