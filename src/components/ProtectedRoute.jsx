import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AccessDenied from '@/components/auth/AccessDenied';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const LoginRedirect = ({ fallback }) => {
  const { navigateToLogin } = useAuth();
  useEffect(() => {
    navigateToLogin();
  }, [navigateToLogin]);
  return fallback;
};

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    if (authError.type === 'access_denied') {
      return <AccessDenied />;
    }
    if (authError.type === 'auth_required') {
      return unauthenticatedElement || <LoginRedirect fallback={fallback} />;
    }
    return <AccessDenied />;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement || <LoginRedirect fallback={fallback} />;
  }

  return <Outlet />;
}
