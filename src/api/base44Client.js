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

// Emergency hotfix: use the raw Base44 client so navigation and screens are never blocked by heavy per-record guards.
export const base44 = rawBase44;
export { setBase44AccessClaims, clearBase44AccessClaims };