import { base44 } from '@/api/base44Client';
import { getUserDisplayName, ROLE_LABELS } from '@/lib/roleUtils';

export async function logActivity({ user, role, actionName, details, metadata = {}, severity = 'info' }) {
  if (!user?.email || user?.isActive === false || user?.authorized === false) return;

  const displayName = getUserDisplayName(user);

  try {
    await base44.functions.invoke('authorizeAccess', {
      action: 'logActivity',
      details,
      actionName,
      severity,
      metadata: {
        actionName,
        workRole: role,
        workRoleLabel: ROLE_LABELS[role] || role,
        userName: displayName,
        ...metadata,
      },
    });
  } catch (error) {
    if (error?.status === 403 || error?.response?.status === 403) return;
    return;
  }
}
