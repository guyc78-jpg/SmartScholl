// מקור אמת לתצוגת הרשאות בכלי הסימולציה (read-only, תיאורי בלבד)
// תפקידים נתמכים: student, homeroom_teacher, coordinator, division_manager (admin לעיון)

export const SIMULATABLE_ROLES = [
  { value: 'student', label: 'תלמיד/ה' },
  { value: 'homeroom_teacher', label: 'מחנך/ת' },
  { value: 'coordinator', label: 'רכז/ת שכבה' },
  { value: 'division_manager', label: 'מנהל/ת חטיבה' },
];

// רשימת היכולות לכל תא במטריצה
export const CAPABILITIES = [
  { key: 'view', label: 'צפייה' },
  { key: 'add', label: 'הוספה' },
  { key: 'edit', label: 'עריכה' },
  { key: 'delete', label: 'מחיקה' },
  { key: 'manage', label: 'ניהול' },
];

// מודולים (מסכים) באפליקציה
export const MODULES = [
  { key: 'dashboard', label: 'דשבורד / היום שלי', path: '/' },
  { key: 'students', label: 'תלמידים', path: '/students' },
  { key: 'attendance', label: 'מעקב נוכחות', path: '/class-attendance' },
  { key: 'schedule', label: 'מערכת שעות', path: '/schedule' },
  { key: 'exams', label: 'מבחנים ואירועים', path: '/exams' },
  { key: 'performance', label: 'הערכות', path: '/performance' },
  { key: 'discipline', label: 'משמעת', path: '/discipline' },
  { key: 'communications', label: 'יומן תקשורת', path: '/communications' },
  { key: 'tasks', label: 'משימות', path: '/tasks' },
  { key: 'announcements', label: 'הודעות', path: '/announcements' },
  { key: 'community', label: 'מעורבות חברתית', path: '/community' },
  { key: 'reports', label: 'דוחות', path: '/reports' },
  { key: 'treatment', label: 'מרכז טיפול', path: '/treatment-center' },
  { key: 'division', label: 'ניהול חטיבה', path: '/division' },
  { key: 'system', label: 'ניהול מערכת', path: '/users' },
];

// סט יכולות מלא / נפוץ
const ALL = ['view', 'add', 'edit', 'delete', 'manage'];
const CRUD = ['view', 'add', 'edit', 'delete'];
const VIEW = ['view'];
const NONE = [];

// מטריצת הרשאות: module -> role -> [capabilities]
// ההגדרות נגזרות מהיקף התפקיד באפליקציה (כיתה/שכבה/חטיבה)
const MATRIX = {
  dashboard:      { student: VIEW, homeroom_teacher: VIEW, coordinator: VIEW, division_manager: VIEW },
  students:       { student: NONE, homeroom_teacher: CRUD, coordinator: CRUD, division_manager: VIEW },
  attendance:     { student: NONE, homeroom_teacher: CRUD, coordinator: VIEW, division_manager: NONE },
  schedule:       { student: VIEW, homeroom_teacher: CRUD, coordinator: CRUD, division_manager: VIEW },
  exams:          { student: VIEW, homeroom_teacher: CRUD, coordinator: CRUD, division_manager: ALL },
  performance:    { student: NONE, homeroom_teacher: CRUD, coordinator: CRUD, division_manager: VIEW },
  discipline:     { student: NONE, homeroom_teacher: CRUD, coordinator: CRUD, division_manager: VIEW },
  communications: { student: NONE, homeroom_teacher: CRUD, coordinator: CRUD, division_manager: NONE },
  tasks:          { student: NONE, homeroom_teacher: CRUD, coordinator: CRUD, division_manager: NONE },
  announcements:  { student: VIEW, homeroom_teacher: CRUD, coordinator: CRUD, division_manager: NONE },
  community:      { student: VIEW, homeroom_teacher: CRUD, coordinator: CRUD, division_manager: NONE },
  reports:        { student: NONE, homeroom_teacher: VIEW, coordinator: VIEW, division_manager: VIEW },
  treatment:      { student: NONE, homeroom_teacher: CRUD, coordinator: CRUD, division_manager: NONE },
  division:       { student: NONE, homeroom_teacher: NONE, coordinator: NONE, division_manager: ALL },
  system:         { student: NONE, homeroom_teacher: NONE, coordinator: NONE, division_manager: NONE },
};

// היקף פעולה לכל תפקיד (טקסט הסבר)
export const ROLE_SCOPE = {
  student: 'גישה אישית בלבד — צפייה בנתונים האישיים של התלמיד/ה.',
  homeroom_teacher: 'גישה מלאה לכיתת החינוך — ניהול תלמידי הכיתה בלבד.',
  coordinator: 'גישה לכלל כיתות השכבה — ניהול נתוני השכבה.',
  division_manager: 'גישה ברמת החטיבה — מעקב, לוח מבחנים ודוחות חטיבתיים.',
};

export function getModulePermissions(moduleKey, role) {
  return MATRIX[moduleKey]?.[role] || NONE;
}

export function canRoleAccessModule(moduleKey, role) {
  return getModulePermissions(moduleKey, role).length > 0;
}