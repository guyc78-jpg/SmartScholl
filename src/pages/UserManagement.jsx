import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import EmptyState from '@/components/ui/EmptyState';
import { ShieldCheck, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/lib/roleUtils';
import { GRADES, DIVISIONS, formatGrade } from '@/lib/schoolStructure';

const ROLE_OPTIONS = [
  { value: 'homeroom_teacher', label: ROLE_LABELS.homeroom_teacher },
  { value: 'grade_coordinator', label: ROLE_LABELS.grade_coordinator },
  { value: 'division_manager', label: ROLE_LABELS.division_manager },
  { value: 'system_admin', label: ROLE_LABELS.system_admin },
];

const emptyForm = {
  fullName: '',
  email: '',
  role: 'homeroom_teacher',
  classId: '',
  gradeId: '',
  homeroomClassId: '',
  divisionType: 'upper',
  isActive: true,
};

function scopeFromForm(form) {
  if (form.role === 'homeroom_teacher') return { classId: form.classId };
  if (form.role === 'grade_coordinator') return { gradeId: form.gradeId, homeroomClassId: form.homeroomClassId || '' };
  if (form.role === 'division_manager') return { divisionType: form.divisionType };
  return null;
}

function formFromUser(user) {
  const scope = user?.scope || {};
  return {
    id: user.id,
    fullName: user.fullName || '',
    email: user.email || '',
    role: user.role || 'homeroom_teacher',
    classId: scope.classId || '',
    gradeId: scope.gradeId || user.gradeId || '',
    homeroomClassId: user.homeroomClassId || scope.homeroomClassId || '',
    divisionType: scope.divisionType || 'upper',
    isActive: user.isActive !== false,
  };
}

function scopeLabel(user) {
  const scope = user.scope || {};
  if (user.role === 'homeroom_teacher') return scope.classId || 'לא הוגדרה כיתה';
  if (user.role === 'grade_coordinator') {
    const gradeLabel = scope.gradeId ? `שכבה ${formatGrade(scope.gradeId)}` : 'לא הוגדרה שכבה';
    return (user.homeroomClassId || scope.homeroomClassId) ? `${gradeLabel} · כיתת חינוך משויכת` : gradeLabel;
  }
  if (user.role === 'division_manager') return DIVISIONS[scope.divisionType]?.label || 'לא הוגדרה חטיבה';
  if (user.role === 'system_admin') {
    const extras = [];
    if (user.homeroomClassId) extras.push('מחנך/ת');
    if (user.gradeId) extras.push(`רכז/ת שכבה ${formatGrade(user.gradeId)}`);
    return extras.length ? `גישה מלאה · ${extras.join(' · ')}` : 'גישה מלאה';
  }
  return 'גישה מלאה';
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const [usersRes, classRows] = await Promise.all([
      base44.functions.invoke('authorizeAccess', { action: 'listAuthorizedUsers' }),
      base44.entities.ClassRoom.list('grade', 500),
    ]);
    setUsers(usersRes.data.users || []);
    setClasses((classRows || []).filter(item => item.is_active !== false));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const sortedClasses = useMemo(() => {
    const gradeOrder = ['ז', 'ח', 'ט', 'י', 'יא', 'יב'];
    return [...classes].sort((a, b) => {
      const gradeDiff = gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade);
      return gradeDiff !== 0 ? gradeDiff : String(a.name || '').localeCompare(String(b.name || ''), 'he');
    });
  }, [classes]);

  const openNew = () => {
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (user) => {
    setForm(formFromUser(user));
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error('יש למלא שם מלא ומייל');
      return;
    }
    const scope = scopeFromForm(form);
    if (form.role === 'homeroom_teacher' && !scope.classId) return toast.error('יש לבחור כיתה למחנך/ת');
    if (form.role === 'grade_coordinator' && !scope.gradeId) return toast.error('יש לבחור שכבה לרכז/ת');
    if (form.role === 'grade_coordinator' && !form.homeroomClassId) return toast.error('יש לבחור גם כיתת חינוך לרכז/ת');
    if (form.role === 'system_admin' && form.gradeId && !form.homeroomClassId) return toast.error('כדי להוסיף רכז/ת שכבה למנהל/ת מערכת יש לבחור גם כיתת חינוך');
    setSaving(true);
    try {
      await base44.functions.invoke('authorizeAccess', {
        action: 'saveAuthorizedUser',
        user: {
        id: form.id,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        role: form.role,
        scope,
        homeroomClassId: ['grade_coordinator', 'system_admin'].includes(form.role) ? form.homeroomClassId : '',
        gradeId: form.role === 'system_admin' ? form.gradeId : '',
        isActive: form.isActive,
        },
      });
      toast.success('המשתמש המאושר נשמר');
      setFormOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'שגיאה בשמירת המשתמש');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await base44.functions.invoke('authorizeAccess', { action: 'deleteAuthorizedUser', id: deleteTarget.id });
      toast.success('המשתמש נמחק מטבלת המורשים');
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'שגיאה במחיקה');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12" dir="rtl"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 text-right" dir="rtl">
      <PageHeader
        title="ניהול משתמשים מאושרים"
        subtitle="הרשאות נקבעות רק לפי role ו-scope מטבלת המורשים"
        actions={<Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />הוסף משתמש</Button>}
      />

      <div className="rounded-2xl border bg-card overflow-hidden" dir="rtl">
        <div className="hidden md:grid grid-cols-[2fr_2fr_1.4fr_1.4fr_1fr_auto] gap-3 px-4 py-3 bg-muted/50 border-b text-xs font-semibold text-muted-foreground text-right">
          <div>שם מלא</div>
          <div>מייל</div>
          <div>תפקיד</div>
          <div>Scope</div>
          <div>סטטוס</div>
          <div>פעולות</div>
        </div>

        {users.length === 0 ? (
          <div className="p-8"><EmptyState icon={Users} title="אין משתמשים מאושרים" description="הוסף משתמשים מורשים כדי לאפשר כניסה למערכת" /></div>
        ) : users.map(user => (
          <div key={user.id} className="grid grid-cols-[1fr_auto] md:grid-cols-[2fr_2fr_1.4fr_1.4fr_1fr_auto] gap-3 items-center px-4 py-3 border-b last:border-b-0 text-right" dir="rtl">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{user.fullName}</p>
              <p className="md:hidden text-xs text-muted-foreground force-ltr truncate">{user.email}</p>
            </div>
            <div className="hidden md:block text-sm text-muted-foreground force-ltr truncate text-right">{user.email}</div>
            <div className="text-sm font-medium">{ROLE_LABELS[user.role] || user.role}</div>
            <div className="text-sm text-muted-foreground">{scopeLabel(user)}</div>
            <div>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${user.isActive !== false ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-destructive/10 text-destructive'}`}>
                {user.isActive !== false ? 'פעיל' : 'חסום'}
              </span>
            </div>
            <div className="flex justify-end gap-1">
              <Button size="icon" variant="ghost" onClick={() => openEdit(user)} aria-label="עריכה"><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(user)} aria-label="מחיקה"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent dir="rtl" className="text-right sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle>{form.id ? 'עריכת משתמש מאושר' : 'הוספת משתמש מאושר'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4" dir="rtl">
            <div className="space-y-2">
              <Label>שם מלא</Label>
              <Input value={form.fullName} onChange={(e) => setForm(prev => ({ ...prev, fullName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>מייל התחברות</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>תפקיד</Label>
              <Select value={form.role} onValueChange={(value) => setForm(prev => ({ ...prev, role: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  {ROLE_OPTIONS.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {form.role === 'homeroom_teacher' && (
              <div className="space-y-2">
                <Label>כיתה קבועה</Label>
                <Select value={form.classId} onValueChange={(value) => setForm(prev => ({ ...prev, classId: value }))}>
                  <SelectTrigger><SelectValue placeholder="בחר/י כיתה" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {sortedClasses.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.role === 'grade_coordinator' && (
              <div className="space-y-3" dir="rtl">
                <div className="space-y-2">
                  <Label>שכבה</Label>
                  <Select value={form.gradeId} onValueChange={(value) => setForm(prev => ({ ...prev, gradeId: value, homeroomClassId: '' }))}>
                    <SelectTrigger><SelectValue placeholder="בחר/י שכבה" /></SelectTrigger>
                    <SelectContent dir="rtl">
                      {GRADES.map(grade => <SelectItem key={grade} value={grade}>{formatGrade(grade)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>כיתת חינוך</Label>
                  <Select value={form.homeroomClassId || ''} onValueChange={(value) => setForm(prev => ({ ...prev, homeroomClassId: value }))}>
                    <SelectTrigger><SelectValue placeholder="בחר/י כיתת חינוך" /></SelectTrigger>
                    <SelectContent dir="rtl">
                      {sortedClasses
                        .filter(item => !form.gradeId || item.grade === form.gradeId)
                        .map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground text-right">רכז/ת שכבה מקבל/ת גם הרשאת שכבה וגם הרשאת כיתת חינוך.</p>
                </div>
              </div>
            )}

            {form.role === 'system_admin' && (
              <div className="space-y-3" dir="rtl">
                <div className="space-y-2">
                  <Label>כיתת חינוך נוספת</Label>
                  <Select value={form.homeroomClassId || 'none'} onValueChange={(value) => setForm(prev => ({ ...prev, homeroomClassId: value === 'none' ? '' : value }))}>
                    <SelectTrigger><SelectValue placeholder="בחר/י כיתת חינוך" /></SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="none">ללא כיתת חינוך</SelectItem>
                      {sortedClasses.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>רכז/ת שכבה בנוסף</Label>
                  <Select value={form.gradeId || 'none'} onValueChange={(value) => setForm(prev => ({ ...prev, gradeId: value === 'none' ? '' : value }))}>
                    <SelectTrigger><SelectValue placeholder="בחר/י שכבה" /></SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="none">ללא ריכוז שכבה</SelectItem>
                      {GRADES.map(grade => <SelectItem key={grade} value={grade}>{formatGrade(grade)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground text-right">מנהל/ת מערכת יכול/ה לקבל גם הרשאת מחנך/ת וגם הרשאת רכז/ת שכבה.</p>
              </div>
            )}

            {form.role === 'division_manager' && (
              <div className="space-y-2">
                <Label>חטיבה</Label>
                <Select value={form.divisionType} onValueChange={(value) => setForm(prev => ({ ...prev, divisionType: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="upper">חטיבה עליונה — י׳–י״ב</SelectItem>
                    <SelectItem value="middle">חטיבת ביניים — ז׳–ט׳</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border p-3" dir="rtl">
              <div className="text-right">
                <p className="text-sm font-semibold">משתמש פעיל</p>
                <p className="text-xs text-muted-foreground">משתמש חסום לא יוכל להיכנס גם אם התחבר ב-Base44</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(value) => setForm(prev => ({ ...prev, isActive: value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>ביטול</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'שומר...' : 'שמור'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק משתמש מאושר?</AlertDialogTitle>
            <AlertDialogDescription>המשתמש יוסר מטבלת המורשים ולא יוכל להיכנס למערכת.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={remove}>מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}