import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAvailableRoles, ROLE_LABELS } from '@/lib/roleUtils';
import { logActivity } from '@/lib/activityLogger';

export default function WorkModeSelector({ user, activeRole, onRoleChange }) {
  const [saving, setSaving] = useState(false);
  const roles = getAvailableRoles(user);

  if (roles.length <= 1) return null;

  async function handleChange(nextRole) {
    setSaving(true);
    localStorage.setItem(`workRole:${user.email}`, nextRole);
    onRoleChange(nextRole);
    await base44.auth.updateMe({ active_work_role: nextRole });
    await logActivity({
      user,
      role: nextRole,
      actionName: 'work_mode_changed',
      details: `המשתמש עבר למצב עבודה: ${ROLE_LABELS[nextRole] || nextRole}`,
    });
    setSaving(false);
  }

  return (
    <div className="mt-2 space-y-1" dir="rtl">
      <p className="text-[11px] text-sidebar-foreground/50 text-right">מצב עבודה</p>
      <Select value={activeRole} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="h-8 bg-sidebar-accent border-sidebar-border text-sidebar-foreground text-xs w-full flex flex-row-reverse justify-between pe-2 ps-2 [&_svg]:order-first">
          <SelectValue className="text-right" />
        </SelectTrigger>
        <SelectContent dir="rtl" align="start">
          {roles.map(role => (
            <SelectItem key={role} value={role}>{ROLE_LABELS[role] || role}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}