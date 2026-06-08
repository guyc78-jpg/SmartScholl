import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trash2, UserRound, ShieldCheck, School, Settings } from 'lucide-react';
import GradeClassSelect from '@/components/profile/GradeClassSelect';
import { extractGradeFromClass, DIVISIONS } from '@/lib/schoolStructure';
import { ROLE_LABELS, SYSTEM_ROLE_PRIORITY, getAvailableRoles, getUserDisplayName } from '@/lib/roleUtils';
import { toast } from 'sonner';

const ROLE_OPTIONS = SYSTEM_ROLE_PRIORITY.filter(r => r !== 'parent').map(value => ({ value, label: ROLE_LABELS[value] }));
const STATUS_OPTIONS = [
  { value: 'active', label: 'פעיל' },
  { value: 'pending', label: 'ממתין' },
  { value: 'disabled', label: 'מושבת' },
  { value: 'rejected', label: 'נדחה' },
];
const ONBOARDING_OPTIONS = [
  { value: 'approved', label: 'מאושר' },
  { value: 'pending', label: 'טיוטה / התחלה' },
  { value: 'awaiting_approval', label: 'ממתין לאישור' },
  { value: 'rejected', label: 'נדחה' },
];

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border bg-card p-4 space-y-4 text-right" dir="rtl">
      <div className="flex items-center gap-2 justify-end flex-row-reverse">
        <Icon className="w-4 h-4 text-primary flex-shrink-0" />
        <h3 className="text-sm font-semibold text-foreground flex-1 text-right">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function UserEditSheet({ targetUser, open, onOpenChange, onSaved, onDeleted, currentUserId }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!targetUser) return;
    const approved = getAvailableRoles(targetUser);
    const primary = targetUser.role || approved[0] || 'student';
    setForm({
      profile_full_name: targetUser.profile_full_name || getUserDisplayName(targetUser) || '',
      profile_email: targetUser.profile_email || targetUser.email || '',
      profile_phone: targetUser.profile_phone || '',
      profile_school_role: targetUser.profile_school_role || '',
      primaryRole: primary,
      profile_extra_roles: targetUser.profile_extra_roles || '',
      profile_class_id: targetUser.profile_class_id || '',
      profile_homeroom_class: targetUser.profile_homeroom_class || targetUser.profile_class || '',
      profile_grade_managed: targetUser.profile_grade_managed || extractGradeFromClass(targetUser.profile_homeroom_class || targetUser.profile_class || ''),
      profile_division: targetUser.profile_division || '',
      profile_subject: targetUser.profile_subject || '',
      onboarding_status: targetUser.onboarding_status || 'approved',
      status: targetUser.status || 'active',
    });
  }, [targetUser]);

  if (!form || !targetUser) return null;

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const setPrimaryRole = (value) => setForm(prev => ({ ...prev, primaryRole: value }));

  const approvedRoles = [form.primaryRole].filter(Boolean);
  const isDivisionManager = approvedRoles.includes('division_manager');

  const save = async () => {
    const cleanName = form.profile_full_name.trim();
    if (!cleanName) {
      toast.error('יש למלא שם מלא');
      return;
    }

    setSaving(true);
    try {
      const res = await base44.functions.invoke('handleApprovalRequest', {
        action: 'admin_update_user',
        target_user_id: targetUser.id,
        target_email: targetUser.email,
        target_role: form.primaryRole,
        approved_roles: approvedRoles,
        profile_full_name: cleanName,
        profile_extra_roles: form.profile_extra_roles.trim(),
        profile_email: form.profile_email.trim(),
        profile_phone: form.profile_phone.trim(),
        profile_school_role: form.profile_school_role.trim(),
        profile_class_id: isDivisionManager ? '' : form.profile_class_id,
        profile_homeroom_class: isDivisionManager ? '' : form.profile_homeroom_class,
        profile_grade_managed: form.profile_grade_managed,
        profile_division: isDivisionManager ? form.profile_division : '',
        profile_subject: form.profile_subject.trim(),
        onboarding_status: form.onboarding_status,
        status: form.status,
      });
      toast.success('פרטי המשתמש וההרשאות נשמרו בהצלחה');
      onSaved?.(res.data.user, targetUser.id === currentUserId);
      onOpenChange(false);
    } catch (err) {
      toast.error('לא הצלחנו לשמור את השינויים. נסה/י שוב.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-xl h-full p-0 overflow-hidden" dir="rtl">
        <div className="h-full flex flex-col text-right" dir="rtl">
          <SheetHeader className="px-4 sm:px-6 py-4 border-b text-right">
            <SheetTitle>עריכת משתמש</SheetTitle>
            <SheetDescription className="text-right">
              {getUserDisplayName(targetUser)} · <span className="force-ltr text-right inline-block">{targetUser.email}</span>
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
            <Section icon={UserRound} title="פרטים אישיים">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label>שם מלא</Label>
                  <Input value={form.profile_full_name} onChange={(e) => setField('profile_full_name', e.target.value)} placeholder="שם מלא לתצוגה" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>מייל ליצירת קשר</Label>
                  <Input type="email" value={form.profile_email} onChange={(e) => setField('profile_email', e.target.value)} placeholder="כתובת מייל" />
                  <p className="text-xs text-muted-foreground">מייל התחברות: <span className="force-ltr inline-block">{targetUser.email}</span></p>
                </div>
                <div className="space-y-2">
                  <Label>טלפון</Label>
                  <Input value={form.profile_phone} onChange={(e) => setField('profile_phone', e.target.value)} placeholder="טלפון" />
                </div>
                <div className="space-y-2">
                  <Label>תפקיד בבית הספר</Label>
                  <Input value={form.profile_school_role} onChange={(e) => setField('profile_school_role', e.target.value)} placeholder="לדוגמה: מורה מקצועי/ת" />
                </div>
              </div>
            </Section>

            <Section icon={ShieldCheck} title="תפקידים והרשאות">
              <div className="space-y-2">
                <Label>תפקיד ראשי</Label>
                <Select value={form.primaryRole} onValueChange={setPrimaryRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {ROLE_OPTIONS.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>תפקיד נוסף לתצוגה בלבד</Label>
                <Input
                  value={form.profile_extra_roles}
                  onChange={(e) => setField('profile_extra_roles', e.target.value)}
                  placeholder="לדוגמה: רכז/ת טיולים, מוביל/ת תקשוב"
                />
                <p className="text-xs text-muted-foreground text-right">טקסט חופשי בלבד — לא משנה הרשאות או מסכים.</p>
              </div>
            </Section>

            <Section icon={School} title="שיוך לכיתה / שכבה">
              {isDivisionManager ? (
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label>סוג חטיבה</Label>
                    <Select value={form.profile_division} onValueChange={(value) => setField('profile_division', value)}>
                      <SelectTrigger><SelectValue placeholder="בחר/י סוג חטיבה" /></SelectTrigger>
                      <SelectContent dir="rtl">
                        {Object.entries(DIVISIONS).map(([key, item]) => (
                          <SelectItem key={key} value={key}>{item.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>תחום דעת / מקצוע</Label>
                    <Input value={form.profile_subject} onChange={(e) => setField('profile_subject', e.target.value)} placeholder="לדוגמה: מתמטיקה" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <GradeClassSelect
                    grade={form.profile_grade_managed}
                    classNameValue={form.profile_homeroom_class}
                    classId={form.profile_class_id}
                    onGradeChange={(value) => setField('profile_grade_managed', value)}
                    onClassChange={(value) => setField('profile_homeroom_class', value)}
                    onClassIdChange={(value) => setField('profile_class_id', value)}
                  />
                  <div className="space-y-2">
                    <Label>תחום דעת / מקצוע</Label>
                    <Input value={form.profile_subject} onChange={(e) => setField('profile_subject', e.target.value)} placeholder="לדוגמה: אנגלית" />
                  </div>
                </div>
              )}
            </Section>

            <Section icon={Settings} title="פעולות ניהול">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>סטטוס משתמש</Label>
                  <Select value={form.status} onValueChange={(value) => setField('status', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent dir="rtl">
                      {STATUS_OPTIONS.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>סטטוס הרשמה</Label>
                  <Select value={form.onboarding_status} onValueChange={(value) => setField('onboarding_status', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent dir="rtl">
                      {ONBOARDING_OPTIONS.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {targetUser.id !== currentUserId && (
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving || deleting}
                >
                  <Trash2 className="w-4 h-4" />
                  מחק משתמש מהמערכת
                </Button>
              )}
            </Section>
          </div>

          <div className="border-t bg-card px-4 sm:px-6 py-3 flex gap-2" dir="rtl">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>ביטול</Button>
            <Button className="flex-1" onClick={save} disabled={saving}>
              {saving ? 'שומר...' : 'שמור שינויים'}
            </Button>
          </div>
        </div>

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent dir="rtl" className="text-right">
            <AlertDialogHeader>
              <AlertDialogTitle>למחוק את המשתמש?</AlertDialogTitle>
              <AlertDialogDescription>
                המשתמש {getUserDisplayName(targetUser)} יימחק לצמיתות מהמערכת. הפעולה אינה ניתנת לביטול.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel disabled={deleting}>ביטול</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async (e) => {
                  e.preventDefault();
                  setDeleting(true);
                  try {
                    await base44.functions.invoke('handleApprovalRequest', {
                      action: 'delete_user',
                      target_user_id: targetUser.id,
                      target_email: targetUser.email,
                    });
                    toast.success('המשתמש נמחק');
                    setConfirmDelete(false);
                    onOpenChange(false);
                    onDeleted?.();
                  } catch (err) {
                    toast.error('שגיאה במחיקת המשתמש');
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
              >
                {deleting ? 'מוחק...' : 'מחק'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}