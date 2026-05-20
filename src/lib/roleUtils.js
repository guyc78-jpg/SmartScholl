export const ROLE_LABELS = {
  admin: 'מנהל/ת מערכת',
  homeroom_teacher: 'מחנך/ת כיתה',
  coordinator: 'רכז/ת שכבה',
  student: 'תלמיד/ה',
  parent: 'הורה',
};

const VALID_ROLES = ['admin', 'homeroom_teacher', 'coordinator', 'student', 'parent'];

function parseRoles(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return trimmed.split(',').map(role => role.trim());
}

export function getAvailableRoles(user) {
  if (!user) return ['student'];

  const roles = [
    ...parseRoles(user.roles),
    ...parseRoles(user.available_roles),
    user.role,
  ];

  const extraRolesText = `${user.profile_extra_roles || ''} ${user.profile_school_role || ''}`;
  if (/מחנך|homeroom/i.test(extraRolesText)) roles.push('homeroom_teacher');
  if (/רכז|coordinator/i.test(extraRolesText)) roles.push('coordinator');
  if (/מנהל|admin/i.test(extraRolesText)) roles.push('admin');

  const unique = [...new Set(roles.filter(role => VALID_ROLES.includes(role)))];
  return unique.length ? unique : ['student'];
}

export function getInitialWorkRole(user) {
  const roles = getAvailableRoles(user);
  const saved = user?.email ? localStorage.getItem(`workRole:${user.email}`) : null;
  const preferred = saved || user?.active_work_role;
  return roles.includes(preferred) ? preferred : roles[0];
}