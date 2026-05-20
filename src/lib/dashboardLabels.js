export function getDashboardLabel(role) {
  if (role === 'homeroom_teacher') return 'הכיתה שלי';
  if (role === 'coordinator') return 'השכבה שלי';
  if (role === 'student') return 'היום שלי';
  if (role === 'admin') return 'ניהול מערכת';
  return 'דשבורד';
}