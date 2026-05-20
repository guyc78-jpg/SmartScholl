import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, BookOpen, Shield,
  MessageSquare, CheckSquare, Megaphone, BarChart2,
  Clock, Heart, ChevronRight, Menu, X, Sun, Moon, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const teacherNav = [
  { path: '/', icon: LayoutDashboard, label: 'דשבורד' },
  { path: '/students', icon: Users, label: 'תלמידים' },
  { path: '/attendance', icon: Clock, label: 'נוכחות' },
  { path: '/schedule', icon: Calendar, label: 'מערכת שעות' },
  { path: '/exams', icon: BookOpen, label: 'מבחנים' },
  { path: '/community', icon: Heart, label: 'מעורבות חברתית' },
  { path: '/discipline', icon: Shield, label: 'משמעת' },
  { path: '/performance', icon: BarChart2, label: 'תפקוד' },
  { path: '/communications', icon: MessageSquare, label: 'תקשורת' },
  { path: '/tasks', icon: CheckSquare, label: 'משימות' },
  { path: '/announcements', icon: Megaphone, label: 'הודעות' },
  { path: '/reports', icon: BarChart2, label: 'דוחות' },
];

const studentNav = [
  { path: '/student-home', icon: LayoutDashboard, label: 'היום שלי' },
  { path: '/schedule', icon: Calendar, label: 'מערכת שעות' },
  { path: '/exams', icon: BookOpen, label: 'מבחנים' },
  { path: '/announcements', icon: Megaphone, label: 'הודעות' },
  { path: '/community', icon: Heart, label: 'מעורבות חברתית' },
];

const parentNav = [
  { path: '/parent-home', icon: LayoutDashboard, label: 'עדכונים' },
  { path: '/announcements', icon: Megaphone, label: 'הודעות' },
];

export default function AppLayout({ children, user, role, darkMode, setDarkMode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = role === 'student' ? studentNav : role === 'parent' ? parentNav : teacherNav;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-sidebar-foreground">כיתה חכמה</h1>
            <p className="text-xs text-sidebar-foreground/60">ניהול כיתה חינוך</p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center text-sidebar-primary font-bold text-sm">
            {user?.full_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-sidebar-foreground truncate">{user?.full_name || 'משתמש'}</p>
            <p className="text-xs text-sidebar-foreground/50">
              {role === 'homeroom_teacher' ? 'מחנך/ת כיתה' : role === 'coordinator' ? 'רכז/ת שכבה' : role === 'student' ? 'תלמיד/ה' : 'הורה'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-sidebar-primary text-white shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 mr-auto opacity-70 rotate-180" />}
            </Link>
          );
        })}
      </nav>

      {/* Dark mode toggle */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="text-sm">{darkMode ? 'מצב בהיר' : 'מצב כהה'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-sidebar flex-col flex-shrink-0 border-l border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed right-0 top-0 h-full w-72 bg-sidebar z-50 lg:hidden shadow-2xl"
            >
              <div className="absolute top-4 left-4">
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="text-sidebar-foreground">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">כיתה חכמה</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="text-muted-foreground">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden flex items-center justify-around px-2 py-2 bg-card border-t border-border safe-area-bottom">
          {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}