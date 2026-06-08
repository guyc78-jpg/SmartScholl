import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, UserRound, School, Palette, Briefcase } from 'lucide-react';
import WorkModeSelector from '@/components/layout/WorkModeSelector';
import ThemePreferenceCard from '@/components/profile/ThemePreferenceCard';
import ProfileAvatarPicker from '@/components/profile/ProfileAvatarPicker';
import { invalidateSchoolNameCache } from '@/components/layout/SchoolNameBanner';
import { getAvailableRoles, getUserDisplayName, GENDER_OPTIONS, getDefaultDisplayRole, getRoleContextLabel } from '@/lib/roleUtils';
import { logActivity } from '@/lib/activityLogger';
import { useAuth } from '@/lib/AuthContext';

export default function Profile({ user, role, onRoleChange, themePreference, onThemePreferenceChange }) {
  const { updateCurrentUser } = useAuth();
  const approvedRoles = getAvailableRoles(user);
  const primaryDisplayRole = getDefaultDisplayRole(user, role);
  const isAdmin = approvedRoles.includes('admin') || approvedRoles.includes('system_admin');
  const hasMultipleRoles = approvedRoles.length > 1;
  const hasTeachingRole = approvedRoles.some(item => ['division_manager', 'grade_coordinator', 'coordinator', 'homeroom_teacher'].includes(item));
  const canSetSubjectArea = hasTeachingRole;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    profile_full_name: getUserDisplayName(user) || '',
    profile_phone: user?.profile_phone || '',
    profile_email: user?.profile_email || user?.email || '',
    profile_address: user?.profile_address || '',
    profile_gender: user?.profile_gender || '',
    profile_image_mode: user?.profile_image_mode || (user?.profile_photo_url ? 'photo' : 'avatar'),
    profile_photo_url: user?.profile_photo_url || '',
    profile_avatar: user?.profile_avatar || (user?.profile_gender === 'female' ? 'female_teacher' : 'male_teacher'),
    school_name: user?.school_name || '',
    profile_extra_roles: user?.profile_extra_roles || '',
    profile_subject_area: user?.profile_subject_area || user?.profile_subject || '',
  });

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.profile_gender) {
      toast.error('יש לבחור לשון פנייה (שדה חובה)');
      return;
    }
    setSaving(true);
    const data = {
      profile_full_name: form.profile_full_name,
      profile_phone: form.profile_phone,
      profile_email: form.profile_email,
      profile_address: form.profile_address,
      profile_gender: form.profile_gender,
      profile_image_mode: form.profile_image_mode || 'avatar',
      profile_photo_url: form.profile_photo_url || '',
      profile_avatar: form.profile_avatar || (form.profile_gender === 'female' ? 'female_teacher' : 'male_teacher'),
      profile_extra_roles: form.profile_extra_roles?.trim() || '',
      profile_display_primary_role: primaryDisplayRole,
      profile_display_additional_roles: [],
      profile_subject_area: canSetSubjectArea ? form.profile_subject_area?.trim() || '' : '',
      profile_subject: canSetSubjectArea ? form.profile_subject_area?.trim() || '' : user?.profile_subject || '',
    };
    if (isAdmin) data.school_name = form.school_name?.trim() || '';
    const savedUser = await base44.auth.updateMe(data);
    updateCurrentUser(savedUser || data);
    await logActivity({
      user: { ...user, ...data },
      role,
      actionName: 'profile_display_settings_updated',
      details: `עודכן פרופיל אישי: ${getRoleContextLabel({ ...user, ...data }, primaryDisplayRole)}`,
      metadata: {
        primaryRole: primaryDisplayRole,
        extraRoleText: data.profile_extra_roles,
        subjectArea: data.profile_subject_area,
      },
    });
    if (isAdmin) invalidateSchoolNameCache();
    toast.success('הפרופיל נשמר בהצלחה');
    setSaving(false);
  };

  return (
    <div className="min-h-full bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="mb-2">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <UserRound className="w-5 h-5 text-primary" />
            פרופיל אישי
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">עדכון פרטים אישיים והגדרות מערכת</p>
        </div>

        {/* פרטים אישיים */}
        <form onSubmit={handleSave}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">פרטים אישיים</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">שם מלא</Label>
                <Input
                  value={form.profile_full_name}
                  onChange={(e) => updateField('profile_full_name', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">טלפון</Label>
                <Input
                  value={form.profile_phone}
                  onChange={(e) => updateField('profile_phone', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">מייל</Label>
                <Input
                  type="email"
                  value={form.profile_email}
                  onChange={(e) => updateField('profile_email', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">כתובת</Label>
                <Input
                  value={form.profile_address}
                  onChange={(e) => updateField('profile_address', e.target.value)}
                  className="h-9"
                />
              </div>

              {/* לשון פנייה */}
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">
                  לשון פנייה <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {GENDER_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField('profile_gender', option.value)}
                      className={`py-2 px-4 rounded-lg border-2 text-sm font-semibold transition-colors ${
                        form.profile_gender === option.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-foreground/80 hover:border-primary/40'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">משפיע על ניסוחי תפקיד בלבד.</p>
              </div>

              <ProfileAvatarPicker value={form} onChange={setForm} />

              {/* תצוגת תפקיד — לתצוגה בלבד, לא משנה הרשאות */}
              <div className="space-y-3 md:col-span-2 pt-1 border-t border-border text-right" dir="rtl">
                <div className="rounded-xl border bg-muted/30 p-3 text-right" dir="rtl">
                  <Label className="text-xs text-muted-foreground">תפקיד ראשי</Label>
                  <p className="mt-1 text-sm font-semibold text-foreground">{getRoleContextLabel(user, primaryDisplayRole)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">התפקיד הראשי נקבע על ידי מנהל מערכת בלבד.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">תפקיד נוסף לתצוגה בלבד</Label>
                  <Input
                    value={form.profile_extra_roles}
                    onChange={(e) => updateField('profile_extra_roles', e.target.value)}
                    placeholder="לדוגמה: רכז/ת טיולים, מוביל/ת תקשוב"
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground text-right">טקסט זה יוצג מתחת לתפקיד הראשי ואינו משנה הרשאות או מסכים.</p>
                </div>

                {canSetSubjectArea && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">מקצוע/תחום דעת</Label>
                    <Input
                      value={form.profile_subject_area}
                      onChange={(e) => updateField('profile_subject_area', e.target.value)}
                      placeholder="לדוגמה: מתמטיקה, מדעים, חינוך חברתי"
                      className="h-9"
                    />
                  </div>
                )}
              </div>

              {/* שם בית ספר — מנהלים בלבד */}
              {isAdmin && (
                <div className="space-y-1.5 md:col-span-2 pt-1 border-t border-border">
                  <Label className="text-xs flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-primary" />
                    שם בית הספר
                  </Label>
                  <Input
                    value={form.school_name}
                    onChange={(e) => updateField('school_name', e.target.value)}
                    placeholder="לדוגמה: תיכון הראל"
                    className="h-9 max-w-sm"
                  />
                </div>
              )}

              <div className="md:col-span-2 pt-1">
                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  <Save className="w-4 h-4" />
                  {saving ? 'שומר...' : 'שמור פרטים אישיים'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* מצב עבודה — רק אם יש כמה תפקידים */}
        {hasMultipleRoles && onRoleChange && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">מצב עבודה</CardTitle>
              </div>
              <CardDescription className="text-xs text-right">בחירה זו זמינה רק למנהל מערכת עם כמה תפקידים אמיתיים.</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <WorkModeSelector user={user} activeRole={role} onRoleChange={onRoleChange} />
            </CardContent>
          </Card>
        )}

        {/* הגדרות תצוגה */}
        {onThemePreferenceChange && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">הגדרות תצוגה</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <ThemePreferenceCard preference={themePreference || 'system'} onChange={onThemePreferenceChange} />
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}