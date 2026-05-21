export const ROLE_LABELS = {
  admin: 'מנהל/ת מערכת',
  homeroom_teacher: 'מחנך/ת כיתה',
  coordinator: 'רכז/ת שכבה',
  student: 'תלמיד/ה',
  parent: 'הורה',
};

// תוויות תפקיד לפי לשון פנייה (זכר/נקבה)
export const ROLE_LABELS_BY_GENDER = {
  male: {
    admin: 'מנהל מערכת',
    homeroom_teacher: 'מחנך כיתה',
    coordinator: 'רכז שכבה',
    student: 'תלמיד',
    parent: 'הורה',
  },
  female: {
    admin: 'מנהלת מערכת',
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
    homeroom_teacher: 'מחנך',
    coordinator: 'רכז',
    student: 'תלמיד',
    parent: 'הורה',
  },
  female: {
    admin: 'מנהלת',
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

export function getRoleLabel(role, user) {
  const gender = getUserGender(user);
  if (gender && ROLE_LABELS_BY_GENDER[gender]?.[role]) {
    return ROLE_LABELS_BY_GENDER[gender][role];
  }
  return ROLE_LABELS[role] || 'משתמש';
}

export function getRoleShort(role, user) {
  const gender = getUserGender(user);
  if (gender && ROLE_SHORT_BY_GENDER[gender]?.[role]) {
    return ROLE_SHORT_BY_GENDER[gender][role];
  }
  // ברירת מחדל ניטרלית (זהה ל־ROLE_LABELS אבל מקוצרת)
  const fallback = {
    admin: 'מנהל/ת',
    homeroom_teacher: 'מחנך/ת',
    coordinator: 'רכז/ת',
    student: 'תלמיד/ה',
    parent: 'הורה',
  };
  return fallback[role] || 'משתמש';
}

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
    const klass = user?.profile_homeroom_class || user?.profile_class || '';
    return `${getRoleShort('homeroom_teacher', user)} ${klass}`.trim();
  }

  if (role === 'coordinator' && roles.includes('coordinator')) {
    const grade = user?.profile_grade_managed || '';
    return `${getRoleShort('coordinator', user)} ${grade}`.trim();
  }

  return getRoleLabel(role, user);
}

export function getRoleHomeLabel(user, activeRole) {
  const role = activeRole || getInitialWorkRole(user);

  if (role === 'homeroom_teacher') {
    const klass = user?.profile_homeroom_class || user?.profile_class;
    return klass ? `${getRoleShort('homeroom_teacher', user)} ${klass}` : getRoleLabel('homeroom_teacher', user);
  }

  if (role === 'coordinator') {
    const grade = user?.profile_grade_managed;
    return grade ? `${getRoleShort('coordinator', user)} ${grade}` : getRoleLabel('coordinator', user);
  }

  return getRoleLabel(role, user);
}

export function getRoleDisplayLines(user, activeRole) {
  return [getUserContextLabel(user, activeRole)];
}