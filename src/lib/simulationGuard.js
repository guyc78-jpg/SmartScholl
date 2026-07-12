import { toast } from 'sonner';

let simulating = false;

const ENTITY_WRITE_METHODS = new Set([
  'create',
  'update',
  'delete',
  'bulkCreate',
  'bulkUpdate',
  'updateMany',
  'deleteMany',
  'importEntities',
]);

const AUTH_WRITE_METHODS = new Set([
  'updateMe',
  'changePassword',
  'register',
  'verifyOtp',
  'resendOtp',
  'inviteUser',
  'resetPasswordRequest',
  'resetPassword',
  'setToken',
]);

const AGENT_WRITE_METHODS = new Set([
  'createConversation',
  'addMessage',
  'updateConversation',
  'deleteConversation',
]);

const READ_ONLY_FUNCTION_ACTIONS = {
  authorizeAccess: new Set(['getAccess', 'listAuthorizedUsers', 'listHomeroomAssignments']),
  handleApprovalRequest: new Set(['get_pending', 'list_approved_staff']),
  learningAccommodations: new Set(['getForStudent', 'listForStudents', 'parseImport']),
  yearTransitionReset: new Set(['preview']),
};

const READ_ONLY_FUNCTIONS = new Set(['getVapidPublicKey', 'calculateStudentGrowth']);

function isReadOnlyFunction(functionName, payload = {}) {
  if (READ_ONLY_FUNCTIONS.has(functionName)) return true;
  const allowedActions = READ_ONLY_FUNCTION_ACTIONS[functionName];
  if (!allowedActions) return false;
  const action = payload?.action || (functionName === 'yearTransitionReset' ? payload?.mode : '');
  return allowedActions.has(action);
}

function blockedAction() {
  toast.error('מצב סימולציה — הפעולה הודגמה בלבד ולא נשמרה בנתונים האמיתיים');
  const error = new Error('הפעולה חסומה במצב סימולציה');
  Object.defineProperty(error, 'code', { value: 'SIMULATION_BLOCKED' });
  return Promise.reject(error);
}

export function setSimulationGuard(active) {
  simulating = active === true;
}

export function isGuardActive() {
  return simulating;
}

function createEntitiesProxy(client) {
  const entityCache = new Map();
  return new Proxy(client.entities, {
    get(target, entityName) {
      if (typeof entityName === 'symbol') return target[entityName];
      const entity = target[entityName];
      if (!entity) return entity;
      if (!entityCache.has(entityName)) {
        entityCache.set(entityName, new Proxy(entity, {
          get(entityTarget, method) {
            const original = entityTarget[method];
            if (typeof method === 'symbol') return original;
            if (typeof original !== 'function') return original;
            return (...args) => {
              if (simulating && ENTITY_WRITE_METHODS.has(method)) return blockedAction();
              return original.apply(entityTarget, args);
            };
          },
        }));
      }
      return entityCache.get(entityName);
    },
  });
}

function createMethodProxy(module, blockedMethods, blockEveryMethod = false) {
  if (!module || (typeof module !== 'object' && typeof module !== 'function')) return module;
  return new Proxy(module, {
    get(target, method) {
      const original = target[method];
      if (typeof method === 'symbol') return original;
      if (typeof original !== 'function') return original;
      return (...args) => {
        if (simulating && (blockEveryMethod || blockedMethods.has(method))) return blockedAction();
        return original.apply(target, args);
      };
    },
  });
}

function createFunctionsProxy(module) {
  if (!module || (typeof module !== 'object' && typeof module !== 'function')) return module;
  return new Proxy(module, {
    get(target, method) {
      const original = target[method];
      if (typeof method === 'symbol') return original;
      if (typeof original !== 'function') return original;
      return (...args) => {
        if (simulating) {
          if (method === 'fetch') return blockedAction();
          if (method === 'invoke' && !isReadOnlyFunction(args[0], args[1])) return blockedAction();
        }
        return original.apply(target, args);
      };
    },
  });
}

function createNestedBlockingProxy(module) {
  if (!module || (typeof module !== 'object' && typeof module !== 'function')) return module;
  const namespaceCache = new Map();
  return new Proxy(module, {
    get(target, namespace) {
      const value = target[namespace];
      if (!value || typeof namespace === 'symbol') return value;
      if (typeof value === 'function') {
        return (...args) => simulating ? blockedAction() : value.apply(target, args);
      }
      if (typeof value !== 'object') return value;
      if (!namespaceCache.has(namespace)) {
        namespaceCache.set(namespace, createMethodProxy(value, new Set(), true));
      }
      return namespaceCache.get(namespace);
    },
  });
}

export function createSimulationGuardedBase44Client(client) {
  const entities = createEntitiesProxy(client);
  const auth = createMethodProxy(client.auth, AUTH_WRITE_METHODS);
  const functions = createFunctionsProxy(client.functions);
  const agents = createMethodProxy(client.agents, AGENT_WRITE_METHODS);
  const integrations = createNestedBlockingProxy(client.integrations);
  const users = createMethodProxy(client.users, new Set(), true);
  const connectors = createMethodProxy(client.connectors, new Set(), true);
  const analytics = createMethodProxy(client.analytics, new Set(), true);
  const appLogs = createMethodProxy(client.appLogs, new Set(), true);

  return new Proxy(client, {
    get(target, prop) {
      if (prop === 'entities') return entities;
      if (prop === 'auth') return auth;
      if (prop === 'functions') return functions;
      if (prop === 'agents') return agents;
      if (prop === 'integrations') return integrations;
      if (prop === 'users') return users;
      if (prop === 'connectors') return connectors;
      if (prop === 'analytics') return analytics;
      if (prop === 'appLogs') return appLogs;
      return Reflect.get(target, prop);
    },
  });
}
