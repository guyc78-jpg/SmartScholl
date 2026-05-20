import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, UserRound } from 'lucide-react';

const roles = [
  { value: 'admin', label: 'מנהל/ת מערכת' },
  { value: 'homeroom_teacher', label: 'מחנך/ת כיתה' },
  { value: 'coordinator', label: 'רכז/ת שכבה' },
  { value: 'student', label: 'תלמיד/ה' },
  { value: 'parent', label: 'הורה' },
];

export default function Profile({ user, role }) {
  const isAdmin = role === 'admin';
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    profile_full_name: user?.profile_full_name || user?.full_name || '',
    profile_phone: user?.profile_phone || '',
    profile_email: user?.profile_email || user?.email || '',
    profile_address: user?.profile_address || '',
    role: user?.role || 'student',
    profile_homeroom_class: user?.profile_homeroom_class || user?.profile_class || '',
    profile_grade_managed: user?.profile_grade_managed || '',
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

    const adminData = isAdmin ? {
      role: form.role,
      roles: [form.role],
      available_roles: [form.role],
      active_work_role: form.role,
      profile_homeroom_class: form.profile_homeroom_class,
      profile_grade_managed: form.profile_grade_managed,
    } : {};

    await base44.auth.updateMe({ ...personalData, ...adminData });
    toast.success('הפרופיל נשמר בהצלחה');
    setSaving(false);
    setTimeout(() => window.location.reload(), 500);
  };

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
              <CardDescription>{isAdmin ? 'רק מנהל מערכת יכול לערוך שדות אלו.' : 'שדות אלו ניתנים לעריכה על ידי מנהל מערכת בלבד.'}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>תפקיד</Label>
                <Select value={form.role} onValueChange={(value) => updateField('role', value)} disabled={!isAdmin}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {roles.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>כיתה משויכת</Label>
                <Input value={form.profile_homeroom_class} onChange={(e) => updateField('profile_homeroom_class', e.target.value)} disabled={!isAdmin} placeholder="לדוגמה: י׳1" />
              </div>
              <div className="space-y-2">
                <Label>שכבה משויכת</Label>
                <Input value={form.profile_grade_managed} onChange={(e) => updateField('profile_grade_managed', e.target.value)} disabled={!isAdmin} placeholder="לדוגמה: י׳" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="min-w-32">
              <Save className="w-4 h-4" />
              {saving ? 'שומר...' : 'שמור פרופיל'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}