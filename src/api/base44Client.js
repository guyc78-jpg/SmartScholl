import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import {
  createGuardedBase44Client,
  setBase44AccessClaims,
  clearBase44AccessClaims,
  setBase44SimulationClaims,
  clearBase44SimulationClaims,
} from '@/lib/accessGuard';
import { createSimulationGuardedBase44Client } from '@/lib/simulationGuard';

const { appId, token, functionsVersion, appBaseUrl, serverUrl } = appParams;

/** @param {string | URL | null | undefined} url */
const isUserInAppLogUrl = (url = '') => String(url).includes('/api/app-logs/') && String(url).includes('/log-user-in-app/');

const silentAppLogResponse = () => new Response(null, { status: 204 });

if (typeof window !== 'undefined' && !('__base44AppLogGuardInstalled' in window)) {
  Object.defineProperty(window, '__base44AppLogGuardInstalled', { configurable: false, value: true });

  const originalLog = window.console.log.bind(window.console);
  window.console.log = (...args) => {
    const isRealtimeConnectNoise = args.length === 2 && args[0] === 'connect' && typeof args[1] === 'string' && /^[A-Za-z0-9_-]{10,}$/.test(args[1]);
    if (isRealtimeConnectNoise) return;
    originalLog(...args);
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
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
    const mutedRequests = new WeakSet();
    window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      if (isUserInAppLogUrl(url)) {
        mutedRequests.add(this);
        return;
      }
      return originalXhrOpen.call(this, method, url, ...rest);
    };

    window.XMLHttpRequest.prototype.send = function(body) {
      if (!mutedRequests.has(this)) return originalXhrSend.call(this, body);
      setTimeout(() => {
        for (const [key, value] of Object.entries({ readyState: 4, status: 204, statusText: 'No Content', responseText: '', response: '' })) {
          try { Object.defineProperty(this, key, { configurable: true, value }); } catch {}
        }
        const readyStateEvent = new Event('readystatechange');
        const loadEvent = new ProgressEvent('load');
        const loadEndEvent = new ProgressEvent('loadend');
        this.onreadystatechange?.call(this, readyStateEvent);
        this.dispatchEvent(readyStateEvent);
        this.onload?.call(this, loadEvent);
        this.dispatchEvent(loadEvent);
        this.onloadend?.call(this, loadEndEvent);
        this.dispatchEvent(loadEndEvent);
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
    if (typeof entityName === 'symbol') return Reflect.get(target, entityName);
    if (entityName === 'StudentAccommodation') return blockedAccommodationEntity;
    return target[entityName];
  }
});

const accommodationBlockedClient = new Proxy(rawBase44, {
  get(target, prop) {
    if (prop === 'entities') return entitiesProxy;
    return Reflect.get(target, prop);
  }
});

const accessGuardedClient = createGuardedBase44Client(accommodationBlockedClient);
export const base44 = createSimulationGuardedBase44Client(accessGuardedClient);
export {
  setBase44AccessClaims,
  clearBase44AccessClaims,
  setBase44SimulationClaims,
  clearBase44SimulationClaims,
};
