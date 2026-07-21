import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { base44, setBase44AccessClaims, clearBase44AccessClaims } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { parseRoles, VALID_ROLES } from '@/lib/roleUtils';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext(null);

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const normalizeEmail = (value = '') => String(value).trim().toLowerCase();
const getErrorStatus = (error) => error?.status || error?.response?.status || error?.data?.status;

const withNetworkRetry = async (loader, attempts = 2) => {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await loader();
    } catch (error) {
      lastError = error;
      const status = getErrorStatus(error);
      // Authentication, authorization and validation failures are
      // deterministic. Retrying them delays a fail-closed response and can
      // duplicate security audit records.
      if (status && status < 500 && status !== 408 && status !== 429) throw error;
      if (attempt < attempts - 1) await wait(450 * (attempt + 1));
    }
  }
  throw lastError;
};

const withTimeout = (promise, timeoutMs, message) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  promise.then(
    value => { clearTimeout(timer); resolve(value); },
    error => { clearTimeout(timer); reject(error); }
  );
});

const accessDeniedError = (message) => {
  return Object.assign(new Error(message), { status: 403 });
};

const normalizeAccessPayload = (currentUser, accessUser) => {
  if (!accessUser || accessUser.authorized !== true || accessUser.isActive === false) {
    throw accessDeniedError('Access authorization was not approved');
  }

  if (!currentUser?.email || normalizeEmail(accessUser.email) !== normalizeEmail(currentUser.email)) {
    throw accessDeniedError('Authorization identity does not match the authenticated user');
  }

  const roles = [...new Set([
    ...parseRoles(accessUser.roles),
    accessUser.role,
  ].filter(role => VALID_ROLES.includes(role)))];

  if (!roles.length || !roles.includes(accessUser.role)) {
    throw accessDeniedError('Authorization response contains no valid primary role');
  }

  return { ...accessUser, roles };
};

const toMergedUser = (currentUser, accessUser) => ({
  ...currentUser,
  ...accessUser,
  role: accessUser.role,
  roles: accessUser.roles,
  available_roles: accessUser.roles,
  active_work_role: accessUser.roles.includes(currentUser.active_work_role)
    ? currentUser.active_work_role
    : accessUser.role,
  profile_display_primary_role: accessUser.profile_display_primary_role || accessUser.role,
  profile_display_additional_roles: [],
  profile_extra_roles: currentUser.profile_extra_roles || '',
  // Approval claims must not erase a pending mandatory profile/password flow
  // stored on the actual Base44 user.
  onboarding_status: currentUser.onboarding_status ?? accessUser.onboarding_status,
  onboardingCompleted: currentUser.onboardingCompleted ?? accessUser.onboardingCompleted,
  authorization: accessUser,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const authRequestId = useRef(0);
  const appStateRequestId = useRef(0);

  const checkUserAuth = useCallback(async ({ silent = false } = {}) => {
    const requestId = ++authRequestId.current;
    if (!silent) setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const currentUser = await withNetworkRetry(() => base44.auth.me(), 3);
      if (requestId !== authRequestId.current) return null;

      const accessResponse = await withNetworkRetry(
        () => withTimeout(
          base44.functions.invoke('authorizeAccess', { action: 'getAccess' }),
          20000,
          'authorizeAccess timeout'
        ),
        3
      );
      if (requestId !== authRequestId.current) return null;

      const accessUser = normalizeAccessPayload(currentUser, accessResponse?.data?.user);
      const mergedUser = toMergedUser(currentUser, accessUser);

      // Never grant routes from local/session storage. Claims are installed
      // only after a fresh response is matched to the authenticated identity.
      setBase44AccessClaims(accessUser);
      setUser(mergedUser);
      setIsAuthenticated(true);
      setAuthChecked(true);
      return mergedUser;
    } catch (error) {
      if (requestId !== authRequestId.current) return null;
      clearBase44AccessClaims();
      console.error('User auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);

      const status = getErrorStatus(error);
      if (status === 403) {
        setAuthError({ type: 'access_denied', message: 'Access denied' });
      } else if (status === 401) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      } else {
        setAuthError({ type: 'unknown', message: error.message || 'Network Error' });
      }
      return null;
    } finally {
      if (requestId === authRequestId.current && !silent) setIsLoadingAuth(false);
    }
  }, []);

  const checkAppState = useCallback(async () => {
    const requestId = ++appStateRequestId.current;
    setIsLoadingPublicSettings(true);
    setAuthError(null);

    try {
      const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl || ''}/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true,
      });

      const publicSettings = await withNetworkRetry(
        () => appClient.get(`/prod/public-settings/by-id/${appParams.appId}`),
        3
      );
      if (requestId !== appStateRequestId.current) return;
      setAppPublicSettings(publicSettings);

      // Token presence is not proof of authentication, and SDK-managed
      // sessions may exist without appParams.token. me() is authoritative.
      await checkUserAuth();
    } catch (appError) {
      if (requestId !== appStateRequestId.current) return;
      clearBase44AccessClaims();
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setIsLoadingAuth(false);
      console.error('App state check failed:', appError);

      const status = getErrorStatus(appError);
      const reason = appError?.data?.extra_data?.reason
        || appError?.response?.data?.extra_data?.reason;

      if (status === 403 && reason === 'auth_required') {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      } else if (status === 403 && reason === 'user_not_registered') {
        setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
      } else if (status === 403 && reason) {
        setAuthError({ type: reason, message: appError.message });
      } else {
        setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
      }
    } finally {
      if (requestId === appStateRequestId.current) setIsLoadingPublicSettings(false);
    }
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
    return () => {
      appStateRequestId.current += 1;
      authRequestId.current += 1;
    };
  }, [checkAppState]);

  // Revalidate when the app regains focus. This avoids exposing all
  // ApprovedUser realtime events in the browser while still picking up role
  // revocations/changes during an active session.
  useEffect(() => {
    if (!user?.email) return undefined;
    let lastCheckAt = 0;
    const revalidate = () => {
      if (document.visibilityState === 'hidden' || Date.now() - lastCheckAt < 30_000) return;
      lastCheckAt = Date.now();
      checkUserAuth({ silent: true });
    };
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, [user?.email, checkUserAuth]);

  const updateCurrentUser = useCallback((updates) => {
    if (!updates || typeof updates !== 'object') return;
    setUser(previous => {
      if (!previous) return previous;

      // A verified access payload (used after an admin changes assignments)
      // may replace claims. Ordinary profile responses cannot replace
      // authorization/role fields in memory.
      if (updates.authorized === true && normalizeEmail(updates.email) === normalizeEmail(previous.email)) {
        try {
          const accessUser = normalizeAccessPayload(previous, updates);
          setBase44AccessClaims(accessUser);
          return {
            ...previous,
            ...accessUser,
            role: accessUser.role,
            roles: accessUser.roles,
            available_roles: accessUser.roles,
            authorization: accessUser,
          };
        } catch {
          return previous;
        }
      }

      const {
        authorization: _authorization,
        roles: _roles,
        available_roles: _availableRoles,
        role: _role,
        ...safeUpdates
      } = updates;
      return { ...previous, ...safeUpdates };
    });
  }, []);

  const logout = useCallback((shouldRedirect = true) => {
    authRequestId.current += 1;
    appStateRequestId.current += 1;
    clearBase44AccessClaims();
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(true);
    setAuthError(null);
    base44.auth.logout(shouldRedirect ? window.location.href : '/');
  }, []);

  const navigateToLogin = useCallback(() => {
    base44.auth.redirectToLogin(window.location.href);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      updateCurrentUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};