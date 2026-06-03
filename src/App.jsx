import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { useState, useEffect, useRef } from 'react';
import { seedDemoData } from '@/lib/demoData';
import AppLayout from '@/components/layout/AppLayout';
import { Toaster as SonnerToaster } from 'sonner';
import useThemePreference from '@/hooks/useThemePreference';

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
import Classrooms from './pages/Classrooms';
import ApprovedStaff from './pages/ApprovedStaff';
import DivisionManagement from './pages/DivisionManagement';
import DivisionExams from './pages/DivisionExams';
import PermissionsTester from './pages/PermissionsTester';
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
    if (!seeded && !isLoadingAuth && !authError) {
      seedDemoData().then(() => setSeeded(true));
    }
  }, [isLoadingAuth, authError]);

  useEffect(() => {
    if (realUser) setWorkRole(getInitialWorkRole(realUser));
  }, [realUser]);

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

  // Onboarding gate — admin (by any approved role) always bypasses
  const onboardingStatus = user?.onboarding_status;
  const userIsAdmin = user ? getAvailableRoles(user).includes('admin') : false;
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
  if (user && !user.profile_gender) {
    return <GenderRequiredGate user={user} onSaved={(updated) => updateCurrentUser(updated)} />;
  }

  // Roles are approved by admin; system access is separated from current work mode
  const approvedRoles = getAvailableRoles(user);
  const systemRole = getSystemRole(user);
  const role = effectiveWorkRole || systemRole;
  const isDivisionManager = role === 'division_manager' && approvedRoles.includes('division_manager');
  // "staff" כאן = צוות חינוכי מלא (מורה/רכז/admin). מנהל חטיבה מטופל בנפרד.
  const staff = approvedRoles.some(r => ['admin', 'homeroom_teacher', 'coordinator'].includes(r));
  const studentRole = approvedRoles.includes('student') && !staff && !isDivisionManager;

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
        <Route path="/tasks" element={<Tasks role={role} user={user} />} />
        <Route path="/treatment-center" element={<TreatmentCenter />} />
        <Route path="/announcements" element={<Announcements role={role} user={user} />} />
        <Route path="/reports" element={<Reports role={role} />} />
        <Route path="/profile" element={<Profile user={user} role={role} onRoleChange={setWorkRole} themePreference={themePreference} onThemePreferenceChange={setThemePreference} />} />
        {approvedRoles.includes('admin') && (
          <>
            <Route path="/users" element={<UserManagement />} />
            <Route path="/approved-staff" element={<ApprovedStaff />} />
            <Route path="/classrooms" element={<Classrooms />} />
            <Route path="/bell-schedule" element={<BellScheduleSettings user={user} role={role} />} />
            <Route path="/permissions-tester" element={<PermissionsTester />} />
          </>
        )}
        {(approvedRoles.includes('admin') || approvedRoles.includes('homeroom_teacher') || approvedRoles.includes('coordinator')) && (
          <>
            <Route path="/approvals" element={<ApprovalManagement role={role} />} />
            <Route path="/grade-monitor" element={<GradeMonitor user={user} role={role} />} />
          </>
        )}
      </>}

      {/* Division manager routes */}
      {isDivisionManager && <>
        <Route path="/division" element={<DivisionManagement user={user} role={role} />} />
        <Route path="/division-exams" element={<DivisionExams user={user} role={role} />} />
        <Route path="/exams" element={<DivisionExams user={user} role={role} />} />
        <Route path="/profile" element={<Profile user={user} role={role} onRoleChange={setWorkRole} themePreference={themePreference} onThemePreferenceChange={setThemePreference} />} />
        {!staff && <Route path="/" element={<Navigate to="/division" replace />} />}
      </>}

      {/* Division screens are available only when the active role is division_manager */}

      {/* Student routes */}
      {studentRole && <>
        <Route path="/student-home" element={<StudentHome user={user} />} />
        <Route path="/schedule" element={<Schedule role={role} user={user} />} />
        <Route path="/exams" element={<Exams role={role} user={user} />} />
        <Route path="/announcements" element={<Announcements role={role} user={user} />} />
        <Route path="/community" element={<Community role={role} user={user} />} />
        <Route path="/profile" element={<Profile user={user} role={role} onRoleChange={setWorkRole} themePreference={themePreference} onThemePreferenceChange={setThemePreference} />} />
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