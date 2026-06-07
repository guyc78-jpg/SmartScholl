export function getDashboardLabel(role) {
  if (role === 'homeroom_teacher') return 'הכיתה שלי';
  if (role === 'grade_coordinator' || role === 'coordinator') return 'השכבה שלי';
  if (role === 'division_manager') return 'החטיבה שלי';
  if (role === 'student') return 'היום שלי';
  if (role === 'system_admin' || role === 'admin') return 'ניהול מערכת';
  return 'דשבורד';
}