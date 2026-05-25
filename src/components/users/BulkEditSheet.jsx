import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GradeClassSelect from '@/components/profile/GradeClassSelect';
import { ROLE_LABELS, SYSTEM_ROLE_PRIORITY, getAvailableRoles } from '@/lib/roleUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ROLE_OPTIONS = SYSTEM_ROLE_PRIORITY.filter(r => r !== 'parent').map(value => ({ value, label: ROLE_LABELS[value] }));
const NO_CHANGE = '__no_change__';

export default function BulkEditSheet({ users, open, onOpenChange, onSaved, currentUserId }) {
  const [form, setForm] = useState({ primaryRole: NO_CHANGE, extraRoles: [], extraMode: 'no_change', grade: NO_CHANGE, classId: '', className: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ primaryRole: NO_CHANGE, extraRoles: [], extraMode: 'no_change', grade: NO_CHANGE, classId: '', className: '' });
  }, [open]);

  if (!users?.length) return null;

  const toggleExtraRole = (role) => setForm(prev => {
    const exists = prev.extraRoles.includes(role);
    return { ...prev, extraRoles: exists ? prev.extraRoles.filter(r => r !== role) : [...prev.extraRoles, role] };
  });

  const save = async () => {
    setSaving(true);
    let updatedSelf = null;
    let failed = 0;
    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const currentApproved = getAvailableRoles(u);
      const currentPrimary = u.role || currentApproved[0] || 'student';
      const nextPrimary = form.primaryRole !== NO_CHANGE ? form.primaryRole : currentPrimary;

      let nextApproved;
      if (form.extraMode === 'replace') {
        nextApproved = Array.from(new Set([nextPrimary, ...form.extraRoles]));
      } else if (form.extraMode === 'add') {
        nextApproved = Array.from(new Set([nextPrimary, ...currentApproved.filter(r => r !== currentPrimary), ...form.extraRoles]));
      } else {
        nextApproved = Array.from(new Set([nextPrimary, ...currentApproved.filter(r => r !== currentPrimary)]));
      }

      const payload = {
        action: 'admin_update_user',
        target_user_id: u.id,
        target_email: u.email,
        target_role: nextPrimary,
        approved_roles: nextApproved,
        profile_class_id: form.classId || u.profile_class_id || '',
        profile_homeroom_class: form.className || u.profile_homeroom_class || u.profile_class || '',
        profile_grade_managed: form.grade !== NO_CHANGE ? form.grade : (u.profile_grade_managed || ''),
      };
      try {
        const res = await base44.functions.invoke('handleApprovalRequest', payload);
        if (u.id === currentUserId) updatedSelf = res.data.user;
      } catch (err) {
        failed += 1;
      }
      // small delay between calls to avoid rate limits
      if (i < users.length - 1) await new Promise(r => setTimeout(r, 250));
    }
    if (failed) toast.error(`עודכנו ${users.length - failed}, נכשלו ${failed}`);
    else toast.success(`עודכנו ${users.length} משתמשים`);
    setSaving(false);
    onSaved?.(updatedSelf);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto" dir="rtl">
        <SheetHeader className="text-right">
          <SheetTitle>עדכון הרשאות מרובות</SheetTitle>
          <SheetDescription>{users.length} משתמשים נבחרו. שדות שלא נבחר בהם ערך לא ישתנו.</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <div className="space-y-2">
            <Label>תפקיד ראשי</Label>
            <Select value={form.primaryRole} onValueChange={value => setForm(prev => ({ ...prev, primaryRole: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value={NO_CHANGE}>ללא שינוי</SelectItem>
                {ROLE_OPTIONS.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <GradeClassSelect
              grade={form.grade === NO_CHANGE ? '' : form.grade}
              classNameValue={form.className}
              classId={form.classId}
              onGradeChange={(value) => setForm(prev => ({ ...prev, grade: value || NO_CHANGE }))}
              onClassChange={(value) => setForm(prev => ({ ...prev, className: value }))}
              onClassIdChange={(value) => setForm(prev => ({ ...prev, classId: value }))}
            />
            <p className="text-xs text-muted-foreground -mt-1">שאר ריק לשמירת ערכים קיימים לכל משתמש.</p>
          </div>

          <div className="space-y-2">
            <Label>תפקידים נוספים</Label>
            <Select value={form.extraMode} onValueChange={value => setForm(prev => ({ ...prev, extraMode: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="no_change">ללא שינוי</SelectItem>
                <SelectItem value="add">הוסף תפקידים נבחרים</SelectItem>
                <SelectItem value="replace">החלף תפקידים נוספים</SelectItem>
              </SelectContent>
            </Select>
            {form.extraMode !== 'no_change' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {ROLE_OPTIONS.filter(item => item.value !== (form.primaryRole === NO_CHANGE ? null : form.primaryRole)).map(item => {
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
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>ביטול</Button>
            <Button className="flex-1" onClick={save} disabled={saving}>
              {saving ? 'שומר...' : `שמור (${users.length})`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}