export const ROLE_LABELS = {
  admin: 'מנהל/ת מערכת',
  homeroom_teacher: 'מחנך/ת כיתה',
  coordinator: 'רכז/ת שכבה',
  student: 'תלמיד/ה',
  parent: 'הורה',
};

export const VALID_ROLES = ['admin', 'homeroom_teacher', 'coordinator', 'student', 'parent'];
export const SYSTEM_ROLE_PRIORITY = ['admin', 'coordinator', 'homeroom_teacher', 'student', 'parent'];

export function parseRoles(value) {
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

export function hasApprovedRole(user, role) {
  return getAvailableRoles(user).includes(role);
}

export function getSystemRole(user) {
  const roles = getAvailableRoles(user);
  return SYSTEM_ROLE_PRIORITY.find(role => roles.includes(role)) || 'student';
}

export function getEducationalRoles(user) {
  const roles = getAvailableRoles(user);
  return roles.filter(role => ['homeroom_teacher', 'coordinator', 'student', 'parent'].includes(role));
}

export function getInitialWorkRole(user) {
  const roles = getAvailableRoles(user);
  const saved = user?.email ? localStorage.getItem(`workRole:${user.email}`) : null;
  const preferred = saved || user?.active_work_role;
  return roles.includes(preferred) ? preferred : getSystemRole(user);
}

export function getUserDisplayName(user) {
  return user?.displayName || user?.display_name || user?.name || user?.profile_full_name || user?.full_name || user?.email || 'משתמש';
}

export function getUserFirstName(user) {
  return getUserDisplayName(user).split(' ')[0] || 'משתמש';
}

export function getRoleDisplayLines(user, activeRole) {
  const roles = getAvailableRoles(user);
  const lines = [`תפקיד ראשי: ${ROLE_LABELS[getSystemRole(user)] || 'משתמש'}`];

  const extraRoles = roles.filter(role => role !== getSystemRole(user));
  if (extraRoles.length) {
    lines.push(`תפקידים נוספים: ${extraRoles.map(role => ROLE_LABELS[role]).join(', ')}`);
  }

  if (roles.includes('homeroom_teacher')) {
    lines.push(`כיתה משויכת: ${user?.profile_homeroom_class || user?.profile_class || '___'}`);
  }

  if (roles.includes('coordinator')) {
    lines.push(`שכבה משויכת: ${user?.profile_grade_managed || '___'}`);
  }

  return lines.length ? lines : [ROLE_LABELS[activeRole || user?.role] || 'משתמש'];
}