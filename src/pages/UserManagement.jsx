import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import GradeClassSelect from '@/components/profile/GradeClassSelect';
import { extractGradeFromClass } from '@/lib/schoolStructure';
import { getAvailableRoles, getUserDisplayName, ROLE_LABELS, SYSTEM_ROLE_PRIORITY } from '@/lib/roleUtils';
import { cn } from '@/lib/utils';

const roles = SYSTEM_ROLE_PRIORITY.map(value => ({ value, label: ROLE_LABELS[value] }));

function UserRoleCard({ user, onSaved }) {
  const currentRoles = getAvailableRoles(user);
  const [form, setForm] = useState({
    primaryRole: user.role || currentRoles[0] || 'student',
    approvedRoles: currentRoles,
    profile_homeroom_class: user.profile_homeroom_class || user.profile_class || '',
    profile_grade_managed: user.profile_grade_managed || extractGradeFromClass(user.profile_homeroom_class || user.profile_class || ''),
  });
  const [saving, setSaving] = useState(false);

  const toggleRole = (role) => {
    setForm(prev => {
      const exists = prev.approvedRoles.includes(role);
      const approvedRoles = exists
        ? prev.approvedRoles.filter(item => item !== role)
        : [...prev.approvedRoles, role];
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
    await base44.functions.invoke('handleApprovalRequest', {
      action: 'admin_update_user',
      target_user_id: user.id,
      target_email: user.email,
      target_role: form.primaryRole,
      approved_roles: form.approvedRoles,
      profile_homeroom_class: form.profile_homeroom_class,
      profile_grade_managed: form.profile_grade_managed,
    });
    toast.success('הרשאות המשתמש עודכנו');
    setSaving(false);
    onSaved();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{getUserDisplayName(user)}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-end">
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
            onGradeChange={(value) => setForm(prev => ({ ...prev, profile_grade_managed: value, profile_homeroom_class: '' }))}
            onClassChange={(value) => setForm(prev => ({ ...prev, profile_homeroom_class: value }))}
            showClass
          />
          <Button onClick={save} disabled={saving}>
            {saving ? 'שומר...' : 'שמור הרשאות'}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>תפקידים מאושרים</Label>
          <div className="flex flex-wrap gap-2">
            {roles.map(item => {
              const selected = form.approvedRoles.includes(item.value);
              return (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => toggleRole(item.value)}
                  className={cn(
                    'px-3 py-2 rounded-xl border text-sm transition-colors',
                    selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted border-border'
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">הרשאות נקבעות רק מהרשימה המאושרת כאן, לא מטקסט חופשי בפרופיל.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('handleApprovalRequest', { action: 'list_users' });
    setUsers(res.data.users || []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  if (loading) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4" dir="rtl">
      <PageHeader
        title="ניהול משתמשים והרשאות"
        subtitle="הפרדה בין הרשאת מערכת, תפקידים מאושרים ושיוך חינוכי לכיתה או שכבה"
        actions={<ShieldCheck className="w-6 h-6 text-primary" />}
      />
      <div className="space-y-3">
        {users.map(user => <UserRoleCard key={user.id} user={user} onSaved={loadUsers} />)}
      </div>
    </div>
  );
}