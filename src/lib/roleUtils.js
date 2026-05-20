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

  const unique = [...new Set(roles.filter(role => VALID_ROLES.includes(role)))];
  return unique.length ? unique : ['student'];
}

export function getInitialWorkRole(user) {
  const roles = getAvailableRoles(user);
  const saved = user?.email ? localStorage.getItem(`workRole:${user.email}`) : null;
  const preferred = saved || user?.active_work_role;
  return roles.includes(preferred) ? preferred : roles[0];
}

export function getUserDisplayName(user) {
  return user?.profile_full_name || user?.full_name || 'משתמש';
}

export function getRoleDisplayLines(user, activeRole) {
  const roles = getAvailableRoles(user);
  const lines = [];

  if (roles.includes('homeroom_teacher')) {
    lines.push(`מחנך/ת כיתה ${user?.profile_homeroom_class || user?.profile_class || '___'}`);
  }

  if (roles.includes('coordinator')) {
    lines.push(`רכז/ת שכבה ${user?.profile_grade_managed || '___'}`);
  }

  if (lines.length) return lines;
  return [ROLE_LABELS[activeRole || user?.role] || 'משתמש'];
}