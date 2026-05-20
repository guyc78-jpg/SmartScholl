import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { useState, useEffect } from 'react';
import { seedDemoData } from '@/lib/demoData';
import AppLayout from '@/components/layout/AppLayout';
import { Toaster as SonnerToaster } from 'sonner';

import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentProfile from './pages/StudentProfile';
import Attendance from './pages/Attendance';
import Schedule from './pages/Schedule';
import Exams from './pages/Exams';
import Community from './pages/Community';
import Discipline from './pages/Discipline';
import Performance from './pages/Performance';
import Communications from './pages/Communications';
import Tasks from './pages/Tasks';
import Announcements from './pages/Announcements';
import Reports from './pages/Reports';
import StudentHome from './pages/StudentHome';
import { isStaff, isStudent, defaultRoute } from './lib/permissions';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!seeded && !isLoadingAuth && !authError) {
      seedDemoData().then(() => setSeeded(true));
    }
  }, [isLoadingAuth, authError]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background" dir="rtl">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">טוען כיתה חכמה...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    else if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  const role = user?.role || 'homeroom_teacher'; // default for demo
  const staff = isStaff(role);
  const studentRole = isStudent(role);

  const renderRoutes = () => (
    <Routes>
      {/* Staff routes */}
      {staff && <>
        <Route path="/" element={<Dashboard user={user} />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/:id" element={<StudentProfile role={role} />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/schedule" element={<Schedule role={role} />} />
        <Route path="/exams" element={<Exams role={role} />} />
        <Route path="/community" element={<Community role={role} />} />
        <Route path="/discipline" element={<Discipline role={role} />} />
        <Route path="/performance" element={<Performance role={role} />} />
        <Route path="/communications" element={<Communications role={role} />} />
        <Route path="/tasks" element={<Tasks role={role} />} />
        <Route path="/announcements" element={<Announcements role={role} />} />
        <Route path="/reports" element={<Reports />} />
      </>}

      {/* Student routes */}
      {studentRole && <>
        <Route path="/student-home" element={<StudentHome user={user} />} />
        <Route path="/schedule" element={<Schedule role={role} />} />
        <Route path="/exams" element={<Exams role={role} />} />
        <Route path="/announcements" element={<Announcements role={role} />} />
        <Route path="/community" element={<Community role={role} />} />
      </>}

      {/* Role-based default redirect */}
      {studentRole && <Route path="/" element={<Navigate to="/student-home" replace />} />}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );

  return (
    <AppLayout user={user} role={role} darkMode={darkMode} setDarkMode={setDarkMode}>
      {renderRoutes()}
    </AppLayout>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="top-center" richColors dir="rtl" />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;