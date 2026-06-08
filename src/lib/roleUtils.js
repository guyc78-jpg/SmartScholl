export const ROLE_LABELS = {
  system_admin: 'מנהל/ת מערכת',
  admin: 'מנהל/ת מערכת',
  division_manager: 'מנהל/ת חטיבה',
  homeroom_teacher: 'מחנך/ת כיתה',
  grade_coordinator: 'רכז/ת שכבה',
  coordinator: 'רכז/ת שכבה',
  student: 'תלמיד/ה',
  parent: 'הורה',
};

// תוויות תפקיד לפי לשון פנייה (זכר/נקבה)
export const ROLE_LABELS_BY_GENDER = {
  male: {
    admin: 'מנהל מערכת',
    division_manager: 'מנהל חטיבה',
    homeroom_teacher: 'מחנך כיתה',
    coordinator: 'רכז שכבה',
    student: 'תלמיד',
    parent: 'הורה',
  },
  female: {
    admin: 'מנהלת מערכת',
    division_manager: 'מנהלת חטיבה',
    homeroom_teacher: 'מחנכת כיתה',
    coordinator: 'רכזת שכבה',
    student: 'תלמידה',
    parent: 'הורה',
  },
};

// תווית תפקיד קצרה (ללא ״כיתה״/״שכבה״) – לשימוש לצד שם הכיתה
export const ROLE_SHORT_BY_GENDER = {
  male: {
    admin: 'מנהל',
    division_manager: 'מנהל חטיבה',
    homeroom_teacher: 'מחנך',
    coordinator: 'רכז',
    student: 'תלמיד',
    parent: 'הורה',
  },
  female: {
    admin: 'מנהלת',
    division_manager: 'מנהלת חטיבה',
    homeroom_teacher: 'מחנכת',
    coordinator: 'רכזת',
    student: 'תלמידה',
    parent: 'הורה',
  },
};

export const GENDER_OPTIONS = [
  { value: 'male', label: 'זכר' },
  { value: 'female', label: 'נקבה' },
];

export function getUserGender(user) {
  const value = user?.profile_gender;
  return value === 'male' || value === 'female' ? value : null;
}

// ניסוח אחיד וניטרלי בכל האפליקציה (מנהל/ת, מחנך/ת, רכז/ת) — ללא הבחנת לשון פנייה
export function getRoleLabel(role, user) {
  return ROLE_LABELS[role] || 'משתמש';
}

// תווית קצרה ניטרלית (ללא ״כיתה״/״שכבה״) – לשימוש לצד שם הכיתה
const ROLE_SHORT_NEUTRAL = {
  system_admin: 'מנהל/ת',
  admin: 'מנהל/ת',
  division_manager: 'מנהל/ת חטיבה',
  homeroom_teacher: 'מחנך/ת',
  grade_coordinator: 'רכז/ת',
  coordinator: 'רכז/ת',
  student: 'תלמיד/ה',
  parent: 'הורה',
};

export function getRoleShort(role, user) {
  return ROLE_SHORT_NEUTRAL[role] || 'משתמש';
}

export const VALID_ROLES = ['system_admin', 'admin', 'division_manager', 'homeroom_teacher', 'grade_coordinator', 'coordinator', 'student', 'parent'];
export const SYSTEM_ROLE_PRIORITY = ['system_admin', 'admin', 'division_manager', 'grade_coordinator', 'coordinator', 'homeroom_teacher', 'student', 'parent'];

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
  const isAdmin = roles.includes('system_admin') || roles.includes('admin');
  if (isAdmin && roles.includes('homeroom_teacher') && (!preferred || preferred === 'admin' || preferred === 'system_admin')) return 'homeroom_teacher';
  if (isAdmin && (roles.includes('grade_coordinator') || roles.includes('coordinator')) && (!preferred || preferred === 'admin' || preferred === 'system_admin')) {
    return roles.includes('grade_coordinator') ? 'grade_coordinator' : 'coordinator';
  }
  if (roles.includes(preferred)) return preferred;
  if (roles.includes('homeroom_teacher')) return 'homeroom_teacher';
  if (roles.includes('grade_coordinator')) return 'grade_coordinator';
  if (roles.includes('coordinator')) return 'coordinator';
  return getSystemRole(user);
}

export function getUserDisplayName(user) {
  return user?.displayName || user?.display_name || user?.name || user?.profile_full_name || user?.full_name || user?.email || 'משתמש';
}

export function getUserFirstName(user) {
  return getUserDisplayName(user).split(' ')[0] || 'משתמש';
}

export function getDefaultDisplayRole(user, activeRole) {
  const roles = getAvailableRoles(user);
  const savedDisplay = user?.profile_display_primary_role;
  if (roles.includes(savedDisplay)) return savedDisplay;

  const isAdmin = roles.includes('system_admin') || roles.includes('admin');
  if (isAdmin && roles.includes('homeroom_teacher')) return 'homeroom_teacher';
  if ((activeRole === 'grade_coordinator' || activeRole === 'coordinator' || activeRole === 'homeroom_teacher') && roles.includes(activeRole)) return activeRole;
  if (roles.includes('grade_coordinator')) return 'grade_coordinator';
  if (roles.includes('coordinator')) return 'coordinator';
  if (roles.includes('homeroom_teacher')) return 'homeroom_teacher';
  return getSystemRole(user);
}

export function getDisplayAdditionalRoles(user, primaryRole) {
  const roles = getAvailableRoles(user);
  const saved = Array.isArray(user?.profile_display_additional_roles) ? user.profile_display_additional_roles : [];
  const cleanSaved = saved.filter(role => roles.includes(role) && role !== primaryRole);
  return cleanSaved.length ? cleanSaved : roles.filter(role => role !== primaryRole);
}

export function getRoleContextLabel(user, role) {
  const roles = getAvailableRoles(user);

  if (role === 'homeroom_teacher' && roles.includes('homeroom_teacher')) {
    const klass = user?.profile_homeroom_class || user?.profile_class || user?.profile_homeroom_class_id || user?.profile_class_id || user?.homeroomClassId || '';
    return `${getRoleShort('homeroom_teacher', user)} ${klass}`.trim();
  }

  if ((role === 'grade_coordinator' || role === 'coordinator') && (roles.includes('grade_coordinator') || roles.includes('coordinator'))) {
    const grade = user?.profile_grade_managed || user?.authorization?.scopes_by_role?.grade_coordinator?.gradeId || user?.authorization?.scope?.gradeId || '';
    return `${getRoleShort('grade_coordinator', user)} ${grade}`.trim();
  }

  return getRoleLabel(role, user);
}

export function getUserContextLabel(user, activeRole) {
  return getRoleContextLabel(user, getDefaultDisplayRole(user, activeRole));
}

export function getRoleHomeLabel(user, activeRole) {
  return getUserContextLabel(user, activeRole);
}

export function getRoleDisplayLines(user, activeRole) {
  const primaryRole = getDefaultDisplayRole(user, activeRole);
  const primary = getRoleContextLabel(user, primaryRole);
  const additional = getDisplayAdditionalRoles(user, primaryRole).map(role => getRoleContextLabel(user, role));
  return [primary, ...additional];
}