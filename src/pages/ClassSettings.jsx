import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Settings, Lock } from 'lucide-react';
import { getAvailableRoles } from '@/lib/roleUtils';
import { getUserApprovedGrade, getUserDivisionGrades, getUserHomeroomClassId, normalizeGrade } from '@/lib/schoolStructure';
import { getClassDisplayName } from '@/lib/classIdentity';

const extractClassNumber = (name = '') => (String(name).match(/\d+$/)?.[0] || '');

export default function ClassSettings({ user, role }) {
  const [classes, setClasses] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const roles = getAvailableRoles(user);
  const isAdmin = roles.includes('system_admin') || roles.includes('admin') || role === 'admin' || role === 'system_admin';
  const homeroomClassId = getUserHomeroomClassId(user, '');
  const managedGrade = normalizeGrade(getUserApprovedGrade(user));
  const divisionGrades = getUserDivisionGrades(user);

  const allowedClasses = useMemo(() => classes.filter(classRoom => {
    if (isAdmin) return true;
    if (role === 'division_manager') return divisionGrades.includes(normalizeGrade(classRoom.grade));
    if (role === 'grade_coordinator' || role === 'coordinator') return normalizeGrade(classRoom.grade) === managedGrade || classRoom.id === homeroomClassId;
    if (role === 'homeroom_teacher') return classRoom.id === homeroomClassId || classRoom.homeroom_teacher_email === user?.email;
    return false;
  }), [classes, isAdmin, role, divisionGrades, managedGrade, homeroomClassId, user?.email]);

  const selectedClass = allowedClasses.find(item => item.id === selectedId) || null;
  const canEditAll = !!selectedClass && (isAdmin || role === 'division_manager');
  const canEditByGrade = !!selectedClass && (role === 'grade_coordinator' || role === 'coordinator') && normalizeGrade(selectedClass.grade) === managedGrade;
  const canEditOwnNotes = !!selectedClass && (selectedClass.id === homeroomClassId || selectedClass.homeroom_teacher_email === user?.email) && (role === 'homeroom_teacher' || role === 'coordinator' || role === 'grade_coordinator');
  const canEditIdentity = canEditAll || canEditByGrade || canEditOwnNotes;
  const canSave = canEditAll || canEditIdentity;

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
    if (!selectedId || !allowedClasses.some(item => item.id === selectedId)) setSelectedId(allowedClasses[0].id);
  }, [allowedClasses, selectedId]);

  useEffect(() => {
    if (!selectedClass) return;
    setForm({ ...selectedClass, class_number: selectedClass.class_number || extractClassNumber(selectedClass.name) });
  }, [selectedClass?.id]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  async function save() {
    if (!selectedClass || !canSave) return;
    setSaving(true);
    const previousIdentity = String(selectedClass.class_identity || '').trim();
    const nextIdentity = String(form.class_identity || '').trim();
    const data = canEditAll ? { ...form, class_identity: nextIdentity } : {
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

  const readOnlyCore = !canEditAll;
  const readOnlyIdentity = !canEditIdentity;

  return (
    <div className="p-4 lg:p-6 space-y-5 text-right" dir="rtl">
      <PageHeader title="הגדרות כיתה" subtitle={selectedClass ? getClassDisplayName(selectedClass, selectedClass.name) : 'ניהול פרטי הכיתה'} />

      {allowedClasses.length > 1 && (
        <Card><CardContent className="p-4"><div className="space-y-2 max-w-md"><Label>בחירת כיתה</Label><Select value={selectedId} onValueChange={setSelectedId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allowedClasses.map(classRoom => <SelectItem key={classRoom.id} value={classRoom.id}>{getClassDisplayName(classRoom, classRoom.name)}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 justify-start"><Settings className="h-5 w-5 text-primary" />פרטי הכיתה</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="שכבה" value={form.grade || ''} onChange={value => set('grade', value)} readOnly={readOnlyCore} />
            <Field label="מספר כיתה" value={form.class_number || ''} onChange={value => set('class_number', value)} readOnly={readOnlyCore} />
            <Field label="שם כיתה" value={form.name || ''} onChange={value => set('name', value)} readOnly={readOnlyCore} />
            <Field label="שנת לימודים" value={form.year || ''} onChange={value => set('year', value)} readOnly={readOnlyCore} />
            <Field label="מחנך/ת" value={form.homeroom_teacher_name || ''} onChange={value => set('homeroom_teacher_name', value)} readOnly={readOnlyCore} />
            <Field label="רכז/ת שכבה" value={form.coordinator_name || ''} onChange={value => set('coordinator_name', value)} readOnly={readOnlyCore} />
            <Field label="יועץ/ת" value={form.counselor_name || ''} onChange={value => set('counselor_name', value)} readOnly={readOnlyCore} />
            <Field label="מנהל/ת חטיבה" value={form.division_manager_name || ''} onChange={value => set('division_manager_name', value)} readOnly={readOnlyCore} />
          </div>
          <div className="space-y-2"><Label>זהות כיתה / מגמה</Label><Input value={form.class_identity || ''} onChange={e => set('class_identity', e.target.value)} readOnly={readOnlyIdentity} placeholder="לדוגמה: אדריכלות, דיפלומטיה, מדעית, מופת, מב״ר" /></div>
          <div className="space-y-2"><Label>דגשים של הכיתה</Label><Textarea value={form.class_highlights || ''} onChange={e => set('class_highlights', e.target.value)} readOnly={readOnlyIdentity} placeholder="דגשים לימודיים, חברתיים או ארגוניים" className="min-h-28" /></div>
          {canSave && <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? 'שומר...' : 'שמור הגדרות'}</Button></div>}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, readOnly }) {
  return <div className="space-y-2"><Label>{label}</Label><Input value={value} onChange={e => onChange(e.target.value)} readOnly={readOnly} /></div>;
}