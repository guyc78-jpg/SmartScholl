import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import GradeClassSelect from '@/components/profile/GradeClassSelect';
import { extractGradeFromClass } from '@/lib/schoolStructure';

const roles = [
  { value: 'admin', label: 'מנהל/ת מערכת' },
  { value: 'homeroom_teacher', label: 'מחנך/ת כיתה' },
  { value: 'coordinator', label: 'רכז/ת שכבה' },
  { value: 'student', label: 'תלמיד/ה' },
  { value: 'parent', label: 'הורה' },
];

function UserRoleCard({ user, onSaved }) {
  const [form, setForm] = useState({
    role: user.role || 'student',
    profile_homeroom_class: user.profile_homeroom_class || user.profile_class || '',
    profile_grade_managed: user.profile_grade_managed || extractGradeFromClass(user.profile_homeroom_class || user.profile_class || ''),
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await base44.functions.invoke('handleApprovalRequest', {
      action: 'admin_update_user',
      target_user_id: user.id,
      target_email: user.email,
      target_role: form.role,
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
        <CardTitle className="text-base">{user.profile_full_name || user.full_name || user.email}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="space-y-2">
          <Label>תפקיד מאושר</Label>
          <Select value={form.role} onValueChange={(value) => setForm(prev => ({ ...prev, role: value }))}>
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
        subtitle="מסך מאובטח למנהלי מערכת בלבד לשינוי תפקידים ושיוכי כיתה/שכבה"
        actions={<ShieldCheck className="w-6 h-6 text-primary" />}
      />
      <div className="space-y-3">
        {users.map(user => <UserRoleCard key={user.id} user={user} onSaved={loadUsers} />)}
      </div>
    </div>
  );
}