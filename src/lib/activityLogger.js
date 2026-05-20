import { base44 } from '@/api/base44Client';
import { ROLE_LABELS } from '@/lib/roleUtils';

export async function logActivity({ user, role, actionName, details, metadata = {}, severity = 'info' }) {
  if (!user?.email) return;

  await base44.entities.ActivityLog.create({
    event_type: 'user_action',
    actor_email: user.email,
    target_email: user.email,
    target_name: user.full_name || user.email,
    details,
    action_name: actionName,
    work_role: role,
    work_role_label: ROLE_LABELS[role] || role,
    severity,
    metadata: JSON.stringify({
      actionName,
      workRole: role,
      workRoleLabel: ROLE_LABELS[role] || role,
      userName: user.full_name || '',
      ...metadata,
    }),
  });
}