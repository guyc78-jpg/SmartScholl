import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import GradeClassSelect from '@/components/profile/GradeClassSelect';
import { extractGradeFromClass } from '@/lib/schoolStructure';
import { ROLE_LABELS, SYSTEM_ROLE_PRIORITY, getAvailableRoles, getUserDisplayName } from '@/lib/roleUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ROLE_OPTIONS = SYSTEM_ROLE_PRIORITY.filter(r => r !== 'parent').map(value => ({ value, label: ROLE_LABELS[value] }));

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
      primaryRole: primary,
      extraRoles: approved.filter(r => r !== primary),
      profile_class_id: targetUser.profile_class_id || '',
      profile_homeroom_class: targetUser.profile_homeroom_class || targetUser.profile_class || '',
      profile_grade_managed: targetUser.profile_grade_managed || extractGradeFromClass(targetUser.profile_homeroom_class || targetUser.profile_class || ''),
    });
  }, [targetUser]);

  if (!form || !targetUser) return null;

  const setPrimaryRole = (value) => setForm(prev => ({
    ...prev,
    primaryRole: value,
    extraRoles: prev.extraRoles.filter(r => r !== value),
  }));

  const toggleExtraRole = (role) => setForm(prev => {
    if (role === prev.primaryRole) return prev;
    const exists = prev.extraRoles.includes(role);
    return { ...prev, extraRoles: exists ? prev.extraRoles.filter(r => r !== role) : [...prev.extraRoles, role] };
  });

  const save = async () => {
    setSaving(true);
    const approvedRoles = Array.from(new Set([form.primaryRole, ...form.extraRoles]));
    const res = await base44.functions.invoke('handleApprovalRequest', {
      action: 'admin_update_user',
      target_user_id: targetUser.id,
      target_email: targetUser.email,
      target_role: form.primaryRole,
      approved_roles: approvedRoles,
      profile_class_id: form.profile_class_id,
      profile_homeroom_class: form.profile_homeroom_class,
      profile_grade_managed: form.profile_grade_managed,
    });
    toast.success('ההרשאות נשמרו');
    setSaving(false);
    onSaved?.(res.data.user, targetUser.id === currentUserId);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto" dir="rtl">
        <SheetHeader className="text-right">
          <SheetTitle>{getUserDisplayName(targetUser)}</SheetTitle>
          <SheetDescription className="force-ltr text-right">{targetUser.email}</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <div className="space-y-2">
            <Label>תפקיד ראשי</Label>
            <Select value={form.primaryRole} onValueChange={setPrimaryRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent dir="rtl">
                {ROLE_OPTIONS.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <GradeClassSelect
              grade={form.profile_grade_managed}
              classNameValue={form.profile_homeroom_class}
              classId={form.profile_class_id}
              onGradeChange={(value) => setForm(prev => ({ ...prev, profile_grade_managed: value }))}
              onClassChange={(value) => setForm(prev => ({ ...prev, profile_homeroom_class: value }))}
              onClassIdChange={(value) => setForm(prev => ({ ...prev, profile_class_id: value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>תפקידים נוספים / מאושרים</Label>
            <p className="text-xs text-muted-foreground">התפקיד הראשי כבר נכלל בהרשאות ואינו מופיע כאן.</p>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.filter(item => item.value !== form.primaryRole).map(item => {
                const selected = form.extraRoles.includes(item.value);
                return (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() => toggleExtraRole(item.value)}
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

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>ביטול</Button>
            <Button className="flex-1" onClick={save} disabled={saving}>
              {saving ? 'שומר...' : 'שמור הרשאות'}
            </Button>
          </div>

          {targetUser.id !== currentUserId && (
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                onClick={() => setConfirmDelete(true)}
                disabled={saving || deleting}
              >
                <Trash2 className="w-4 h-4" />
                מחק משתמש מהמערכת
              </Button>
            </div>
          )}
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