import { base44 } from '@/api/base44Client';

// איתור רשומת התלמיד/ה של המשתמש המחובר לפי מייל — בתחום הכיתה שלו בלבד
export async function fetchMyStudent(user, classId) {
  const students = await base44.entities.Student.filter({ class_id: classId });
  return students.find(s => s.email === user?.email || s.user_email === user?.email) || null;
}