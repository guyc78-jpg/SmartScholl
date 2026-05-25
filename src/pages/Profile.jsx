import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, UserRound, Send, School } from 'lucide-react';
import GradeClassSelect from '@/components/profile/GradeClassSelect';
import UserPermissionEditor from '@/components/profile/UserPermissionEditor';
import WorkModeSelector from '@/components/layout/WorkModeSelector';
import ClassChangeRequestCard from '@/components/profile/ClassChangeRequestCard';
import ThemePreferenceCard from '@/components/profile/ThemePreferenceCard';
import { invalidateSchoolNameCache } from '@/components/layout/SchoolNameBanner';
import { extractGradeFromClass } from '@/lib/schoolStructure';
import { getAvailableRoles, getSystemRole, getUserDisplayName, getRoleLabel, GENDER_OPTIONS } from '@/lib/roleUtils';
import { useAuth } from '@/lib/AuthContext';

const roles = [
  { value: 'admin', label: 'מנהל/ת מערכת' },
  { value: 'homeroom_teacher', label: 'מחנך/ת כיתה' },
  { value: 'coordinator', label: 'רכז/ת שכבה' },
  { value: 'student', label: 'תלמיד/ה' },
  { value: 'parent', label: 'הורה' },
];

export default function Profile({ user, role, onRoleChange, themePreference, onThemePreferenceChange }) {
  const { updateCurrentUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [requestedRole, setRequestedRole] = useState('');
  const [requestScope, setRequestScope] = useState({ grade: '', className: '', classId: '' });
  const [form, setForm] = useState({
    profile_full_name: getUserDisplayName(user) || '',
    profile_phone: user?.profile_phone || '',
    profile_email: user?.profile_email || user?.email || '',
    profile_address: user?.profile_address || '',
    profile_gender: user?.profile_gender || '',
    role: user?.role || 'student',
    profile_class_id: user?.profile_class_id || '',
    profile_homeroom_class: user?.profile_homeroom_class || user?.profile_class || '',
    profile_homeroom_teacher: user?.profile_homeroom_teacher || '',
    profile_tracks: user?.profile_tracks || '',
    profile_grade_managed: user?.profile_grade_managed || extractGradeFromClass(user?.profile_homeroom_class || user?.profile_class || ''),
    school_name: user?.school_name || '',
  });

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.profile_gender) {
      toast.error('יש לבחור לשון פנייה (שדה חובה)');
      return;
    }
    setSaving(true);

    const personalData = {
      profile_full_name: form.profile_full_name,
      profile_phone: form.profile_phone,
      profile_email: form.profile_email,
      profile_address: form.profile_address,
      profile_gender: form.profile_gender,
    };
    if (isAdmin) personalData.school_name = form.school_name?.trim() || '';

    const savedUser = await base44.auth.updateMe(personalData);
    updateCurrentUser(savedUser || personalData);
    if (isAdmin) invalidateSchoolNameCache();
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
      class_id: requestScope.classId,
      subject: '',
      school_role: 'בקשת שינוי תפקיד מפרופיל אישי',
      extra_roles: ''
    });
    toast.success('בקשת שינוי התפקיד נשלחה לאישור מנהל מערכת');
    setRequestedRole('');
    setRequestScope({ grade: '', className: '', classId: '' });
    setSaving(false);
  };

  const approvedRoles = getAvailableRoles(user);
  const isAdmin = approvedRoles.includes('admin');
  const primaryRole = getSystemRole(user);
  const currentRoleLabel = getRoleLabel(primaryRole, user);
  const additionalRoleLabels = approvedRoles.filter(item => item !== primaryRole).map(item => getRoleLabel(item, user)).filter(Boolean).join(', ') || 'אין';
  const hasMultipleRoles = approvedRoles.length > 1;
  const staffRoles = ['admin', 'homeroom_teacher', 'coordinator'];
  const isStaffProfile = approvedRoles.some(item => staffRoles.includes(item));
  const isStudentProfile = approvedRoles.includes('student') && !isStaffProfile;
  const canRequestRoleChange = isStaffProfile && !isAdmin;

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
              <div className="space-y-2 md:col-span-2">
                <Label>
                  לשון פנייה <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {GENDER_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField('profile_gender', option.value)}
                      className={`py-2.5 px-4 rounded-lg border-2 text-sm font-semibold transition-colors ${
                        form.profile_gender === option.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-foreground/80 hover:border-primary/40'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">משפיע רק על ניסוחי תפקיד במערכת (לא על הרשאות).</p>
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="w-5 h-5 text-primary" />
                  הגדרות מערכת
                </CardTitle>
                <CardDescription>שם בית הספר יוצג בעדינות בדשבורד ובכותרת המערכת.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-w-md">
                  <Label>שם בית הספר</Label>
                  <Input
                    value={form.school_name}
                    onChange={(e) => updateField('school_name', e.target.value)}
                    placeholder="לדוגמה: תיכון הראל"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {onThemePreferenceChange && (
            <Card>
              <CardHeader>
                <CardTitle>הגדרות תצוגה</CardTitle>
              </CardHeader>
              <CardContent>
                <ThemePreferenceCard preference={themePreference || 'system'} onChange={onThemePreferenceChange} />
              </CardContent>
            </Card>
          )}

          {hasMultipleRoles && onRoleChange && (
            <Card>
              <CardHeader>
                <CardTitle>מצב עבודה</CardTitle>
                <CardDescription>בחר/י את התפקיד הפעיל שיוצג בתפריט ובדשבורד.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-xs">
                  <WorkModeSelector user={user} activeRole={role} onRoleChange={onRoleChange} />
                </div>
              </CardContent>
            </Card>
          )}

          {isAdmin ? (
            <UserPermissionEditor
              targetUser={user}
              currentUser={user}
              onSaved={(savedUser) => updateCurrentUser(savedUser)}
            />
          ) : isStudentProfile ? (
            <Card>
              <CardHeader>
                <CardTitle>פרטי תלמיד/ה</CardTitle>
                <CardDescription>שיוך הכיתה מוצג לפי ההרשאה המאושרת. שינוי כיתה מתבצע רק דרך בקשת שינוי כיתה.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GradeClassSelect
                  grade={form.profile_grade_managed}
                  classNameValue={form.profile_homeroom_class}
                  classId={form.profile_class_id}
                  onGradeChange={(value) => updateField('profile_grade_managed', value)}
                  onClassChange={(value) => updateField('profile_homeroom_class', value)}
                  onClassIdChange={(value) => updateField('profile_class_id', value)}
                  disabled
                />
                <div className="space-y-2">
                  <Label>מחנך/ת</Label>
                  <Input value={form.profile_homeroom_teacher || 'לא הוגדר'} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>מגמה</Label>
                  <Input value={form.profile_tracks || 'לא הוגדרה'} disabled className="bg-muted" />
                </div>
              </CardContent>
            </Card>
          ) : (
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
                  classId={form.profile_class_id}
                  onGradeChange={(value) => updateField('profile_grade_managed', value)}
                  onClassChange={(value) => updateField('profile_homeroom_class', value)}
                  onClassIdChange={(value) => updateField('profile_class_id', value)}
                  disabled
                />
              </CardContent>
            </Card>
          )}

          {isStudentProfile && (
            <ClassChangeRequestCard user={user} displayName={form.profile_full_name} />
          )}

          {canRequestRoleChange && (
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
                    classId={requestScope.classId}
                    onGradeChange={(value) => setRequestScope({ grade: value, className: '', classId: '' })}
                    onClassChange={(value) => setRequestScope(prev => ({ ...prev, className: value }))}
                    onClassIdChange={(value) => setRequestScope(prev => ({ ...prev, classId: value }))}
                  />
                )}
                <Button type="button" variant="outline" onClick={handleRoleRequest} disabled={saving || !requestedRole || approvedRoles.includes(requestedRole) || !requestScope.grade || !requestScope.classId}>
                  <Send className="w-4 h-4" />
                  שלח בקשה לאישור
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center pt-6">
            <Button type="submit" disabled={saving} className="w-full sm:w-72">
              <Save className="w-4 h-4" />
              {saving ? 'שומר...' : 'שמור פרטים אישיים'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}