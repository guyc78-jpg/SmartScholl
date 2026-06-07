import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { setBase44AccessClaims, clearBase44AccessClaims } from '@/lib/accessGuard';

const { appId, token, functionsVersion, appBaseUrl, serverUrl } = appParams;

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