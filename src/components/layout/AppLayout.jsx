import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

import {
  LayoutDashboard, Users, Calendar, CalendarCheck, BookOpen,
  Megaphone, BarChart2,
  Menu, X, Sun, Moon, BookMarked,
  UserCheck, UserRound, ShieldCheck, Settings, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import WorkModeSelector from '@/components/layout/WorkModeSelector';
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
      { path: '/reports', icon: BarChart2, label: 'דוחות', roles: ['admin', 'homeroom_teacher', 'coordinator'] },
      { path: '/announcements', icon: Megaphone, label: 'הודעות', roles: ['admin', 'homeroom_teacher', 'coordinator', 'student', 'parent'] },
      { path: '/profile', icon: UserRound, label: 'פרופיל', roles: ['admin', 'homeroom_teacher', 'coordinator', 'student', 'parent'] },
    ],
  },
  {
    title: 'ניהול מערכת',
    adminOnly: true,
    items: [
      { path: '/approvals', icon: UserCheck, label: 'אישורי הרשמה', roles: ['admin'] },
      { path: '/users', icon: ShieldCheck, label: 'הרשאות משתמשים', roles: ['admin'] },
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
    if (!approvedRoles.includes('admin')) {
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
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 bg-primary/15 rounded-lg flex items-center justify-center text-sidebar-primary font-bold text-sm flex-shrink-0">
            {displayName?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-[11px] text-sidebar-foreground/60 truncate">{contextLabel}</p>
          </div>
        </div>
        <WorkModeSelector user={user} activeRole={role} onRoleChange={onRoleChange} />
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
      <aside className="hidden lg:flex w-56 bg-sidebar flex-col flex-shrink-0 border-s border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed right-0 top-0 h-full w-72 bg-sidebar z-50 lg:hidden shadow-2xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 start-4 w-8 h-8 flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground rounded-lg hover:bg-sidebar-accent">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header — compact */}
        <header className="lg:hidden flex items-center justify-between px-3 h-12 bg-card/95 backdrop-blur border-b border-border flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="w-8 h-8 flex items-center justify-center text-foreground rounded-lg hover:bg-muted transition-colors">
            <Menu className="w-4.5 h-4.5" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <BookMarked className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-foreground text-[13px]">ניהול כיתה חכם</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="w-8 h-8 flex items-center justify-center text-muted-foreground rounded-lg hover:bg-muted transition-colors">
            {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto text-right" dir="rtl" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 grid bg-card/95 backdrop-blur border-t border-border z-30 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]" dir="rtl"
          style={{ gridTemplateColumns: `repeat(${bottomNavItems.length}, minmax(0, 1fr))`, paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: '6px', paddingInline: '4px', minHeight: '60px' }}>
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const itemLabel = item.dynamicLabel ? getDashboardLabel(role) : item.label;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors min-w-0',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-9 h-7 rounded-full transition-colors',
                  isActive && 'bg-primary/10'
                )}>
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={isActive ? 2.4 : 2} />
                </div>
                <span className={cn('text-[10px] leading-tight whitespace-nowrap', isActive ? 'font-bold' : 'font-medium')}>{itemLabel}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}