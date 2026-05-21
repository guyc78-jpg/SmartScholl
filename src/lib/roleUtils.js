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
  if (roles.includes('admin') && roles.includes('homeroom_teacher') && (!preferred || preferred === 'admin')) return 'homeroom_teacher';
  if (roles.includes('admin') && roles.includes('coordinator') && (!preferred || preferred === 'admin')) return 'coordinator';
  if (roles.includes(preferred)) return preferred;
  if (roles.includes('homeroom_teacher')) return 'homeroom_teacher';
  if (roles.includes('coordinator')) return 'coordinator';
  return getSystemRole(user);
}

export function getUserDisplayName(user) {
  return user?.displayName || user?.display_name || user?.name || user?.profile_full_name || user?.full_name || user?.email || 'משתמש';
}

export function getUserFirstName(user) {
  return getUserDisplayName(user).split(' ')[0] || 'משתמש';
}

export function getUserContextLabel(user, activeRole) {
  const roles = getAvailableRoles(user);
  const role = activeRole || getInitialWorkRole(user);

  if (role === 'homeroom_teacher' && roles.includes('homeroom_teacher')) {
    return `${ROLE_LABELS.homeroom_teacher} ${user?.profile_homeroom_class || user?.profile_class || ''}`.trim();
  }

  if (role === 'coordinator' && roles.includes('coordinator')) {
    return `${ROLE_LABELS.coordinator} ${user?.profile_grade_managed || ''}`.trim();
  }

  return ROLE_LABELS[role] || 'משתמש';
}

export function getRoleHomeLabel(user, activeRole) {
  const role = activeRole || getInitialWorkRole(user);

  if (role === 'homeroom_teacher') {
    return user?.profile_homeroom_class || user?.profile_class
      ? `מחנך ${user?.profile_homeroom_class || user?.profile_class}`
      : 'מחנך/ת כיתה';
  }

  if (role === 'coordinator') {
    return user?.profile_grade_managed
      ? `רכז ${user.profile_grade_managed}`
      : 'רכז/ת שכבה';
  }

  return ROLE_LABELS[role] || 'משתמש';
}

export function getRoleDisplayLines(user, activeRole) {
  return [getUserContextLabel(user, activeRole)];
}