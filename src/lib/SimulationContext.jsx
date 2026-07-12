import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { SIMULATABLE_ROLES } from '@/lib/permissionsMatrix';
import { ROLE_LABELS, getAvailableRoles } from '@/lib/roleUtils';
import { useAuth } from '@/lib/AuthContext';
import { setBase44SimulationClaims, clearBase44SimulationClaims } from '@/api/base44Client';
import { setSimulationGuard } from '@/lib/simulationGuard';

const SimulationContext = createContext(null);

export const SIM_ROLES = SIMULATABLE_ROLES;

export function getSimRoleLabel(role) {
  return SIM_ROLES.find(item => item.value === role)?.label || ROLE_LABELS[role] || role;
}

function getScopeForSimulation(authorization, simRole) {
  const scopes = authorization?.scopes_by_role || {};
  if (simRole === 'coordinator') {
    return scopes.coordinator || scopes.grade_coordinator
      || (['coordinator', 'grade_coordinator'].includes(authorization?.role) ? authorization.scope : {})
      || {};
  }
  return scopes[simRole]
    || (authorization?.role === simRole ? authorization.scope : {})
    || {};
}

function buildSimulatedUser(realUser, simRole) {
  if (!realUser || !SIM_ROLES.some(item => item.value === simRole)) return realUser;

  const authorization = realUser.authorization || {};
  const realRoles = getAvailableRoles(realUser);
  const scope = getScopeForSimulation(authorization, simRole);
  const isHomeroom = simRole === 'homeroom_teacher';
  const isCoordinator = simRole === 'coordinator';
  const isDivisionManager = simRole === 'division_manager';
  const isRealStudent = simRole === 'student' && realRoles.includes('student');
  const classId = isHomeroom
    ? (scope.classId || scope.homeroomClassId || '')
    : isCoordinator
      ? (scope.homeroomClassId || '')
      : isRealStudent
        ? (authorization.profile_class_id || realUser.profile_class_id || '')
        : '';
  const gradeId = isCoordinator
    ? (scope.gradeId || '')
    : isRealStudent
      ? (authorization.profile_grade_managed || realUser.profile_grade_managed || '')
      : '';
  const divisionType = isDivisionManager ? (scope.divisionType || '') : '';
  const classLabel = classId
    ? (authorization.profile_class || authorization.profile_homeroom_class || realUser.profile_class || '')
    : '';

  const scopedFields = {
    profile_class_id: classId,
    profile_homeroom_class_id: (isHomeroom || isCoordinator) ? classId : '',
    homeroomClassId: (isHomeroom || isCoordinator) ? classId : '',
    profile_class: classLabel,
    profile_homeroom_class: classLabel,
    profile_grade_managed: gradeId,
    gradeId,
    profile_division: divisionType,
    divisionType,
    student_id: isRealStudent ? (authorization.student_id || realUser.student_id || '') : '',
  };

  const simulatedAuthorization = {
    ...authorization,
    ...scopedFields,
    authorized: authorization.authorized === true,
    roles: [simRole],
    role: simRole,
    scope,
    scopes_by_role: { [simRole]: scope },
  };

  return {
    ...realUser,
    ...scopedFields,
    roles: [simRole],
    available_roles: [simRole],
    role: simRole,
    active_work_role: simRole,
    authorization: simulatedAuthorization,
    __simulated: true,
    __realUser: realUser,
  };
}

export function SimulationProvider({ children }) {
  const { user: realUser } = useAuth();
  const [simRole, setSimRole] = useState(null);
  const realRoles = getAvailableRoles(realUser);
  const canSimulate = realRoles.includes('system_admin') || realRoles.includes('admin');

  const startSimulation = useCallback((role) => {
    if (!canSimulate || !SIM_ROLES.some(item => item.value === role)) return false;
    const simulatedUser = buildSimulatedUser(realUser, role);
    if (!simulatedUser?.authorization?.authorized) return false;

    // Install the reduced claims and write guard synchronously, before the
    // simulated page can mount and start data effects.
    setBase44SimulationClaims(simulatedUser.authorization);
    setSimulationGuard(true);
    setSimRole(role);
    return true;
  }, [canSimulate, realUser]);

  const stopSimulation = useCallback(() => {
    setSimulationGuard(false);
    clearBase44SimulationClaims();
    setSimRole(null);
  }, []);

  useEffect(() => {
    if (!simRole) return;
    const simulatedUser = buildSimulatedUser(realUser, simRole);
    if (!canSimulate || !simulatedUser?.authorization?.authorized) {
      stopSimulation();
      return;
    }
    setBase44SimulationClaims(simulatedUser.authorization);
    setSimulationGuard(true);
  }, [realUser, simRole, canSimulate, stopSimulation]);

  useEffect(() => {
    if (simRole && !canSimulate) stopSimulation();
  }, [simRole, canSimulate, stopSimulation]);

  useEffect(() => () => {
    setSimulationGuard(false);
    clearBase44SimulationClaims();
  }, []);

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
  const context = useContext(SimulationContext);
  if (!context) throw new Error('useSimulation must be used within a SimulationProvider');
  return context;
}
