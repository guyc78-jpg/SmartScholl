import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { SIMULATABLE_ROLES } from '@/lib/permissionsMatrix';
import { ROLE_LABELS } from '@/lib/roleUtils';

const SimulationContext = createContext(null);

// תפקידים שניתן לדמות
export const SIM_ROLES = SIMULATABLE_ROLES;

export function getSimRoleLabel(role) {
  return SIM_ROLES.find(r => r.value === role)?.label || ROLE_LABELS[role] || role;
}

// בונה משתמש "מדומה" עבור התפקיד הנבחר — אותו משתמש אמיתי, אך עם תפקיד מצומצם
function buildSimulatedUser(realUser, simRole) {
  if (!realUser || !simRole) return realUser;
  return {
    ...realUser,
    roles: [simRole],
    available_roles: [simRole],
    role: simRole,
    active_work_role: simRole,
    __simulated: true,
    __realUser: realUser,
  };
}

export function SimulationProvider({ children }) {
  const [simRole, setSimRole] = useState(null);

  const startSimulation = useCallback((role) => setSimRole(role), []);
  const stopSimulation = useCallback(() => setSimRole(null), []);

  const value = useMemo(() => ({
    simRole,
    isSimulating: !!simRole,
    startSimulation,
    stopSimulation,
    buildSimulatedUser,
  }), [simRole, startSimulation, stopSimulation]);

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within a SimulationProvider');
  return ctx;
}