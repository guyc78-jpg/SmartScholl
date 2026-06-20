import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { BookOpenText, Check, ChevronDown, Lightbulb, Lock, Save, UsersRound, X } from 'lucide-react';
import { getAvailableRoles } from '@/lib/roleUtils';
import { getUserApprovedGrade, getUserDivisionGrades, getUserHomeroomClassId, normalizeGrade } from '@/lib/schoolStructure';
import { getClassDisplayName } from '@/lib/classIdentity';

const GRADE_ORDER = ['ז', 'ח', 'ט', 'י', 'יא', 'יב'];
const GRADE_LABELS = { ז: 'ז׳', ח: 'ח׳', ט: 'ט׳', י: 'י׳', יא: 'י״א', יב: 'י״ב' };
const extractClassNumber = (name = '') => (String(name).match(/\d+$/)?.[0] || '');
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const getSelectedClassStorageKey = user => `classSettings:selectedClass:${normalizeEmail(user?.email) || 'guest'}`;
const getClassNumber = classRoom => Number(classRoom.class_number || extractClassNumber(classRoom.name) || 0);
const sortClasses = (a, b) => {
  const gradeDiff = GRADE_ORDER.indexOf(normalizeGrade(a.grade)) - GRADE_ORDER.indexOf(normalizeGrade(b.grade));
  if (gradeDiff !== 0) return gradeDiff;
  return getClassNumber(a) - getClassNumber(b);
};

export default function ClassSettings({ user, role }) {
  const [classes, setClasses] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);

  const roles = getAvailableRoles(user);
  const isAdmin = roles.includes('system_admin') || roles.includes('admin') || role === 'admin' || role === 'system_admin';
  const homeroomClassId = getUserHomeroomClassId(user, '');
  const managedGrade = normalizeGrade(getUserApprovedGrade(user));
  const divisionGrades = getUserDivisionGrades(user);
  const currentUserEmail = normalizeEmail(user?.email);
  const currentHomeroomClassIds = useMemo(() => classes
    .filter(classRoom => currentUserEmail && normalizeEmail(classRoom.homeroom_teacher_email) === currentUserEmail)
    .map(classRoom => classRoom.id), [classes, currentUserEmail]);
  const currentHomeroomIdSet = useMemo(() => new Set(currentHomeroomClassIds), [currentHomeroomClassIds]);
  const hasCurrentHomeroomAssignment = currentHomeroomClassIds.length > 0;

  const allowedClasses = useMemo(() => {
    const seen = new Set();
    return classes
      .filter(classRoom => {
        if (isAdmin) return true;
        if (role === 'division_manager') return divisionGrades.includes(normalizeGrade(classRoom.grade));
        if (role === 'grade_coordinator' || role === 'coordinator') {
          return normalizeGrade(classRoom.grade) === managedGrade || currentHomeroomIdSet.has(classRoom.id) || (!hasCurrentHomeroomAssignment && classRoom.id === homeroomClassId);
        }
        if (role === 'homeroom_teacher') {
          return hasCurrentHomeroomAssignment ? currentHomeroomIdSet.has(classRoom.id) : classRoom.id === homeroomClassId;
        }
        return false;
      })
      .filter(classRoom => {
        if (seen.has(classRoom.id)) return false;
        seen.add(classRoom.id);
        return true;
      })
      .sort(sortClasses);
  }, [classes, isAdmin, role, divisionGrades, managedGrade, homeroomClassId, currentHomeroomIdSet, hasCurrentHomeroomAssignment]);

  const selectedClass = allowedClasses.find(item => item.id === selectedId) || null;
  const selectedClassStorageKey = useMemo(() => getSelectedClassStorageKey(user), [user?.email]);
  const canEditAll = !!selectedClass && (isAdmin || role === 'division_manager');
  const canEditByGrade = !!selectedClass && (role === 'grade_coordinator' || role === 'coordinator') && normalizeGrade(selectedClass.grade) === managedGrade;
  const canEditOwnNotes = !!selectedClass && (currentHomeroomIdSet.has(selectedClass.id) || (!hasCurrentHomeroomAssignment && selectedClass.id === homeroomClassId)) && (role === 'homeroom_teacher' || role === 'coordinator' || role === 'grade_coordinator');
  const canEditIdentity = canEditAll || canEditByGrade || canEditOwnNotes;
  const classSubtitle = selectedClass ? getClassDisplayName({ ...selectedClass, ...form }, selectedClass.name) : 'בחרו כיתה לעריכה';
  const groupedClasses = useMemo(() => GRADE_ORDER
    .map(grade => ({
      grade,
      classes: allowedClasses.filter(classRoom => normalizeGrade(classRoom.grade) === grade).sort(sortClasses),
    }))
    .filter(group => group.classes.length > 0), [allowedClasses]);

  useEffect(() => {
    async function loadClasses() {
      setLoading(true);
      const rows = await base44.entities.ClassRoom.list('grade', 500);
      setClasses((rows || []).filter(item => item.is_active !== false));
      setLoading(false);
    }
    loadClasses();
  }, []);

  useEffect(() => {
    if (!allowedClasses.length) return;
    if (selectedId && allowedClasses.some(item => item.id === selectedId)) return;

    const savedClassId = localStorage.getItem(selectedClassStorageKey);
    const savedAllowed = savedClassId && allowedClasses.some(item => item.id === savedClassId);
    const currentAllowed = currentHomeroomClassIds.find(id => allowedClasses.some(item => item.id === id));
    setSelectedId(savedAllowed ? savedClassId : currentAllowed || allowedClasses[0].id);
  }, [allowedClasses, selectedId, currentHomeroomClassIds, selectedClassStorageKey]);

  const chooseClass = classId => {
    setSelectedId(classId);
    localStorage.setItem(selectedClassStorageKey, classId);
    setClassPickerOpen(false);
  };

  useEffect(() => {
    if (!selectedClass) return;
    setForm({
      class_identity: selectedClass.class_identity || '',
      class_highlights: selectedClass.class_highlights || '',
    });
  }, [selectedClass?.id]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  async function save() {
    if (!selectedClass || !canEditIdentity) return;
    setSaving(true);
    const previousIdentity = String(selectedClass.class_identity || '').trim();
    const nextIdentity = String(form.class_identity || '').trim();
    const data = {
      class_identity: nextIdentity,
      class_highlights: form.class_highlights || '',
    };
    await base44.entities.ClassRoom.update(selectedClass.id, data);
    if (previousIdentity !== nextIdentity) {
      const changedAt = new Date().toISOString();
      await base44.entities.ActivityLog.create({
        event_type: 'user_action',
        actor_email: user?.email || '',
        target_name: getClassDisplayName({ ...selectedClass, class_identity: nextIdentity }, selectedClass.name),
        action_name: 'עדכון זהות כיתה / מגמה',
        work_role: role,
        details: `${user?.full_name || user?.email || 'משתמש'} עדכן/ה זהות כיתה בתאריך ושעה ${changedAt}`,
        metadata: JSON.stringify({ classId: selectedClass.id, className: selectedClass.name, previousIdentity, nextIdentity, changedAt }),
        severity: 'info'
      });
    }
    setClasses(prev => prev.map(item => item.id === selectedClass.id ? { ...item, ...data } : item));
    toast.success('הגדרות הכיתה נשמרו');
    setSaving(false);
  }

  if (loading) return <div className="flex h-48 items-center justify-center" dir="rtl"><div className="h-7 w-7 rounded-full border-4 border-primary/20 border-t-primary animate-spin" /></div>;
  if (!allowedClasses.length) return <div className="p-6 text-center text-muted-foreground" dir="rtl"><Lock className="mx-auto mb-3 h-9 w-9" />אין לך כיתה זמינה להגדרות.</div>;

  const readOnly = !canEditIdentity;
  const classMeta = selectedClass ? [
    { label: 'שכבה', value: selectedClass.grade || '—' },
    { label: 'מספר כיתה', value: selectedClass.class_number || extractClassNumber(selectedClass.name) || '—' },
    { label: 'שם כיתה', value: selectedClass.name || '—' },
  ] : [];
  const contacts = selectedClass ? [
    { label: 'מחנך/ת', name: selectedClass.homeroom_teacher_name, email: selectedClass.homeroom_teacher_email },
    { label: 'רכז/ת שכבה', name: selectedClass.coordinator_name, email: selectedClass.coordinator_email },
    { label: 'יועץ/ת', name: selectedClass.counselor_name, email: selectedClass.counselor_email },
    { label: 'מנהל/ת חטיבה', name: selectedClass.division_manager_name, email: selectedClass.division_manager_email },
  ] : [];

  return (
    <div className="min-h-full bg-background p-4 lg:p-6 pb-28 text-right" dir="rtl">
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader title="הגדרות כיתה" subtitle={classSubtitle} />

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <Label>בחירת כיתה</Label>
              <button
                type="button"
                onClick={() => setClassPickerOpen(true)}
                className="flex h-11 w-full items-center justify-start gap-3 rounded-md border border-input bg-background px-4 py-2 text-right text-base shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                dir="rtl"
              >
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 whitespace-normal break-words text-right leading-snug">{classSubtitle}</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {classMeta.map(item => (
                <div key={item.label} className="rounded-lg bg-muted/60 px-3 py-2 text-right">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-start gap-2 text-lg">
              <BookOpenText className="h-5 w-5 text-primary" />
              זהות הכיתה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>זהות כיתה / מגמה</Label>
            <Input
              value={form.class_identity || ''}
              onChange={e => set('class_identity', e.target.value)}
              readOnly={readOnly}
              placeholder="לדוגמה: אדריכלות, דיפלומטיה, מדעית, מב״ר"
              className="h-11 text-base"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-start gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-primary" />
              דגשים למחנך/ת
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>דגשים של הכיתה</Label>
            <Textarea
              value={form.class_highlights || ''}
              onChange={e => set('class_highlights', e.target.value)}
              readOnly={readOnly}
              placeholder="דגשים לימודיים, חברתיים או ארגוניים בקצרה"
              className="min-h-28 text-base"
            />
          </CardContent>
        </Card>

        <details className="group rounded-xl border bg-card text-card-foreground shadow" dir="rtl">
          <summary className="flex cursor-pointer list-none items-center justify-start gap-2 p-5 text-right font-semibold">
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
            <UsersRound className="h-5 w-5 text-primary" />
            <span className="flex-1 text-right">אנשי קשר</span>
          </summary>
          <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2">
            {contacts.map(contact => (
              <div key={contact.label} className="rounded-lg border bg-muted/30 p-3 text-right">
                <p className="text-xs text-muted-foreground">{contact.label}</p>
                <p className="font-semibold text-foreground">{contact.name || 'לא הוגדר'}</p>
                {contact.email && <p className="force-ltr truncate text-sm text-muted-foreground">{contact.email}</p>}
              </div>
            ))}
          </div>
        </details>
      </div>

      {classPickerOpen && (
        <div className="fixed inset-0 z-[10050] flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-4" dir="rtl">
          <div className="flex max-h-[82svh] w-full flex-col rounded-t-3xl border bg-card text-card-foreground shadow-2xl sm:max-w-xl sm:rounded-3xl">
            <div className="flex items-center justify-start gap-3 border-b p-4 text-right">
              <button
                type="button"
                onClick={() => setClassPickerOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-muted"
                aria-label="סגור בחירת כיתה"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1 text-right">
                <h2 className="font-semibold text-foreground">בחירת כיתה</h2>
                <p className="text-sm text-muted-foreground">בחרו כיתה מהרשימה</p>
              </div>
            </div>
            <div className="max-h-[calc(82svh-80px)] overflow-y-auto overscroll-contain p-3" dir="rtl">
              <div className="space-y-5">
                {groupedClasses.map(group => (
                  <section key={group.grade} className="space-y-2 text-right" dir="rtl">
                    <div className="sticky top-0 z-10 rounded-lg bg-muted px-4 py-2 text-right text-sm font-bold text-foreground shadow-sm">
                      שכבת {GRADE_LABELS[group.grade] || group.grade}
                    </div>
                    <div className="space-y-1.5">
                      {group.classes.map(classRoom => {
                        const label = getClassDisplayName(classRoom, classRoom.name);
                        const active = classRoom.id === selectedId;
                        return (
                          <button
                            key={classRoom.id}
                            type="button"
                            onClick={() => chooseClass(classRoom.id)}
                            className={`flex w-full items-center justify-start gap-3 rounded-xl px-4 py-3 text-right leading-snug ${active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
                            dir="rtl"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                              {active && <Check className="h-5 w-5 text-primary" />}
                            </span>
                            <span className="min-w-0 flex-1 whitespace-normal break-words text-right">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {canEditIdentity && (
        <div className="sticky bottom-4 z-20 mx-auto mt-6 flex max-w-3xl justify-center rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur" dir="rtl">
          <Button onClick={save} disabled={saving} size="lg" className="min-w-56">
            <Save className="h-4 w-4" />
            {saving ? 'שומר...' : 'שמור הגדרות'}
          </Button>
        </div>
      )}
    </div>
  );
}