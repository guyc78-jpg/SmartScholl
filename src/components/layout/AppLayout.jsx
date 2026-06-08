import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

import {
  LayoutDashboard, Users, Calendar, CalendarCheck, BookOpen,
  Megaphone, BarChart2,
  Menu, X, Sun, Moon, BookMarked,
  UserCheck, UserRound, ShieldCheck, Settings, LogOut, Bell, School,
  ChevronDown, Heart, MessageSquare, ClipboardList, AlertTriangle, GraduationCap, Building2, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvailableRoles, getUserContextLabel, getUserDisplayName } from '@/lib/roleUtils';
import { getDashboardLabel } from '@/lib/dashboardLabels';
import { coordinatorHasHomeroom } from '@/lib/schoolStructure';

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
    ],
  },
  {
    key: 'daily',
    title: 'ניהול יומי',
    icon: LayoutDashboard,
    items: [
      { path: '/', icon: LayoutDashboard, label: 'דשבורד', dynamicLabel: true, roles: ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'] },
      { path: '/student-home', icon: LayoutDashboard, label: 'היום שלי', roles: ['student'] },
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
      { path: '/permissions-tester', icon: Eye, label: 'בדיקת הרשאות', roles: ['system_admin', 'admin'] },
      { path: '/classrooms', icon: School, label: 'ניהול כיתות', roles: ['system_admin', 'admin'] },
      { path: '/bell-schedule', icon: Bell, label: 'צלצולים והפסקות', roles: ['system_admin', 'admin'] },
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
  { path: '/student-home', icon: LayoutDashboard, label: 'היום שלי', dynamicLabel: true, roles: ['student'] },
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
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors duration-150 text-right',
          hasActive
            ? 'bg-accent text-accent-foreground font-semibold'
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
        <GroupIcon className={cn('w-4 h-4 flex-shrink-0', hasActive && 'text-sidebar-primary')} />
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
                      'relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors duration-150',
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  const approvedRoles = getAvailableRoles(user);
  const activeRole = approvedRoles.includes(role) ? role : null;
  const isActiveDivisionManager = activeRole === 'division_manager';
  const isStaffRole = ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'].includes(activeRole);
  const isApprovedAdmin = approvedRoles.includes('system_admin') || approvedRoles.includes('admin');
  const canAccess = (item) => item.roles.includes(activeRole) || (isApprovedAdmin && (item.roles.includes('system_admin') || item.roles.includes('admin')));

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
  const contextLabel = getUserContextLabel(user, role);

  useEffect(() => {
    if (!['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'].includes(activeRole)) {
      setPendingCount(0);
      return;
    }
    base44.functions.invoke('handleApprovalRequest', { action: 'get_pending' })
      .then(res => setPendingCount((res.data.pending || []).filter(r => r.status === 'pending').length))
      .catch(() => {});
  }, [activeRole]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full text-right" dir="rtl">
      {/* User */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary/15 rounded-lg flex items-center justify-center text-sidebar-primary font-bold text-sm flex-shrink-0">
            {displayName?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="font-semibold text-sm text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-[11px] text-sidebar-foreground/60 truncate">{contextLabel}</p>
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
          onClick={() => base44.auth.logout('/')}
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
      className="flex bg-background overflow-hidden"
      dir="rtl"
      style={simulationOffset
        ? { height: 'calc(100vh - 44px)', marginTop: 'calc(44px + env(safe-area-inset-top))' }
        : { height: '100vh' }}
    >
      {/* Desktop Sidebar */}
      <aside className={cn(
        'hidden lg:flex w-60 flex-col flex-shrink-0 border-s',
        darkMode
          ? 'bg-slate-700 border-slate-600/40'
          : 'bg-sidebar border-sidebar-border'
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div
            className={cn(
              'fixed inset-0 z-40 lg:hidden',
              darkMode ? 'bg-black/60' : 'bg-black/50'
            )}
            onClick={() => setSidebarOpen(false)}
          />
          <aside className={cn(
            'fixed inset-y-0 start-0 w-72 z-50 lg:hidden border-s',
            darkMode
              ? 'bg-slate-700 border-slate-600/40 shadow-[0_0_40px_rgba(0,0,0,0.5)]'
              : 'bg-sidebar border-sidebar-border shadow-2xl'
          )}>
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
        <header className="lg:hidden relative z-30 flex items-center justify-between px-2 h-14 bg-card border-b border-border flex-shrink-0">
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
          <button
            type="button"
            onClick={toggleDark}
            aria-label={darkMode ? 'מצב בהיר' : 'מצב כהה'}
            className="w-11 h-11 flex items-center justify-center bg-transparent border-0 shadow-none hover:bg-transparent active:bg-transparent focus:bg-transparent text-foreground/70 dark:text-foreground/80 touch-manipulation"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden text-right will-change-scroll" dir="rtl"
          style={{ paddingBottom: 'calc(76px + env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}>
          {children}
        </main>

        {/* Mobile Bottom Nav */}
         <nav className="lg:hidden fixed bottom-0 inset-x-0 grid bg-card border-t border-border z-30" dir="rtl"
          style={{
            gridTemplateColumns: `repeat(${bottomNavItems.length}, minmax(0, 1fr))`,
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingTop: '8px',
            paddingInline: '12px',
            minHeight: 'calc(72px + env(safe-area-inset-bottom))',
          }}>
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const itemLabel = item.dynamicLabel ? getDashboardLabel(role) : item.label;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-1.5 transition-colors min-w-0 text-center',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
                style={{ transform: 'translateY(-8px)' }}
              >
                <div className={cn(
                  'flex items-center justify-center w-10 h-6 rounded-full transition-colors flex-shrink-0',
                  isActive && 'bg-primary/10'
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