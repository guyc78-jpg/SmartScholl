import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import UnauthorizedAccessLog from '@/components/auth/UnauthorizedAccessLog';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AccessDenied from '@/components/auth/AccessDenied';
import { useState, useEffect, useRef } from 'react';
import { seedDemoData } from '@/lib/demoData';
import AppLayout from '@/components/layout/AppLayout';
import { Toaster as SonnerToaster } from 'sonner';
import useThemePreference from '@/hooks/useThemePreference';

import { lazy, Suspense } from 'react';

import Dashboard from './pages/Dashboard';
const Students = lazy(() => import('./pages/Students'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Exams = lazy(() => import('./pages/Exams'));
const Community = lazy(() => import('./pages/Community'));
const Discipline = lazy(() => import('./pages/Discipline'));
const Performance = lazy(() => import('./pages/Performance'));
const Communications = lazy(() => import('./pages/Communications'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Reports = lazy(() => import('./pages/Reports'));
const StudentHome = lazy(() => import('./pages/StudentHome'));
const ClassAttendance = lazy(() => import('./pages/ClassAttendance'));
const GradeMonitor = lazy(() => import('./pages/GradeMonitor'));
import Onboarding from './pages/Onboarding';
import PendingApproval from './pages/PendingApproval';
import GenderRequiredGate from '@/components/profile/GenderRequiredGate';
const Profile = lazy(() => import('./pages/Profile'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const BellScheduleSettings = lazy(() => import('./pages/BellScheduleSettings'));
const TreatmentCenter = lazy(() => import('./pages/TreatmentCenter'));
const Classrooms = lazy(() => import('./pages/Classrooms'));
const DivisionManagement = lazy(() => import('./pages/DivisionManagement'));
const DivisionExams = lazy(() => import('./pages/DivisionExams'));
const PermissionsTester = lazy(() => import('./pages/PermissionsTester'));
import { isStaff, isStudent, defaultRoute } from './lib/permissions';
import { getAvailableRoles, getInitialWorkRole, getSystemRole } from './lib/roleUtils';
import { SimulationProvider, useSimulation } from '@/lib/SimulationContext';
import SimulationBanner from '@/components/permissions/SimulationBanner';
import { setSimulationGuard } from '@/lib/simulationGuard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user: realUser, updateCurrentUser, checkUserAuth } = useAuth();
  const { preference: themePreference, setPreference: setThemePreference, isDark: darkMode, toggleDark } = useThemePreference();
  const { isSimulating, simRole, buildSimulatedUser } = useSimulation();
  const navigate = useNavigate();
  const [seeded, setSeeded] = useState(false);
  const [workRole, setWorkRole] = useState(null);

  // משתמש אפקטיבי — אמיתי במצב רגיל, מדומה במצב סימולציה
  const user = isSimulating ? buildSimulatedUser(realUser, simRole) : realUser;
  const effectiveWorkRole = isSimulating ? simRole : workRole;

  // הפעלת/כיבוי מגן הסימולציה (חוסם כתיבת נתונים אמיתיים)
  useEffect(() => {
    setSimulationGuard(isSimulating);
    return () => setSimulationGuard(false);
  }, [isSimulating]);

  // ניווט אוטומטי לעמוד הבית של התפקיד המדומה / חזרה לכלי הסימולציה ביציאה
  const wasSimulatingRef = useRef(false);
  useEffect(() => {
    if (isSimulating) {
      const home = simRole === 'student' ? '/student-home'
        : simRole === 'division_manager' ? '/division'
        : '/';
      navigate(home, { replace: true });
      wasSimulatingRef.current = true;
    } else if (wasSimulatingRef.current) {
      // ביציאה ממצב סימולציה — חזרה לכלי הסימולציה
      wasSimulatingRef.current = false;
      navigate('/permissions-tester', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimulating]);

  useEffect(() => {
    // Emergency hotfix: do not run demo seeding during normal navigation.
    // It can create unnecessary background load and make the app feel stuck.
    setSeeded(true);
  }, []);

  useEffect(() => {
    if (realUser) setWorkRole(getInitialWorkRole(realUser));
  }, [realUser]);

  useEffect(() => {
    if (!user) return;
    const userRoles = getAvailableRoles(user);
    const preload = () => {
      import('./pages/Students');
      import('./pages/ClassAttendance');
      import('./pages/Schedule');
      import('./pages/Exams');
      import('./pages/Profile');
      if (userRoles.includes('system_admin') || userRoles.includes('admin')) import('./pages/UserManagement');
    };
    const id = window.requestIdleCallback ? window.requestIdleCallback(preload, { timeout: 2000 }) : setTimeout(preload, 800);
    return () => window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id);
  }, [user?.id]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background" dir="rtl">
        <div className="text-center">
          <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">טוען...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'access_denied') return <AccessDenied />;
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    else if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  // Onboarding gate — admin (by any approved role) always bypasses
  const onboardingStatus = user?.onboarding_status;
  const userIsAdmin = user ? (getAvailableRoles(user).includes('system_admin') || getAvailableRoles(user).includes('admin')) : false;
  const onboardingDone = user?.onboardingCompleted || onboardingStatus === 'approved';
  if (user && !userIsAdmin && !onboardingDone) {
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
  if (user && !user.authorization && !user.profile_gender) {
    return <GenderRequiredGate user={user} onSaved={(updated) => updateCurrentUser(updated)} />;
  }

  // Roles are approved by admin; system access is separated from current work mode
  const approvedRoles = getAvailableRoles(user);
  const systemRole = getSystemRole(user);
  const role = effectiveWorkRole || systemRole;
  const isSystemAdmin = approvedRoles.includes('system_admin') || approvedRoles.includes('admin');
  const isDivisionManager = role === 'division_manager' && approvedRoles.includes('division_manager');
  // Emergency hotfix: admins always keep staff navigation/routes, regardless of active work mode.
  const staff = isSystemAdmin || (['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'].includes(role) && approvedRoles.includes(role));
  const studentRole = role === 'student' && approvedRoles.includes('student');
  const pageRole = role === 'system_admin' ? 'admin' : role === 'grade_coordinator' ? 'coordinator' : role;

  const LoadingFallback = () => (
    <div className="flex items-center justify-center h-24" dir="rtl">
      <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const renderRoutes = () => (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Staff routes */}
        {staff && <>
          <Route path="/" element={<Dashboard user={user} role={pageRole} />} />
          <Route path="/students" element={<Students role={pageRole} />} />
          <Route path="/students/:id" element={<StudentProfile role={pageRole} />} />
          <Route path="/classrooms" element={<Classrooms user={user} role={pageRole} />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/class-attendance" element={<ClassAttendance role={pageRole} />} />
          <Route path="/schedule" element={<Schedule role={pageRole} user={user} />} />
          <Route path="/exams" element={<Exams role={pageRole} user={user} />} />
          <Route path="/community" element={<Community role={pageRole} user={user} />} />
          <Route path="/discipline" element={<Discipline role={pageRole} />} />
          <Route path="/performance" element={<Performance role={pageRole} />} />
          <Route path="/communications" element={<Communications role={pageRole} />} />
          <Route path="/tasks" element={<Tasks role={pageRole} user={user} />} />
          <Route path="/treatment-center" element={<TreatmentCenter />} />
          <Route path="/announcements" element={<Announcements role={pageRole} user={user} />} />
          <Route path="/reports" element={<Reports role={pageRole} />} />
          <Route path="/profile" element={<Profile user={user} role={pageRole} onRoleChange={setWorkRole} themePreference={themePreference} onThemePreferenceChange={setThemePreference} />} />
          {isSystemAdmin && (
            <>
              <Route path="/users" element={<UserManagement />} />
              <Route path="/bell-schedule" element={<BellScheduleSettings user={user} role={pageRole} />} />
              <Route path="/permissions-tester" element={<PermissionsTester />} />
            </>
          )}
          {(isSystemAdmin || approvedRoles.includes('homeroom_teacher') || approvedRoles.includes('grade_coordinator') || approvedRoles.includes('coordinator')) && (
            <>
              <Route path="/grade-monitor" element={<GradeMonitor user={user} role={pageRole} />} />
            </>
          )}
        </>}

        {/* Division manager routes */}
        {isDivisionManager && <>
          <Route path="/division" element={<DivisionManagement user={user} role={pageRole} />} />
          <Route path="/division-exams" element={<DivisionExams user={user} role={pageRole} />} />
          <Route path="/exams" element={<DivisionExams user={user} role={pageRole} />} />
          <Route path="/community" element={<Community role={pageRole} user={user} />} />
          <Route path="/students" element={<Students role={pageRole} />} />
          <Route path="/students/:id" element={<StudentProfile role={pageRole} />} />
          <Route path="/classrooms" element={<Classrooms user={user} role={pageRole} />} />
          <Route path="/profile" element={<Profile user={user} role={pageRole} onRoleChange={setWorkRole} themePreference={themePreference} onThemePreferenceChange={setThemePreference} />} />
          {!staff && <Route path="/" element={<Navigate to="/division" replace />} />}
        </>}

        {/* Student routes */}
        {studentRole && <>
          <Route path="/student-home" element={<StudentHome user={user} />} />
        </>}

        {/* Block students from any staff route — redirect to their home */}
        {studentRole && <Route path="/" element={<Navigate to="/student-home" replace />} />}
        {studentRole && <Route path="/students/*" element={<Navigate to="/student-home" replace />} />}
        {studentRole && <Route path="/attendance/*" element={<Navigate to="/student-home" replace />} />}
        {studentRole && <Route path="/class-attendance/*" element={<Navigate to="/student-home" replace />} />}
        {studentRole && <Route path="/classrooms/*" element={<Navigate to="/student-home" replace />} />}
        {studentRole && <Route path="/discipline/*" element={<Navigate to="/student-home" replace />} />}
        {studentRole && <Route path="/performance/*" element={<Navigate to="/student-home" replace />} />}
        {studentRole && <Route path="/communications/*" element={<Navigate to="/student-home" replace />} />}
        {studentRole && <Route path="/tasks/*" element={<Navigate to="/student-home" replace />} />}
        {studentRole && <Route path="/reports/*" element={<Navigate to="/student-home" replace />} />}
        {studentRole && <Route path="/approvals/*" element={<Navigate to="/student-home" replace />} />}
        {studentRole && <Route path="/grade-monitor/*" element={<Navigate to="/student-home" replace />} />}
        <Route path="*" element={<UnauthorizedAccessLog />} />
      </Routes>
    </Suspense>
  );

  return (
    <>
      <SimulationBanner />
      <AppLayout user={user} role={role} darkMode={darkMode} toggleDark={toggleDark} onRoleChange={setWorkRole} simulationOffset={isSimulating}>
        {renderRoutes()}
      </AppLayout>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <SimulationProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
        </SimulationProvider>
        <Toaster />
        <SonnerToaster position="top-center" richColors dir="rtl" />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;