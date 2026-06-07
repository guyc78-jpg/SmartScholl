/**
 * Role-based permission system
 * Roles: admin, homeroom_teacher, coordinator, student, parent
 * Admin and coordinator see everything teachers see; students/parents see limited views.
 */

export const ROLES = {
  ADMIN: 'system_admin',
  DIVISION_MANAGER: 'division_manager',
  TEACHER: 'homeroom_teacher',
  COORDINATOR: 'grade_coordinator',
  STUDENT: 'student',
  PARENT: 'parent',
};

// Routes each role can access
export const ROLE_ROUTES = {
  system_admin:     ['/', '/students', '/attendance', '/class-attendance', '/schedule', '/exams', '/discipline', '/communications', '/tasks', '/announcements', '/community', '/performance', '/reports', '/users', '/classrooms', '/bell-schedule'],
  admin:            ['/', '/students', '/attendance', '/class-attendance', '/schedule', '/exams', '/discipline', '/communications', '/tasks', '/announcements', '/community', '/performance', '/reports', '/users', '/classrooms', '/bell-schedule'],
  division_manager: ['/division', '/exams', '/reports', '/grade-monitor'],
  homeroom_teacher: ['/', '/students', '/attendance', '/class-attendance', '/schedule', '/exams', '/discipline', '/communications', '/tasks', '/announcements', '/community', '/performance', '/reports'],
  grade_coordinator:['/', '/students', '/attendance', '/schedule', '/exams', '/discipline', '/communications', '/tasks', '/announcements', '/community', '/performance', '/reports'],
  coordinator:      ['/', '/students', '/attendance', '/schedule', '/exams', '/discipline', '/communications', '/tasks', '/announcements', '/community', '/performance', '/reports'],
  student:          ['/student-home', '/schedule', '/exams', '/announcements', '/community'],
  parent:           ['/announcements'],
};

// Which roles are "staff" (teacher-side)
export function isStaff(role) {
  return ['system_admin', 'admin', 'division_manager', 'homeroom_teacher', 'grade_coordinator', 'coordinator'].includes(role);
}

// Is this role a division manager?
export function isDivisionManager(role) {
  return role === 'division_manager';
}

export function isStudent(role) {
  return role === 'student';
}

// Can this role perform write actions (create/edit/delete)?
export function canWrite(role) {
  return isStaff(role);
}

// Can this role see sensitive student data (notes, discipline details)?
export function canViewSensitive(role) {
  return isStaff(role);
}

// Default landing page per role
export function defaultRoute(role) {
  if (isStudent(role)) return '/student-home';
  if (role === 'parent') return '/announcements';
  if (role === 'division_manager') return '/division';
  if (role === 'system_admin') return '/';
  return '/';
}