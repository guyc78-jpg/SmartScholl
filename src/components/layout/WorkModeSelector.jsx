import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAvailableRoles, getRoleLabel } from '@/lib/roleUtils';
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
      details: `המשתמש עבר למצב עבודה: ${getRoleLabel(nextRole, user)}`,
    });
    setSaving(false);
  }

  return (
    <div className="mt-2 space-y-1" dir="rtl">
      <p className="text-[11px] text-sidebar-foreground/50 text-right">מצב עבודה</p>
      <Select value={activeRole} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="h-8 bg-sidebar-accent border-sidebar-border text-sidebar-foreground text-xs w-full px-2 [&>span]:flex-1 [&>span]:text-right [&_svg]:ms-2 [&_svg]:me-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent dir="rtl" align="start">
          {roles.map(roleOption => (
            <SelectItem key={roleOption} value={roleOption}>{getRoleLabel(roleOption, user)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}