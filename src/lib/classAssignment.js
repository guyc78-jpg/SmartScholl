import { normalizeGrade } from '@/lib/schoolStructure';

export function normalizeClassKey(value = '') {
  return String(value)
    .replace(/[׳״'"\s]/g, '')
    .trim();
}

export function findClassRoomByName(classRooms = [], className = '') {
  const key = normalizeClassKey(className);
  if (!key) return null;
  const matches = classRooms.filter(classRoom => (
    classRoom?.is_active !== false
    && normalizeClassKey(classRoom?.name) === key
  ));
  return matches.length === 1 ? matches[0] : null;
}

export function resolveStudentClassRoom(student, classRooms = []) {
  if (!student) return null;
  return findClassRoomByName(classRooms, student.class_name || student.className || '') || null;
}

function getStudentAcademicYear(student) {
  return String(
    student?.school_year
      || student?.academic_year
      || student?.academicYear
      || student?.year
      || ''
  ).trim();
}

/**
 * Finds only class assignments that are safe to repair automatically.
 * Inactive, wrong-year, wrong-grade and ambiguous matches are deliberately
 * reported as blocked so an administrator can resolve them manually.
 */
export function analyzeStudentClassAssignments(students = [], classRooms = []) {
  const fixable = [];
  const blocked = [];

  students.forEach(student => {
    const className = student?.class_name || student?.className || '';
    const key = normalizeClassKey(className);
    if (!key) return;

    const expectedYear = getStudentAcademicYear(student);
    const expectedGrade = normalizeGrade(student?.grade || '');
    const currentClassRoom = classRooms.find(classRoom => classRoom?.id === student?.class_id);
    const currentRoomGrade = normalizeGrade(currentClassRoom?.grade || '');
    const currentClassIsSafe = Boolean(
      currentClassRoom
      && currentClassRoom.is_active !== false
      && normalizeClassKey(currentClassRoom.name) === key
      && (!expectedYear || String(currentClassRoom.year || '').trim() === expectedYear)
      && (!expectedGrade || !currentRoomGrade || currentRoomGrade === expectedGrade)
    );

    // An existing valid ID is already unambiguous, even if another active
    // class happens to share its display name. Only normalize the stored name.
    if (currentClassIsSafe) {
      if (student.class_name === currentClassRoom.name) return;
      fixable.push({ student, classRoom: currentClassRoom, reason: 'שם הכיתה לא כתוב בפורמט התקין' });
      return;
    }

    const activeMatches = classRooms.filter(classRoom => (
      classRoom?.is_active !== false
      && normalizeClassKey(classRoom?.name) === key
    ));
    const yearMatches = expectedYear
      ? activeMatches.filter(classRoom => String(classRoom?.year || '').trim() === expectedYear)
      : activeMatches;
    const candidates = expectedYear ? yearMatches : activeMatches;
    let blockReason = '';
    if (activeMatches.length === 0) {
      blockReason = 'לא נמצאה כיתה פעילה בשם הזה';
    } else if (expectedYear && yearMatches.length === 0) {
      blockReason = `לא נמצאה כיתה פעילה לשנת ${expectedYear}`;
    } else if (candidates.length !== 1) {
      blockReason = 'נמצאו כמה כיתות פעילות מתאימות ולא ניתן לבחור בבטחה';
    } else {
      const roomGrade = normalizeGrade(candidates[0]?.grade || '');
      if (expectedGrade && roomGrade && roomGrade !== expectedGrade) {
        blockReason = `הכיתה הפעילה אינה תואמת לשכבה ${expectedGrade}`;
      }
    }

    if (blockReason) {
      blocked.push({
        student,
        className,
        reason: blockReason,
      });
      return;
    }

    const classRoom = candidates[0];
    if (student.class_id === classRoom.id && student.class_name === classRoom.name) return;
    fixable.push({
      student,
      classRoom,
      reason: !student.class_id
        ? 'חסר מזהה כיתה'
        : student.class_id !== classRoom.id
          ? 'מזהה כיתה לא תואם לשם הכיתה'
          : 'שם הכיתה לא כתוב בפורמט התקין'
    });
  });

  return { fixable, blocked };
}

export function getStudentClassMismatch(student, classRooms = []) {
  return analyzeStudentClassAssignments([student], classRooms).fixable[0] || null;
}

export function findStudentClassMismatches(students = [], classRooms = []) {
  return analyzeStudentClassAssignments(students, classRooms).fixable;
}

export function buildStudentClassPatch(student, classRoom) {
  return {
    class_id: classRoom.id,
    class_name: classRoom.name,
    grade: classRoom.grade || normalizeGrade(student?.grade || '')
  };
}
