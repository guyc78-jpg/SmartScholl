import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

import {
  LayoutDashboard, Users, Calendar, BookOpen,
  Megaphone, BarChart2,
  Menu, X, Sun, Moon, BookMarked,
  FileText, UserCheck, UserRound, ShieldCheck, Settings, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import WorkModeSelector from '@/components/layout/WorkModeSelector';
import { getRoleDisplayLines, getUserDisplayName } from '@/lib/roleUtils';

const sidebarNav = [
  { path: '/profile', icon: UserRound, label: 'פרופיל', roles: ['admin', 'homeroom_teacher', 'coordinator', 'student', 'parent'] },
  { path: '/announcements', icon: Megaphone, label: 'הודעות', roles: ['admin', 'homeroom_teacher', 'coordinator', 'student', 'parent'] },
  { path: '/reports', icon: BarChart2, label: 'דוחות', roles: ['admin', 'homeroom_teacher', 'coordinator'] },
  { path: '/grade-monitor', icon: FileText, label: 'מעקב שכבה', roles: ['admin', 'coordinator'] },
  { path: '/approvals', icon: UserCheck, label: 'אישורי הרשמה', roles: ['admin'] },
  { path: '/users', icon: ShieldCheck, label: 'הרשאות משתמשים', roles: ['admin'] },
];

const teacherBottomNav = [
  { path: '/', icon: LayoutDashboard, label: 'דשבורד', roles: ['admin', 'homeroom_teacher', 'coordinator'] },
  { path: '/students', icon: Users, label: 'תלמידים', roles: ['admin', 'homeroom_teacher', 'coordinator'] },
  { path: '/class-attendance', icon: Users, label: 'נוכחות', roles: ['admin', 'homeroom_teacher'] },
  { path: '/schedule', icon: Calendar, label: 'מערכת', roles: ['admin', 'homeroom_teacher', 'coordinator'] },
  { path: '/exams', icon: BookOpen, label: 'מבחנים', roles: ['admin', 'homeroom_teacher', 'coordinator'] },
];

const studentBottomNav = [
  { path: '/student-home', icon: LayoutDashboard, label: 'דשבורד', roles: ['student'] },
  { path: '/schedule', icon: Calendar, label: 'מערכת', roles: ['student'] },
  { path: '/exams', icon: BookOpen, label: 'מבחנים', roles: ['student'] },
];

const roleLabels = {
  homeroom_teacher: 'מחנך/ת כיתה',
  coordinator: 'רכז/ת שכבה',
  admin: 'מנהל/ת',
  student: 'תלמיד/ה',
  parent: 'הורה',
};

export default function AppLayout({ children, user, role, darkMode, setDarkMode, onRoleChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  const isStaffRole = ['admin', 'homeroom_teacher', 'coordinator'].includes(role);
  const navItems = sidebarNav.filter(item => item.roles.includes(role));
  const bottomNavItems = (role === 'student' ? studentBottomNav : teacherBottomNav).filter(item => item.roles.includes(role));
  const displayName = getUserDisplayName(user);
  const roleLines = getRoleDisplayLines(user, role);

  useEffect(() => {
    if (role !== 'admin') {
      setPendingCount(0);
      return;
    }
    base44.functions.invoke('handleApprovalRequest', { action: 'get_pending' })
      .then(res => setPendingCount((res.data.pending || []).filter(r => r.status === 'pending').length))
      .catch(() => {});
  }, [role]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full text-right" dir="rtl">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base text-sidebar-foreground">כיתה חכמה</h1>
            <p className="text-xs text-sidebar-foreground/50">ניהול כיתת חינוך</p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center text-sidebar-primary font-bold text-sm flex-shrink-0">
            {displayName?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-sidebar-foreground truncate">{displayName}</p>
            <div className="space-y-0.5">
              {roleLines.map((line, index) => (
                <p key={index} className="text-xs text-sidebar-foreground/50 leading-tight">{line}</p>
              ))}
            </div>
          </div>
          <button onClick={() => setDarkMode(!darkMode)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors flex-shrink-0">
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
        <WorkModeSelector user={user} activeRole={role} onRoleChange={onRoleChange} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const badge = item.path === '/approvals' && pendingCount > 0 ? pendingCount : null;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150',
                isActive
                  ? 'bg-sidebar-primary text-white shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {badge && (
                <span className="w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-0.5">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium flex-1 text-right">הגדרות תצוגה</span>
        </button>
        <button
          onClick={() => base44.auth.logout('/')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium flex-1 text-right">התנתקות</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 bg-sidebar flex-col flex-shrink-0 border-l border-sidebar-border">
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
              className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground rounded-lg hover:bg-sidebar-accent">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-card border-b border-border flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center text-foreground rounded-lg hover:bg-muted transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <BookMarked className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground text-sm">כיתה חכמה</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="w-9 h-9 flex items-center justify-center text-muted-foreground rounded-lg hover:bg-muted transition-colors">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto text-right" dir="rtl" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 grid bg-card border-t border-border z-30" dir="rtl"
          style={{ gridTemplateColumns: `repeat(${bottomNavItems.length}, minmax(0, 1fr))`, paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: '8px', paddingInline: '12px', minHeight: '64px' }}>
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all min-w-0',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-[11px] font-semibold leading-tight whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}