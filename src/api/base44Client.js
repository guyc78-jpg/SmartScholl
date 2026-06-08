import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { setBase44AccessClaims, clearBase44AccessClaims } from '@/lib/accessGuard';

const { appId, token, functionsVersion, appBaseUrl, serverUrl } = appParams;

const APP_LOG_CLAIMS_KEY = '__approved_user_claims';
const isUserInAppLogUrl = (url = '') => String(url).includes('/api/app-logs/') && String(url).includes('/log-user-in-app/');
const isUsersScreenLogUrl = (url = '') => isUserInAppLogUrl(url) && String(url).includes('/log-user-in-app/users');

const hasAuthorizedLogUser = () => {
  if (typeof window === 'undefined') return false;
  const rawClaims = window.sessionStorage.getItem(APP_LOG_CLAIMS_KEY);
  if (!rawClaims) return false;
  try {
    const claims = JSON.parse(rawClaims);
    return claims?.authorized === true && claims?.isActive !== false;
  } catch {
    return false;
  }
};

if (typeof window !== 'undefined' && !window.__base44AppLogGuardInstalled) {
  window.__base44AppLogGuardInstalled = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (isUsersScreenLogUrl(url) || (isUserInAppLogUrl(url) && !hasAuthorizedLogUser())) {
      return new Response(null, { status: 204 });
    }
    const response = await originalFetch(input, init);
    if (isUserInAppLogUrl(url) && response.status === 403) {
      return new Response(null, { status: 204 });
    }
    return response;
  };
}

//Create a client with authentication required
const rawBase44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: serverUrl || '',
  requiresAuth: false,
  appBaseUrl
});

const blockedAccommodationEntity = new Proxy({}, {
  get() {
    return async () => {
      throw new Error('התאמות לימודיות נגישות רק דרך מנגנון ההרשאות המאובטח');
    };
  }
});

const entitiesProxy = new Proxy(rawBase44.entities, {
  get(target, entityName) {
    if (entityName === 'StudentAccommodation') return blockedAccommodationEntity;
    return target[entityName];
  }
});

// Emergency hotfix: keep the raw client for navigation performance, with a small direct-access block for sensitive accommodations.
export const base44 = new Proxy(rawBase44, {
  get(target, prop) {
    if (prop === 'entities') return entitiesProxy;
    return target[prop];
  }
});
export { setBase44AccessClaims, clearBase44AccessClaims };