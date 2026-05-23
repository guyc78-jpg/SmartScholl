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
import ClassAttendance from './pages/ClassAttendance';
import ApprovalManagement from './pages/ApprovalManagement';
import GradeMonitor from './pages/GradeMonitor';
import Onboarding from './pages/Onboarding';
import PendingApproval from './pages/PendingApproval';
import GenderRequiredGate from '@/components/profile/GenderRequiredGate';
import Profile from './pages/Profile';
import UserManagement from './pages/UserManagement';
import BellScheduleSettings from './pages/BellScheduleSettings';
import TreatmentCenter from './pages/TreatmentCenter';
import { isStaff, isStudent, defaultRoute } from './lib/permissions';
import { getAvailableRoles, getInitialWorkRole, getSystemRole } from './lib/roleUtils';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user, updateCurrentUser, checkUserAuth } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [seeded, setSeeded] = useState(false);
  const [workRole, setWorkRole] = useState(null);

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

  useEffect(() => {
    if (user) setWorkRole(getInitialWorkRole(user));
  }, [user]);

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

  // Onboarding gate — admin always bypasses
  const onboardingStatus = user?.onboarding_status;
  if (user && user.role !== 'admin' && !user.onboardingCompleted) {
    if (!onboardingStatus || onboardingStatus === 'pending') {
      return <Onboarding user={user} onComplete={async (updatedUser) => {
        if (updatedUser) updateCurrentUser(updatedUser);
        await checkUserAuth();
      }} />;
    }
    if (onboardingStatus === 'awaiting_approval' || onboardingStatus === 'rejected') {
      return <PendingApproval user={user} />;
    }
  }

  // Gender gate — שדה חובה ראשוני לפני המשך שימוש
  if (user && !user.profile_gender) {
    return <GenderRequiredGate user={user} onSaved={(updated) => updateCurrentUser(updated)} />;
  }

  // Roles are approved by admin; system access is separated from current work mode
  const approvedRoles = getAvailableRoles(user);
  const systemRole = getSystemRole(user);
  const role = workRole || systemRole;
  const staff = approvedRoles.some(isStaff);
  const studentRole = approvedRoles.includes('student') && !staff;

  const renderRoutes = () => (
    <Routes>
      {/* Staff routes */}
      {staff && <>
        <Route path="/" element={<Dashboard user={user} role={role} />} />
        <Route path="/students" element={<Students role={role} />} />
        <Route path="/students/:id" element={<StudentProfile role={role} />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/class-attendance" element={<ClassAttendance role={role} />} />
        <Route path="/schedule" element={<Schedule role={role} user={user} />} />
        <Route path="/exams" element={<Exams role={role} user={user} />} />
        <Route path="/community" element={<Community role={role} user={user} />} />
        <Route path="/discipline" element={<Discipline role={role} />} />
        <Route path="/performance" element={<Performance role={role} />} />
        <Route path="/communications" element={<Communications role={role} />} />
        <Route path="/tasks" element={<Tasks role={role} />} />
        <Route path="/treatment-center" element={<TreatmentCenter />} />
        <Route path="/announcements" element={<Announcements role={role} user={user} />} />
        <Route path="/reports" element={<Reports role={role} />} />
        <Route path="/profile" element={<Profile user={user} role={role} onRoleChange={setWorkRole} />} />
        {approvedRoles.includes('admin') && (
          <>
            <Route path="/users" element={<UserManagement />} />
            <Route path="/bell-schedule" element={<BellScheduleSettings user={user} role={role} />} />
          </>
        )}
        {(approvedRoles.includes('admin') || approvedRoles.includes('homeroom_teacher') || approvedRoles.includes('coordinator')) && (
          <>
            <Route path="/approvals" element={<ApprovalManagement role={role} />} />
            <Route path="/grade-monitor" element={<GradeMonitor user={user} role={role} />} />
          </>
        )}
      </>}

      {/* Student routes */}
      {studentRole && <>
        <Route path="/student-home" element={<StudentHome user={user} />} />
        <Route path="/schedule" element={<Schedule role={role} user={user} />} />
        <Route path="/exams" element={<Exams role={role} user={user} />} />
        <Route path="/announcements" element={<Announcements role={role} user={user} />} />
        <Route path="/community" element={<Community role={role} user={user} />} />
        <Route path="/profile" element={<Profile user={user} role={role} onRoleChange={setWorkRole} />} />
      </>}

      {/* Block students from any staff route — redirect to their home */}
      {studentRole && <Route path="/" element={<Navigate to="/student-home" replace />} />}
      {studentRole && <Route path="/students/*" element={<Navigate to="/student-home" replace />} />}
      {studentRole && <Route path="/attendance/*" element={<Navigate to="/student-home" replace />} />}
      {studentRole && <Route path="/class-attendance/*" element={<Navigate to="/student-home" replace />} />}
      {studentRole && <Route path="/discipline/*" element={<Navigate to="/student-home" replace />} />}
      {studentRole && <Route path="/performance/*" element={<Navigate to="/student-home" replace />} />}
      {studentRole && <Route path="/communications/*" element={<Navigate to="/student-home" replace />} />}
      {studentRole && <Route path="/tasks/*" element={<Navigate to="/student-home" replace />} />}
      {studentRole && <Route path="/reports/*" element={<Navigate to="/student-home" replace />} />}
      {studentRole && <Route path="/approvals/*" element={<Navigate to="/student-home" replace />} />}
      {studentRole && <Route path="/grade-monitor/*" element={<Navigate to="/student-home" replace />} />}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );

  return (
    <AppLayout user={user} role={role} darkMode={darkMode} setDarkMode={setDarkMode} onRoleChange={setWorkRole}>
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