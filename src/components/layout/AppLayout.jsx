import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

import {
  LayoutDashboard, Users, Calendar, CalendarCheck, BookOpen,
  Megaphone, BarChart2,
  Menu, X, Sun, Moon, BookMarked,
  UserCheck, UserRound, ShieldCheck, Settings, LogOut, Bell, School,
  ChevronDown, Heart, MessageSquare, ClipboardList, AlertTriangle, GraduationCap, Building2, Eye, CalendarClock, RefreshCw, Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvailableRoles, getRoleDisplayLines, getUserDisplayName } from '@/lib/roleUtils';
import { getHomeroomClassLabel } from '@/lib/classIdentity';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
import PushNotificationToggle from '@/components/notifications/PushNotificationToggle';
import { getDashboardLabel } from '@/lib/dashboardLabels';
import RoleIcon from '@/components/ui/RoleIcon';
import { coordinatorHasHomeroom, getUserHomeroomClassId } from '@/lib/schoolStructure';
import { useAuth } from '@/lib/AuthContext';

// ── Accordion nav groups ──────────────────────────────────────────────────────
const sidebarGroups = [
  {
    key: 'division',
    title: 'ניהול חטיבה',
    icon: Building2,
    items: [
      { path: '/division', icon: Building2, label: 'ניהול חטיבה', roles: ['division_manager'] },
      { path: '/division-exams', icon: BookOpen, label: 'לוח מבחנים חכם', roles: ['division_manager'] },
      { path: '/community', icon: Heart, label: 'מעורבות חברתית', roles: ['division_manager'] },
      { path: '/conversations', icon: CalendarClock, label: 'שיחות מתוכננות', roles: ['division_manager'] },
      { path: '/support-agent', icon: Bot, label: 'סוכן תמיכה', roles: ['division_manager'] },
    ],
  },
  {
    key: 'studentZone',
    title: 'האזור שלי',
    icon: GraduationCap,
    items: [
      { path: '/student-home', icon: LayoutDashboard, label: 'היום שלי', roles: ['student'] },
      { path: '/student-schedule', icon: Calendar, label: 'מערכת שעות', roles: ['student'] },
      { path: '/student-exams', icon: BookOpen, label: 'לוח מבחנים', roles: ['student'] },
      { path: '/student-attendance', icon: CalendarCheck, label: 'הנוכחות שלי', roles: ['student'] },
      { path: '/support-agent', icon: Bot, label: 'סוכן תמיכה', roles: ['student'] },
      { path: '/student-more', icon: UserRound, label: 'הפרופיל שלי', roles: ['student'] },
    ],
  },
  {
    key: 'daily',
    title: 'ניהול יומי',
    icon: LayoutDashboard,
    items: [
      { path: '/', icon: LayoutDashboard, label: 'דשבורד', dynamicLabel: true, roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
      { path: '/schedule', icon: Calendar, label: 'מערכת שעות', roles: ['homeroom_teacher', 'grade_coordinator', 'coordinator', 'system_admin', 'admin'] },
      { path: '/tasks', icon: ClipboardList, label: 'משימות', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
    ],
  },
  {
    key: 'pedagogy',
    title: 'פדגוגיה',
    icon: BookOpen,
    items: [
      { path: '/exams', icon: BookOpen, label: 'מבחנים ואירועים', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
      { path: '/performance', icon: GraduationCap, label: 'הערכות', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
      { path: '/treatment-center', icon: ShieldCheck, label: 'מרכז טיפול', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
    ],
  },
  {
    key: 'students',
    title: 'תלמידים',
    icon: Users,
    items: [
      { path: '/students', icon: Users, label: 'רשימת תלמידים', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
      { path: '/classrooms', icon: School, label: 'ניהול שיוכי כיתות', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
      { path: '/class-attendance', icon: CalendarCheck, label: 'נוכחות', roles: ['homeroom_teacher', 'system_admin', 'admin', 'grade_coordinator', 'coordinator'] },
      { path: '/discipline', icon: AlertTriangle, label: 'משמעת', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
      { path: '/community', icon: Heart, label: 'מעורבות חברתית', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
    ],
  },
  {
    key: 'communication',
    title: 'תקשורת',
    icon: MessageSquare,
    items: [
      { path: '/announcements', icon: Megaphone, label: 'הודעות', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
      { path: '/communications', icon: MessageSquare, label: 'יומן תקשורת', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
      { path: '/conversations', icon: CalendarClock, label: 'שיחות מתוכננות', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
      { path: '/support-agent', icon: Bot, label: 'סוכן תמיכה', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
    ],
  },
  {
    key: 'reports',
    title: 'דוחות וניתוח',
    icon: BarChart2,
    items: [
      { path: '/reports', icon: BarChart2, label: 'דוחות', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
      { path: '/grade-monitor', icon: GraduationCap, label: 'מעקב שכבה', roles: ['system_admin', 'admin', 'grade_coordinator', 'coordinator', 'homeroom_teacher'] },
    ],
  },
  {
    key: 'admin',
    title: 'ניהול מערכת',
    icon: Settings,
    adminOnly: true,
    items: [
      { path: '/users', icon: ShieldCheck, label: 'משתמשים מאושרים', roles: ['system_admin', 'admin'] },
      { path: '/classrooms', icon: School, label: 'ניהול שיוכי כיתות', roles: ['system_admin', 'admin'] },
      { path: '/permissions-tester', icon: Eye, label: 'בדיקת הרשאות', roles: ['system_admin', 'admin'] },
      { path: '/bell-schedule', icon: Bell, label: 'צלצולים והפסקות', roles: ['system_admin', 'admin'] },
      { path: '/year-transition', icon: RefreshCw, label: 'מעבר שנת לימודים', roles: ['system_admin'], systemAdminOnly: true },
    ],
  },
];

const teacherBottomNav = [
  { path: '/', icon: LayoutDashboard, label: 'דשבורד', dynamicLabel: true, roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
  { path: '/students', icon: Users, label: 'תלמידים', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
  { path: '/class-attendance', icon: CalendarCheck, label: 'נוכחות', roles: ['homeroom_teacher', 'system_admin', 'admin', 'grade_coordinator', 'coordinator'] },
  { path: '/schedule', icon: Calendar, label: 'מערכת', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
  { path: '/exams', icon: BookOpen, label: 'לוח חכם', roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
];

const studentBottomNav = [
  { path: '/student-home', icon: LayoutDashboard, label: 'היום שלי', roles: ['student'] },
  { path: '/student-schedule', icon: Calendar, label: 'מערכת', roles: ['student'] },
  { path: '/student-exams', icon: BookOpen, label: 'מבחנים', roles: ['student'] },
  { path: '/student-attendance', icon: CalendarCheck, label: 'נוכחות', roles: ['student'] },
  { path: '/student-more', icon: UserRound, label: 'פרופיל', roles: ['student'] },
];

const divisionBottomNav = [
  { path: '/division', icon: Building2, label: 'חטיבה', roles: ['division_manager'] },
  { path: '/division-exams', icon: BookOpen, label: 'לוח חכם', roles: ['division_manager'] },
  { path: '/community', icon: Heart, label: 'מעורבות', roles: ['division_manager'] },
];

const coordinatorDualScopeGroups = [
  {
    key: 'my-class',
    title: 'הכיתה שלי',
    icon: UserCheck,
    items: [
      { path: '/students?scope=class', icon: Users, label: 'תלמידי הכיתה', roles: ['grade_coordinator', 'coordinator'] },
      { path: '/class-attendance?scope=class', icon: CalendarCheck, label: 'מעקב נוכחות', roles: ['grade_coordinator', 'coordinator'] },
      { path: '/tasks?scope=class', icon: ClipboardList, label: 'משימות', roles: ['grade_coordinator', 'coordinator'] },
      { path: '/communications?scope=class', icon: MessageSquare, label: 'שיחות הורים', roles: ['grade_coordinator', 'coordinator'] },
      { path: '/conversations', icon: CalendarClock, label: 'שיחות מתוכננות', roles: ['grade_coordinator', 'coordinator'] },
      { path: '/discipline?scope=class', icon: AlertTriangle, label: 'משמעת', roles: ['grade_coordinator', 'coordinator'] },
      { path: '/community?scope=class', icon: Heart, label: 'מעורבות חברתית', roles: ['grade_coordinator', 'coordinator'] },
    ],
  },
  {
    key: 'my-grade',
    title: 'השכבה שלי',
    icon: GraduationCap,
    items: [
      { path: '/students?scope=grade', icon: Users, label: 'תלמידי השכבה', roles: ['grade_coordinator', 'coordinator'] },
      { path: '/classrooms', icon: School, label: 'ניהול שיוכי כיתות', roles: ['grade_coordinator', 'coordinator'] },
      { path: '/exams?scope=grade', icon: BookOpen, label: 'מבחנים ואירועים', roles: ['grade_coordinator', 'coordinator'] },
      { path: '/community?scope=grade', icon: Heart, label: 'מעורבות חברתית', roles: ['grade_coordinator', 'coordinator'] },
      { path: '/performance?scope=grade', icon: GraduationCap, label: 'הערכות', roles: ['grade_coordinator', 'coordinator'] },
      { path: '/reports?scope=grade', icon: BarChart2, label: 'דוחות', roles: ['grade_coordinator', 'coordinator'] },
      { path: '/grade-monitor?scope=grade', icon: GraduationCap, label: 'מעקב שכבה', roles: ['grade_coordinator', 'coordinator'] },
    ],
  },
];

// ── AccordionGroup ────────────────────────────────────────────────────────────
function AccordionGroup({ group, role, pendingCount, location, onNavigate }) {
  const [open, setOpen] = useState(false);
  const currentPath = `${location.pathname}${location.search}`;
  const hasActive = group.items.some(item => currentPath === item.path || (!item.path.includes('?') && location.pathname === item.path));

  const GroupIcon = group.icon;

  return (
    <div className="space-y-0.5">
      {/* Group header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-colors duration-150 text-right',
          hasActive
            ? 'bg-primary text-primary-foreground font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_16px_hsl(var(--primary)/0.28)]'
            : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
        )}
      >
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 flex-shrink-0 ms-auto',
            'transition-transform duration-300 ease-in-out',
            open ? '-rotate-180' : 'rotate-0'
          )}
        />
        <span className="text-[12px] font-semibold flex-1 text-right">{group.title}</span>
        <GroupIcon className={cn('w-4 h-4 flex-shrink-0', hasActive && 'text-primary-foreground')} />
      </button>

      {/* Children */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pe-0 ps-3 space-y-0.5 pb-1 border-e-2 border-sidebar-border me-1">
              {group.items.map(item => {
                const isActive = currentPath === item.path || (!item.path.includes('?') && location.pathname === item.path);
                const itemLabel = item.dynamicLabel ? getDashboardLabel(role) : item.label;
                const badge = item.path === '/approvals' && pendingCount > 0 ? pendingCount : null;
                return (
                  <Link
                    key={`${group.key}:${item.path}`}
                    to={item.path}
                    onClick={onNavigate}
                    className={cn(
                      'relative flex items-center gap-2 px-3 py-2 rounded-xl transition-colors duration-150',
                      isActive
                        ? 'bg-accent text-accent-foreground font-semibold'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    {isActive && (
                      <span className="absolute start-0 top-1.5 bottom-1.5 w-[3px] bg-sidebar-primary rounded-e-full" />
                    )}
                    <item.icon className={cn('w-3.5 h-3.5 flex-shrink-0', isActive && 'text-sidebar-primary')} />
                    <span className="text-[12.5px] flex-1 text-right">{itemLabel}</span>
                    {badge && (
                      <span className="min-w-4 h-4 px-1 bg-destructive rounded-full text-destructive-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── AppLayout ─────────────────────────────────────────────────────────────────
export default function AppLayout({ children, user, role, darkMode, toggleDark, onRoleChange, simulationOffset = false }) {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeClassRoom, setActiveClassRoom] = useState(null);
  const location = useLocation();

  const approvedRoles = getAvailableRoles(user);
  const activeRole = approvedRoles.includes(role) ? role : null;
  const isActiveDivisionManager = activeRole === 'division_manager';
  const isStaffRole = ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'].includes(activeRole);
  const isApprovedAdmin = approvedRoles.includes('system_admin') || approvedRoles.includes('admin');
  const canAccess = (item) => {
    if (item.systemAdminOnly) return approvedRoles.includes('system_admin');
    return item.roles.includes(activeRole) || (isApprovedAdmin && (item.roles.includes('system_admin') || item.roles.includes('admin')));
  };

  const hasCoordinatorClassScope = ['grade_coordinator', 'coordinator'].includes(activeRole) && coordinatorHasHomeroom(user);
  const sidebarSource = hasCoordinatorClassScope
    ? [
        ...coordinatorDualScopeGroups,
        ...sidebarGroups.filter(group => !['daily', 'students', 'communication', 'reports'].includes(group.key)),
      ]
    : sidebarGroups;

  const navGroups = sidebarSource
    .filter(group => group.key !== 'division' || isActiveDivisionManager)
    .filter(group => !group.adminOnly || isApprovedAdmin)
    .map(group => ({ ...group, items: group.items.filter(canAccess) }))
    .filter(group => group.items.length > 0);

  const bottomNavSource = isActiveDivisionManager ? divisionBottomNav : (isStaffRole ? teacherBottomNav : studentBottomNav);
  const bottomNavItems = bottomNavSource.filter(canAccess);
  const displayName = getUserDisplayName(user);
  const roleDisplayLines = getRoleDisplayLines(user, role);
  const activeHomeroomClassId = getUserHomeroomClassId(user, '');
  const contextLabel = activeRole === 'homeroom_teacher' ? getHomeroomClassLabel(activeClassRoom, user?.profile_homeroom_class || user?.profile_class || '') : roleDisplayLines[0];
  const secondaryContextLabel = roleDisplayLines.slice(1).join(' · ');

  useEffect(() => {
    // Avoid an extra backend call on every navigation; no visible menu item currently uses this badge.
    setPendingCount(0);
  }, [activeRole]);

  useEffect(() => {
    if (!activeHomeroomClassId || activeRole !== 'homeroom_teacher') {
      setActiveClassRoom(null);
      return;
    }
    base44.entities.ClassRoom.list('grade', 500).then(rows => {
      setActiveClassRoom((rows || []).find(item => item.id === activeHomeroomClassId) || null);
    });
  }, [activeHomeroomClassId, activeRole]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full text-right bg-transparent" dir="rtl">
      {/* User */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5" dir="rtl">
          <ProfileAvatar user={user} fallback={displayName?.charAt(0) || '?'} className="w-9 h-9 text-sm flex-shrink-0" />
          <div className="flex-1 min-w-0 text-right">
            <p className="font-semibold text-sm text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-[11px] text-sidebar-foreground/70 truncate flex items-center gap-1.5" dir="rtl">
              <RoleIcon role={activeRole || role} roles={approvedRoles} />
              <span className="truncate">{contextLabel}</span>
            </p>
            {secondaryContextLabel && <p className="text-[10px] text-sidebar-foreground/45 truncate">{secondaryContextLabel}</p>}
          </div>
        </div>
      </div>

      {/* Accordion Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {navGroups.map(group => (
          <AccordionGroup
            key={group.key}
            group={group}
            role={role}
            pendingCount={pendingCount}
            location={location}
            onNavigate={() => setSidebarOpen(false)}
          />
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-0.5">
        {activeRole !== 'student' && (
          <Link
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors',
              location.pathname === '/profile'
                ? 'bg-accent text-accent-foreground font-semibold'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
            )}
          >
            <UserRound className="w-4 h-4 flex-shrink-0" />
            <span className="text-[13px] flex-1 text-right">פרופיל</span>
          </Link>
        )}
        <PushNotificationToggle showUnsupported compact />
        <div className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors',
          darkMode
            ? 'text-sidebar-foreground/90 hover:bg-sidebar-accent/40'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
        )}>
           {darkMode ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
           <span className="text-[13px] flex-1 text-right font-medium">{darkMode ? 'מצב בהיר' : 'מצב כהה'}</span>
           <button
             onClick={toggleDark}
             className={cn(
               'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
               darkMode
                 ? 'bg-primary border border-primary/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]'
                 : 'bg-slate-300 border border-slate-400/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]'
             )}
             aria-label="החלף מצב כהה"
           >
             <span
               className={cn(
                 'absolute top-0.5 w-5 h-5 rounded-full transition-transform',
                 darkMode
                   ? 'bg-slate-100 start-0.5 shadow-md'
                   : 'bg-white border border-slate-300 start-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.25)]'
               )}
             />
           </button>
         </div>
        <button
          onClick={() => logout(false)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="text-[13px] flex-1 text-right">התנתקות</span>
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="flex overflow-hidden text-right"
      dir="rtl"
      style={simulationOffset
        ? { height: 'calc(100vh - 44px)', marginTop: 'calc(44px + env(safe-area-inset-top))' }
        : { height: '100vh' }}
    >
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-shrink-0 py-3 ps-0 pe-3">
        <div className="liquid-sheet flex w-64 flex-col rounded-[1.75rem] border border-border/55 overflow-hidden h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 lg:hidden bg-foreground/25 backdrop-blur-md"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="liquid-sheet fixed top-2 bottom-2 start-2 w-[min(21rem,86vw)] z-50 lg:hidden rounded-[1.75rem] border border-border/55 overflow-hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="סגור תפריט"
              className="absolute top-2 end-2 w-11 h-11 flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground rounded-lg hover:bg-sidebar-accent active:bg-sidebar-accent/80 touch-manipulation z-10">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="liquid-sheet lg:hidden relative z-30 flex items-center justify-between px-3 h-[60px] border-b border-border/40 flex-shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="פתח תפריט"
            className="w-11 h-11 flex items-center justify-center text-foreground rounded-lg hover:bg-muted active:bg-muted/80 touch-manipulation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 min-w-0 pointer-events-none">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <BookMarked className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-foreground text-[13px]">ניהול כיתת חינוך</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleDark}
              aria-label={darkMode ? 'מצב בהיר' : 'מצב כהה'}
              className="w-11 h-11 flex items-center justify-center bg-transparent border-0 shadow-none hover:bg-transparent active:bg-transparent focus:bg-transparent text-foreground/70 dark:text-foreground/80 touch-manipulation"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden text-right will-change-scroll" dir="rtl"
          style={{ paddingBottom: 'calc(var(--app-bottom-nav-height) + 24px + env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {children}
        </main>

        {/* Mobile Bottom Nav */}
         <nav className="liquid-sheet lg:hidden fixed bottom-2 inset-x-3 grid border border-border/55 rounded-[26px] z-30 overflow-hidden" dir="rtl"
         style={{
           gridTemplateColumns: `repeat(${bottomNavItems.length}, minmax(0, 1fr))`,
           paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
           paddingTop: '7px',
           paddingInline: '8px',
           minHeight: 'calc(70px + env(safe-area-inset-bottom))',
         }}>
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const itemLabel = item.dynamicLabel ? getDashboardLabel(role) : item.label;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl transition-all min-w-0 text-center',
                  isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted/40'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-10 h-6 rounded-full transition-colors flex-shrink-0',
                  isActive && 'bg-primary/12 shadow-inner'
                )}>
                  <item.icon className="w-4 h-4" strokeWidth={isActive ? 2.4 : 2} />
                </div>
                <span
                  className={cn(
                    'leading-tight w-full text-center px-0.5',
                    isActive ? 'font-bold' : 'font-medium'
                  )}
                  style={{ fontSize: '10.5px', lineHeight: '1.1' }}
                >
                  {itemLabel}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}