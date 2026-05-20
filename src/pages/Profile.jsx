import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, UserRound, Send } from 'lucide-react';
import GradeClassSelect from '@/components/profile/GradeClassSelect';
import { extractGradeFromClass } from '@/lib/schoolStructure';
import { getAvailableRoles, getSystemRole, getUserDisplayName, ROLE_LABELS } from '@/lib/roleUtils';
import { useAuth } from '@/lib/AuthContext';

const roles = [
  { value: 'admin', label: 'מנהל/ת מערכת' },
  { value: 'homeroom_teacher', label: 'מחנך/ת כיתה' },
  { value: 'coordinator', label: 'רכז/ת שכבה' },
  { value: 'student', label: 'תלמיד/ה' },
  { value: 'parent', label: 'הורה' },
];

export default function Profile({ user, role }) {
  const { updateCurrentUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [requestedRole, setRequestedRole] = useState('');
  const [requestScope, setRequestScope] = useState({ grade: '', className: '' });
  const [form, setForm] = useState({
    profile_full_name: getUserDisplayName(user) || '',
    profile_phone: user?.profile_phone || '',
    profile_email: user?.profile_email || user?.email || '',
    profile_address: user?.profile_address || '',
    role: user?.role || 'student',
    profile_homeroom_class: user?.profile_homeroom_class || user?.profile_class || '',
    profile_grade_managed: user?.profile_grade_managed || extractGradeFromClass(user?.profile_homeroom_class || user?.profile_class || ''),
  });

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);

    const personalData = {
      profile_full_name: form.profile_full_name,
      profile_phone: form.profile_phone,
      profile_email: form.profile_email,
      profile_address: form.profile_address,
    };

    const savedUser = await base44.auth.updateMe(personalData);
    updateCurrentUser(savedUser || personalData);
    toast.success('הפרופיל נשמר בהצלחה');
    setSaving(false);
  };

  const handleRoleRequest = async () => {
    if (!requestedRole || approvedRoles.includes(requestedRole)) return;
    if (!requestScope.grade || !requestScope.className) {
      toast.error('יש לבחור שכבה וכיתה לבקשה');
      return;
    }
    setSaving(true);
    await base44.functions.invoke('handleApprovalRequest', {
      action: 'submit',
      full_name: form.profile_full_name,
      requested_role: requestedRole,
      class_or_grade: requestScope.className,
      subject: '',
      school_role: 'בקשת שינוי תפקיד מפרופיל אישי',
      extra_roles: ''
    });
    toast.success('בקשת שינוי התפקיד נשלחה לאישור מנהל מערכת');
    setRequestedRole('');
    setRequestScope({ grade: '', className: '' });
    setSaving(false);
  };

  const approvedRoles = getAvailableRoles(user);
  const primaryRole = getSystemRole(user);
  const currentRoleLabel = ROLE_LABELS[primaryRole] || 'משתמש';
  const additionalRoleLabels = approvedRoles.filter(item => item !== primaryRole).map(item => ROLE_LABELS[item]).filter(Boolean).join(', ') || 'אין';

  return (
    <div className="min-h-full bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <UserRound className="w-7 h-7 text-primary" />
            עריכת פרופיל
          </h1>
          <p className="text-muted-foreground mt-1">עדכון פרטים אישיים ופרטי שיוך במערכת</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>פרטים אישיים</CardTitle>
              <CardDescription>פרטים אלו יוצגו במערכת וישמרו בפרופיל שלך.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>שם מלא</Label>
                <Input value={form.profile_full_name} onChange={(e) => updateField('profile_full_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>טלפון</Label>
                <Input value={form.profile_phone} onChange={(e) => updateField('profile_phone', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>מייל</Label>
                <Input type="email" value={form.profile_email} onChange={(e) => updateField('profile_email', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>כתובת</Label>
                <Input value={form.profile_address} onChange={(e) => updateField('profile_address', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>תפקיד ושיוך</CardTitle>
              <CardDescription>התפקיד והשיוך נקבעים לפי הרשאה מאושרת. שינוי תפקיד דורש אישור מנהל מערכת.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>תפקיד ראשי מאושר</Label>
                <Input value={currentRoleLabel} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>תפקידים נוספים מאושרים</Label>
                <Input value={additionalRoleLabels} disabled className="bg-muted" />
              </div>
              <GradeClassSelect
                grade={form.profile_grade_managed}
                classNameValue={form.profile_homeroom_class}
                onGradeChange={(value) => updateField('profile_grade_managed', value)}
                onClassChange={(value) => updateField('profile_homeroom_class', value)}
                disabled
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>בקשת שינוי תפקיד</CardTitle>
              <CardDescription>הבקשה תישלח לאישור מנהל מערכת ולא תשנה הרשאות באופן מיידי.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-3">
              <Select value={requestedRole} onValueChange={setRequestedRole}>
                <SelectTrigger className="md:w-64">
                  <SelectValue placeholder="בחר/י תפקיד מבוקש" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {roles.filter(item => item.value !== 'admin').map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {requestedRole && !approvedRoles.includes(requestedRole) && (
                <GradeClassSelect
                  grade={requestScope.grade}
                  classNameValue={requestScope.className}
                  onGradeChange={(value) => setRequestScope({ grade: value, className: '' })}
                  onClassChange={(value) => setRequestScope(prev => ({ ...prev, className: value }))}
                />
              )}
              <Button type="button" variant="outline" onClick={handleRoleRequest} disabled={saving || !requestedRole || approvedRoles.includes(requestedRole) || !requestScope.grade || !requestScope.className}>
                <Send className="w-4 h-4" />
                שלח בקשה לאישור
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="min-w-32">
              <Save className="w-4 h-4" />
              {saving ? 'שומר...' : 'שמור פרטים אישיים'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}