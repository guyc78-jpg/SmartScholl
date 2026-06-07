import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { createGuardedBase44Client, setBase44AccessClaims, clearBase44AccessClaims } from '@/lib/accessGuard';

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

export const base44 = createGuardedBase44Client(rawBase44);
export { setBase44AccessClaims, clearBase44AccessClaims };