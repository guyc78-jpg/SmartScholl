import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import GradeClassSelect from '@/components/profile/GradeClassSelect';
import { extractGradeFromClass } from '@/lib/schoolStructure';
import { getAvailableRoles, getUserDisplayName, ROLE_LABELS, SYSTEM_ROLE_PRIORITY } from '@/lib/roleUtils';
import { cn } from '@/lib/utils';

const roles = SYSTEM_ROLE_PRIORITY.filter(value => value !== 'parent').map(value => ({ value, label: ROLE_LABELS[value] }));

export default function UserPermissionEditor({ targetUser, currentUser, onSaved }) {
  const currentRoles = getAvailableRoles(targetUser);
  const [form, setForm] = useState({
    primaryRole: targetUser.role || currentRoles[0] || 'student',
    approvedRoles: currentRoles,
    profile_class_id: targetUser.profile_class_id || '',
    profile_homeroom_class: targetUser.profile_homeroom_class || targetUser.profile_class || '',
    profile_grade_managed: targetUser.profile_grade_managed || extractGradeFromClass(targetUser.profile_homeroom_class || targetUser.profile_class || ''),
  });
  const [saving, setSaving] = useState(false);

  const toggleRole = (role) => {
    setForm(prev => {
      const exists = prev.approvedRoles.includes(role);
      const approvedRoles = exists ? prev.approvedRoles.filter(item => item !== role) : [...prev.approvedRoles, role];
      const safeRoles = approvedRoles.length ? approvedRoles : ['student'];
      return {
        ...prev,
        approvedRoles: safeRoles,
        primaryRole: safeRoles.includes(prev.primaryRole) ? prev.primaryRole : safeRoles[0],
      };
    });
  };

  const save = async () => {
    setSaving(true);
    const res = await base44.functions.invoke('handleApprovalRequest', {
      action: 'admin_update_user',
      target_user_id: targetUser.id,
      target_email: targetUser.email,
      target_role: form.primaryRole,
      approved_roles: form.approvedRoles,
      profile_class_id: form.profile_class_id,
      profile_homeroom_class: form.profile_homeroom_class,
      profile_grade_managed: form.profile_grade_managed,
    });
    toast.success('הרשאות המשתמש עודכנו');
    setSaving(false);
    onSaved?.(res.data.user, targetUser.id === currentUser?.id);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{getUserDisplayName(targetUser)}</CardTitle>
        <CardDescription>{targetUser.email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-end">
          <div className="space-y-2">
            <Label>תפקיד ראשי</Label>
            <Select value={form.primaryRole} onValueChange={(value) => setForm(prev => ({ ...prev, primaryRole: value, approvedRoles: prev.approvedRoles.includes(value) ? prev.approvedRoles : [...prev.approvedRoles, value] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent dir="rtl">
                {roles.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <GradeClassSelect
            grade={form.profile_grade_managed}
            classNameValue={form.profile_homeroom_class}
            classId={form.profile_class_id}
            onGradeChange={(value) => setForm(prev => ({ ...prev, profile_grade_managed: value }))}
            onClassChange={(value) => setForm(prev => ({ ...prev, profile_homeroom_class: value }))}
            onClassIdChange={(value) => setForm(prev => ({ ...prev, profile_class_id: value }))}
            showClass
          />
        </div>

        <div className="space-y-2" dir="rtl">
          <Label>תפקידים נוספים / מאושרים</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {roles.map(item => {
              const selected = form.approvedRoles.includes(item.value);
              return (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => toggleRole(item.value)}
                  className={cn(
                    'h-10 px-3 rounded-xl border text-sm font-medium leading-none flex items-center justify-center text-center transition-colors',
                    selected
                      ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                      : 'bg-card text-foreground/80 border-border hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button onClick={save} disabled={saving} className="w-full sm:w-auto h-10 px-8 rounded-xl font-medium">
            {saving ? 'שומר...' : 'שמור הרשאות'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}