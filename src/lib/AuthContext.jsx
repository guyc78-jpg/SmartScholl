import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44, setBase44AccessClaims, clearBase44AccessClaims } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();
const ACCESS_CACHE_TTL = 10 * 60 * 1000;

const getAccessCacheKey = (email) => email ? `approvedAccess:${email}` : '';

const readCachedAccess = (email) => {
  const key = getAccessCacheKey(email);
  if (!key) return null;
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (!cached?.user || Date.now() - cached.savedAt > ACCESS_CACHE_TTL) return null;
    return cached.user;
  } catch {
    return null;
  }
};

const writeCachedAccess = (email, accessUser) => {
  const key = getAccessCacheKey(email);
  if (!key || !accessUser) return;
  sessionStorage.setItem(key, JSON.stringify({ user: accessUser, savedAt: Date.now() }));
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl || ''}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();

      const applyAccessUser = (accessUser) => {
        setBase44AccessClaims(accessUser);
        const mergedRoles = accessUser.roles || [];
        const approvedPrimaryRole = accessUser.profile_display_primary_role || accessUser.role;
        setUser({
          ...currentUser,
          ...accessUser,
          role: accessUser.role,
          roles: mergedRoles,
          available_roles: mergedRoles,
          active_work_role: mergedRoles.includes(currentUser.active_work_role) ? currentUser.active_work_role : accessUser.role,
          profile_display_primary_role: approvedPrimaryRole,
          profile_display_additional_roles: [],
          profile_extra_roles: currentUser.profile_extra_roles || '',
          authorization: accessUser,
        });
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      };

      const cachedAccess = readCachedAccess(currentUser.email);
      if (cachedAccess) {
        applyAccessUser(cachedAccess);
        base44.functions.invoke('authorizeAccess', { action: 'getAccess' })
          .then((accessRes) => {
            const freshAccess = accessRes.data.user;
            writeCachedAccess(currentUser.email, freshAccess);
            if (JSON.stringify(freshAccess) !== JSON.stringify(cachedAccess)) applyAccessUser(freshAccess);
          })
          .catch(() => {});
        return;
      }

      const accessRes = await Promise.race([
        base44.functions.invoke('authorizeAccess', { action: 'getAccess' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('authorizeAccess timeout')), 3500))
      ]);
      const accessUser = accessRes.data.user;
      writeCachedAccess(currentUser.email, accessUser);
      applyAccessUser(accessUser);
    } catch (error) {
      clearBase44AccessClaims();
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (error.status === 403 || error?.response?.status === 403) {
        setAuthError({
          type: 'access_denied',
          message: 'המשתמש אינו מורשה להיכנס למערכת'
        });
      } else if (error.status === 401 || error?.response?.status === 401) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  useEffect(() => {
    if (!user?.email) return;
    const unsubscribe = base44.entities.ApprovedUser.subscribe((event) => {
      if (event?.data?.email && event.data.email.toLowerCase() === user.email.toLowerCase()) {
        sessionStorage.removeItem(getAccessCacheKey(user.email));
        checkUserAuth();
      }
    });
    return unsubscribe;
  }, [user?.email]);

  const updateCurrentUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const logout = (shouldRedirect = true) => {
    clearBase44AccessClaims();
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

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
      updateCurrentUser
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