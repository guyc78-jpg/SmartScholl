import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

import {
  LayoutDashboard, Users, Calendar, CalendarCheck, BookOpen,
  Megaphone, BarChart2,
  Menu, X, Sun, Moon, BookMarked,
  UserCheck, UserRound, ShieldCheck, Settings, LogOut, Bell, School
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvailableRoles, getUserContextLabel, getUserDisplayName } from '@/lib/roleUtils';
import { getDashboardLabel } from '@/lib/dashboardLabels';

const sidebarGroups = [
  {
    title: 'עבודה שוטפת',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'הכיתה שלי', dynamicLabel: true, roles: ['admin', 'homeroom_teacher', 'coordinator'] },
      { path: '/student-home', icon: LayoutDashboard, label: 'היום שלי', roles: ['student'] },
      { path: '/students', icon: Users, label: 'תלמידים', roles: ['admin', 'homeroom_teacher', 'coordinator'] },
      { path: '/class-attendance', icon: CalendarCheck, label: 'מעקב נוכחות', roles: ['homeroom_teacher', 'admin', 'coordinator'] },
      { path: '/schedule', icon: Calendar, label: 'מערכת שעות', roles: ['homeroom_teacher', 'coordinator', 'student'] },
      { path: '/exams', icon: BookOpen, label: 'מבחנים', roles: ['admin', 'homeroom_teacher', 'coordinator', 'student'] },
      { path: '/treatment-center', icon: ShieldCheck, label: 'מרכז טיפול', roles: ['admin', 'homeroom_teacher', 'coordinator'] },
      { path: '/reports', icon: BarChart2, label: 'דוחות', roles: ['admin', 'homeroom_teacher', 'coordinator'] },
      { path: '/announcements', icon: Megaphone, label: 'הודעות', roles: ['admin', 'homeroom_teacher', 'coordinator', 'student', 'parent'] },
      { path: '/profile', icon: UserRound, label: 'פרופיל', roles: ['admin', 'homeroom_teacher', 'coordinator', 'student', 'parent'] },
    ],
  },
  {
    title: 'ניהול מערכת',
    items: [
      { path: '/approvals', icon: UserCheck, label: 'אישורים', roles: ['admin', 'homeroom_teacher', 'coordinator'] },
      { path: '/approved-staff', icon: UserCheck, label: 'צוות מאושר', roles: ['admin'] },
      { path: '/users', icon: ShieldCheck, label: 'הרשאות משתמשים', roles: ['admin'] },
      { path: '/classrooms', icon: School, label: 'ניהול כיתות', roles: ['admin'] },
      { path: '/bell-schedule', icon: Bell, label: 'צלצולים והפסקות', roles: ['admin'] },
    ],
  },
];

const teacherBottomNav = [
  { path: '/', icon: LayoutDashboard, label: 'דשבורד', dynamicLabel: true, roles: ['admin', 'homeroom_teacher', 'coordinator'] },
  { path: '/students', icon: Users, label: 'תלמידים', roles: ['admin', 'homeroom_teacher', 'coordinator'] },
  { path: '/class-attendance', icon: Users, label: 'נוכחות', roles: ['homeroom_teacher'] },
  { path: '/schedule', icon: Calendar, label: 'מערכת', roles: ['admin', 'homeroom_teacher', 'coordinator'] },
  { path: '/exams', icon: BookOpen, label: 'מבחנים', roles: ['admin', 'homeroom_teacher', 'coordinator'] },
];

const studentBottomNav = [
  { path: '/student-home', icon: LayoutDashboard, label: 'היום שלי', dynamicLabel: true, roles: ['student'] },
  { path: '/schedule', icon: Calendar, label: 'מערכת', roles: ['student'] },
  { path: '/exams', icon: BookOpen, label: 'מבחנים', roles: ['student'] },
];

export default function AppLayout({ children, user, role, darkMode, setDarkMode, onRoleChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  const approvedRoles = getAvailableRoles(user);
  const isStaffRole = approvedRoles.some(item => ['admin', 'homeroom_teacher', 'coordinator'].includes(item));
  const canAccess = (item) => item.roles.some(itemRole => approvedRoles.includes(itemRole));
  const navGroups = sidebarGroups
    .filter(group => !group.adminOnly || approvedRoles.includes('admin'))
    .map(group => ({ ...group, items: group.items.filter(canAccess) }))
    .filter(group => group.items.length > 0);
  const bottomNavItems = (isStaffRole ? teacherBottomNav : studentBottomNav).filter(canAccess);
  const displayName = getUserDisplayName(user);
  const contextLabel = getUserContextLabel(user, role);

  useEffect(() => {
    if (!approvedRoles.some(role => ['admin', 'homeroom_teacher', 'coordinator'].includes(role))) {
      setPendingCount(0);
      return;
    }
    base44.functions.invoke('handleApprovalRequest', { action: 'get_pending' })
      .then(res => setPendingCount((res.data.pending || []).filter(r => r.status === 'pending').length))
      .catch(() => {});
  }, [approvedRoles.join(',')]);

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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {group.adminOnly && (
              <p className="px-2 pb-1 text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-wider">{group.title}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                const itemLabel = item.dynamicLabel ? getDashboardLabel(role) : item.label;
                const badge = item.path === '/approvals' && pendingCount > 0 ? pendingCount : null;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'relative flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors duration-150',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                        : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                    )}
                  >
                    {isActive && (
                      <span className="absolute right-0 top-1.5 bottom-1.5 w-[3px] bg-sidebar-primary rounded-l-full" />
                    )}
                    <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive && 'text-sidebar-primary')} />
                    <span className="text-[13px] flex-1 text-right">{itemLabel}</span>
                    {badge && (
                      <span className="min-w-4 h-4 px-1 bg-destructive rounded-full text-destructive-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-sidebar-border space-y-0.5">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
          <span className="text-[13px] flex-1 text-right">{darkMode ? 'מצב בהיר' : 'מצב כהה'}</span>
        </button>
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
    <div className="flex h-screen bg-background overflow-hidden" dir="rtl">
      {/* Desktop Sidebar */}
       <aside className={cn(
         'hidden lg:flex w-56 flex-col flex-shrink-0 border-s',
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
             'fixed right-0 top-0 h-full w-72 z-50 lg:hidden border-s',
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
        {/* Mobile Header — compact */}
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
            onClick={() => setDarkMode(!darkMode)}
            aria-label={darkMode ? 'מצב בהיר' : 'מצב כהה'}
            className="w-11 h-11 flex items-center justify-center bg-transparent border-0 shadow-none hover:bg-transparent active:bg-transparent focus:bg-transparent text-foreground/70 dark:text-foreground/80 touch-manipulation"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden text-right will-change-scroll" dir="rtl" style={{ paddingBottom: 'calc(76px + env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}>
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 grid bg-card border-t border-border z-30" dir="rtl"
          style={{
            gridTemplateColumns: `repeat(${bottomNavItems.length}, minmax(0, 1fr))`,
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingTop: '8px',
            paddingInline: '2px',
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
                  'flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 transition-colors min-w-0 text-center',
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