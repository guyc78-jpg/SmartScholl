const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const localStore = windowObj.localStorage;
const sessionStore = isNode ? windowObj.localStorage : window.sessionStorage;
const SENSITIVE_PARAMS = new Set(['access_token']);
const TRUSTED_RUNTIME_HOSTS = ['base44.app', 'base44.com', 'localhost', '127.0.0.1'];

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const storageForParam = (paramName) => SENSITIVE_PARAMS.has(paramName) ? sessionStore : localStore;

const isTrustedRuntimeUrl = (value) => {
	if (!value) return false;
	try {
		const url = new URL(value, window.location.origin);
		return TRUSTED_RUNTIME_HOSTS.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
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
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
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
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		serverUrl: getAppParamValue("server_url", { defaultValue: import.meta.env.VITE_BASE44_SERVER_URL, validate: isTrustedRuntimeUrl }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL, validate: isTrustedRuntimeUrl }),
	}
}


export const appParams = {
	...getAppParams()
}
