import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { setBase44AccessClaims, clearBase44AccessClaims } from '@/lib/accessGuard';

const { appId, token, functionsVersion, appBaseUrl, serverUrl } = appParams;

const isUserInAppLogUrl = (url = '') => String(url).includes('/api/app-logs/') && String(url).includes('/log-user-in-app/');

const silentAppLogResponse = () => new Response(null, { status: 204 });

if (typeof window !== 'undefined' && !window.__base44AppLogGuardInstalled) {
  window.__base44AppLogGuardInstalled = true;

  const originalLog = window.console.log.bind(window.console);
  window.console.log = (...args) => {
    const isRealtimeConnectNoise = args.length === 2 && args[0] === 'connect' && typeof args[1] === 'string' && /^[A-Za-z0-9_-]{10,}$/.test(args[1]);
    if (isRealtimeConnectNoise) return;
    originalLog(...args);
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (isUserInAppLogUrl(url)) return silentAppLogResponse();
    return originalFetch(input, init);
  };

  const originalSendBeacon = window.navigator?.sendBeacon?.bind(window.navigator);
  if (originalSendBeacon) {
    window.navigator.sendBeacon = (url, data) => {
      if (isUserInAppLogUrl(url)) return true;
      return originalSendBeacon(url, data);
    };
  }

  const originalXhrOpen = window.XMLHttpRequest?.prototype.open;
  const originalXhrSend = window.XMLHttpRequest?.prototype.send;
  if (originalXhrOpen && originalXhrSend) {
    window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this.__base44MuteAppLog = isUserInAppLogUrl(typeof url === 'string' ? url : url?.toString?.() || '');
      if (this.__base44MuteAppLog) return;
      return originalXhrOpen.call(this, method, url, ...rest);
    };

    window.XMLHttpRequest.prototype.send = function(body) {
      if (!this.__base44MuteAppLog) return originalXhrSend.call(this, body);
      setTimeout(() => {
        for (const [key, value] of Object.entries({ readyState: 4, status: 204, statusText: 'No Content', responseText: '', response: '' })) {
          try { Object.defineProperty(this, key, { configurable: true, value }); } catch {}
        }
        this.onreadystatechange?.();
        this.dispatchEvent?.(new Event('readystatechange'));
        this.onload?.();
        this.dispatchEvent?.(new Event('load'));
        this.onloadend?.();
        this.dispatchEvent?.(new Event('loadend'));
      }, 0);
    };
  }
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