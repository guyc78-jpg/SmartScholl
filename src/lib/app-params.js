const isNode = typeof window === 'undefined';
const memoryValues = new Map();
const memoryStorage = {
	getItem: (key) => memoryValues.get(key) ?? null,
	setItem: (key, value) => memoryValues.set(key, String(value)),
	removeItem: (key) => memoryValues.delete(key),
};
const localStore = isNode ? memoryStorage : window.localStorage;
const sessionStore = isNode ? memoryStorage : window.sessionStorage;
const TRUSTED_RUNTIME_HOSTS = ['base44.app', 'base44.com'];
const LOCAL_RUNTIME_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const runtimeEnv = /** @type {Record<string, string | undefined>} */ (import.meta.env ?? {});

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const storageForParam = () => localStore;

const isTrustedRuntimeUrl = (value) => {
	if (!value) return false;
	try {
		const origin = isNode ? 'http://localhost' : window.location.origin;
		const url = new URL(value, origin);
		if (url.username || url.password) return false;
		const localPage = isNode || Boolean(runtimeEnv.DEV)
			|| LOCAL_RUNTIME_HOSTS.has(window.location.hostname);
		if (LOCAL_RUNTIME_HOSTS.has(url.hostname)) {
			return localPage && (url.protocol === 'http:' || url.protocol === 'https:');
		}
		const trustedHost = TRUSTED_RUNTIME_HOSTS.some(
			host => url.hostname === host || url.hostname.endsWith(`.${host}`)
		);
		return trustedHost && url.protocol === 'https:' && (!url.port || url.port === '443');
	} catch {
		return false;
	}
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false, validate = null } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storage = storageForParam(paramName);
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam && (!validate || validate(searchParam))) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue && (!validate || validate(defaultValue))) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue && (!validate || validate(storedValue))) {
		return storedValue;
	}
	if (storedValue) storage.removeItem(storageKey);
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		localStore.removeItem('base44_access_token');
		sessionStore.removeItem('base44_access_token');
		localStore.removeItem('token');
		sessionStore.removeItem('token');
	}
	return {
		appId: getAppParamValue("app_id", { defaultValue: runtimeEnv.VITE_BASE44_APP_ID }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: isNode ? undefined : window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: runtimeEnv.VITE_BASE44_FUNCTIONS_VERSION }),
		serverUrl: getAppParamValue("server_url", { defaultValue: runtimeEnv.VITE_BASE44_SERVER_URL, validate: isTrustedRuntimeUrl }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: runtimeEnv.VITE_BASE44_APP_BASE_URL, validate: isTrustedRuntimeUrl }),
	}
}


export const appParams = {
	...getAppParams()
}