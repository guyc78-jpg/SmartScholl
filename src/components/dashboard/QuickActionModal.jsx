import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLogger';
import { getUserApprovedClassId, getUserApprovedGrade } from '@/lib/schoolStructure';
import { getAvailableRoles, hasApprovedRole } from '@/lib/roleUtils';
import { CLASS_ID } from '@/lib/demoData';

const titles = {
  attendance: 'סימון נוכחות',
  discipline: 'אירוע משמעת חדש',
  exam: 'הוספת מבחן',
  announcement: 'הודעה לכיתה',
  note: 'הערת מחנך',
  communication: 'שיחה עם הורים',
  task: 'משימה חדשה',
  community: 'עדכון מעורבות חברתית',
};

function normalizeClassName(s = '') {
  return String(s).replace(/[״"'׳\s]/g, '').trim();
}

function studentMatchesClass(student, classId, className) {
  if (classId && student.class_id === classId) return true;
  if (className && student.class_name && normalizeClassName(student.class_name) === normalizeClassName(className)) return true;
  return false;
}

function getStudentDisplayName(fullName = '') {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(' ');
  return `${lastName} ${firstName}`;
}

function sortByLastName(students) {
  return [...students].sort((a, b) => {
    const lastNameA = (a.full_name || '').trim().split(/\s+/).pop();
    const lastNameB = (b.full_name || '').trim().split(/\s+/).pop();
    return lastNameA.localeCompare(lastNameB, 'he');
  });
}

export default function QuickActionModal({ action, classId: classIdProp, user, role, onClose, onSuccess }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const sheetRef = useRef(null);

  const needsStudentPicker = ['discipline', 'note', 'communication', 'community'].includes(action);
  const today = new Date().toISOString().split('T')[0];

  const resolvedClassId = classIdProp || getUserApprovedClassId(user, CLASS_ID) || '';
  const approvedClass = user?.profile_homeroom_class || user?.profile_class || '';
  const approvedGrade = getUserApprovedGrade(user);
  const approvedRoles = getAvailableRoles(user);
  const isCoordinator = hasApprovedRole(user, 'coordinator');
  const isAdmin = approvedRoles.includes('admin');

  // Load students once on mount, not on every render
  useEffect(() => {
    if (!needsStudentPicker) return;
    loadStudents();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll on iOS while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function loadStudents() {
    setLoadingStudents(true);
    let fetched = [];

    if (resolvedClassId) {
      fetched = await base44.entities.Student.filter({ class_id: resolvedClassId });
    }
    if (fetched.length === 0 && approvedClass) {
      const all = await base44.entities.Student.list();
      fetched = all.filter(s => studentMatchesClass(s, resolvedClassId, approvedClass));
    }
    if (fetched.length === 0 && isCoordinator && approvedGrade) {
      fetched = await base44.entities.Student.filter({ grade: approvedGrade });
    }
    if (fetched.length === 0 && isAdmin) {
      fetched = await base44.entities.Student.list();
    }

    setStudents(fetched);
    setLoadingStudents(false);
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    setSaving(true);
    try {
      const effectiveClassId = resolvedClassId;

      if (action === 'discipline') {
        const student = students.find(s => s.id === form.student_id);
        await base44.entities.DisciplineEvent.create({
          student_id: form.student_id, student_name: student?.full_name, class_id: effectiveClassId,
          date: today, time: form.time || '', severity: form.severity || 'קלה',
          category: form.category || 'התנהגות', description: form.description || '',
          treatment: '', parents_updated: false, status: 'פתוח'
        });
      } else if (action === 'exam') {
        await base44.entities.Exam.create({
          class_id: effectiveClassId, title: form.title, subject: form.subject,
          type: form.type || 'מבחן', date: form.date || today, time: form.time || '',
          teacher: form.teacher || '', material: form.material || '', notes: form.notes || ''
        });
      } else if (action === 'announcement') {
        await base44.entities.Announcement.create({
          class_id: effectiveClassId, title: form.title, content: form.content,
          type: form.type || 'כיתתית', requires_confirmation: false,
          published_at: today, is_published: true
        });
      } else if (action === 'note') {
        const student = students.find(s => s.id === form.student_id);
        await base44.entities.TeacherNote.create({
          student_id: form.student_id, student_name: student?.full_name,
          class_id: effectiveClassId, date: today, content: form.content,
          category: form.category || 'כללי', is_private: true
        });
      } else if (action === 'communication') {
        const student = students.find(s => s.id === form.student_id);
        await base44.entities.Communication.create({
          student_id: form.student_id, student_name: student?.full_name,
          class_id: effectiveClassId, date: today, type: form.type || 'שיחה טלפונית',
          with_whom: form.with_whom || 'הורה 1', summary: form.summary || '',
          follow_up: form.follow_up || ''
        });
      } else if (action === 'task') {
        const student = students.find(s => s.id === form.student_id);
        await base44.entities.Task.create({
          class_id: effectiveClassId, student_id: form.student_id, student_name: student?.full_name,
          title: form.title, description: form.description || '',
          due_date: form.due_date || today, priority: form.priority || 'בינונית', status: 'לביצוע', category: 'כללי'
        });
      } else if (action === 'community') {
        const student = students.find(s => s.id === form.student_id);
        if (!student) { toast.error('יש לבחור תלמיד'); setSaving(false); return; }
        await base44.entities.Student.update(student.id, {
          community_service_done: Number(form.done) ?? student.community_service_done ?? 0,
          community_service_place: form.place || student.community_service_place || '',
        });
      }

      await logActivity({
        user, role,
        actionName: `quick_${action}`,
        details: `${user?.full_name || 'משתמש'} ביצע/ה פעולה מהירה: ${titles[action]}`,
        metadata: { classId: effectiveClassId }
      });
      toast.success('נשמר בהצלחה!');
      onSuccess();
    } catch (e) {
      toast.error('שגיאה בשמירה');
    }
    setSaving(false);
  }

  const sheet = (
    <div
      dir="rtl"
      style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
    >
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }}
        onPointerDown={onClose}
      />

      {/* Sheet panel — fixed height, never grows with keyboard */}
      <div
        ref={sheetRef}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          left: 0,
          height: '72vh',
          maxHeight: '560px',
          background: 'hsl(var(--card))',
          borderRadius: '1rem 1rem 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 9999, background: 'hsl(var(--border))' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem 0.75rem', flexShrink: 0, borderBottom: '1px solid hsl(var(--border))' }}>
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>{titles[action]}</span>
          <button
            onClick={onClose}
            style={{ padding: 4, borderRadius: 6, color: 'hsl(var(--muted-foreground))' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', WebkitOverflowScrolling: 'touch' }}>
          <div className="space-y-4">

            {/* Student picker */}
            {needsStudentPicker && (
              <div className="space-y-1">
                <Label>תלמיד</Label>
                {loadingStudents ? (
                  <p className="text-sm text-muted-foreground">טוען תלמידים...</p>
                ) : students.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-3 text-center">
                    <p className="text-sm text-muted-foreground">לא נמצאו תלמידים המשויכים לכיתה שלך</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="חיפוש תלמיד..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="text-sm"
                    />
                    <Select onValueChange={v => { set('student_id', v); setSearchQuery(''); }}>
                      <SelectTrigger><SelectValue placeholder="בחר תלמיד" /></SelectTrigger>
                      <SelectContent>
                        {sortByLastName(students)
                          .filter(s => !searchQuery || s.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map(s => <SelectItem key={s.id} value={s.id}>{getStudentDisplayName(s.full_name)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {action === 'discipline' && <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>חומרה</Label>
                  <Select onValueChange={v => set('severity', v)}>
                    <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                    <SelectContent>
                      {['קלה', 'בינונית', 'חמורה'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>קטגוריה</Label>
                  <Select onValueChange={v => set('category', v)}>
                    <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                    <SelectContent>
                      {['התנהגות', 'למידה', 'נוכחות', 'תקשורת', 'אחר'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>תיאור האירוע</Label>
                <Textarea placeholder="תיאור..." onChange={e => set('description', e.target.value)} rows={3} className="resize-none" />
              </div>
            </>}

            {action === 'exam' && <>
              <div className="space-y-1">
                <Label>כותרת</Label>
                <Input placeholder="שם המבחן" onChange={e => set('title', e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>מקצוע</Label>
                  <Input placeholder="מקצוע" onChange={e => set('subject', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>סוג</Label>
                  <Select onValueChange={v => set('type', v)}>
                    <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                    <SelectContent>
                      {['מבחן', 'בחן', 'עבודה', 'פרויקט', 'הגשה'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>תאריך</Label>
                  <Input type="date" onChange={e => set('date', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>מורה</Label>
                  <Input placeholder="שם המורה" onChange={e => set('teacher', e.target.value)} />
                </div>
              </div>
            </>}

            {action === 'announcement' && <>
              <div className="space-y-1">
                <Label>כותרת</Label>
                <Input placeholder="כותרת ההודעה" onChange={e => set('title', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>סוג</Label>
                <Select onValueChange={v => set('type', v)}>
                  <SelectTrigger><SelectValue placeholder="בחר סוג" /></SelectTrigger>
                  <SelectContent>
                    {['כיתתית', 'חשובה', 'אישית', 'להורים'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>תוכן</Label>
                <Textarea placeholder="תוכן ההודעה..." onChange={e => set('content', e.target.value)} rows={3} className="resize-none" />
              </div>
            </>}

            {(action === 'note' || action === 'communication') && <>
              {action === 'communication' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>סוג</Label>
                    <Select onValueChange={v => set('type', v)}>
                      <SelectTrigger><SelectValue placeholder="סוג" /></SelectTrigger>
                      <SelectContent>
                        {['שיחה טלפונית', 'פגישה', 'מייל', 'הודעה'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>עם מי</Label>
                    <Select onValueChange={v => set('with_whom', v)}>
                      <SelectTrigger><SelectValue placeholder="עם מי" /></SelectTrigger>
                      <SelectContent>
                        {['הורה 1', 'הורה 2', 'תלמיד', 'יועצת'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <Label>{action === 'note' ? 'הערה' : 'סיכום'}</Label>
                <Textarea placeholder="כתוב כאן..." onChange={e => set(action === 'note' ? 'content' : 'summary', e.target.value)} rows={3} className="resize-none" />
              </div>
            </>}

            {action === 'task' && <>
              <div className="space-y-1">
                <Label>כותרת</Label>
                <Input placeholder="שם המשימה" onChange={e => set('title', e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>תאריך יעד</Label>
                  <Input type="date" onChange={e => set('due_date', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>עדיפות</Label>
                  <Select onValueChange={v => set('priority', v)}>
                    <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                    <SelectContent>
                      {['נמוכה', 'בינונית', 'גבוהה', 'דחופה'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>}

            {action === 'community' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>שעות שבוצעו</Label>
                  <Input type="number" placeholder="0" onChange={e => set('done', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>מקום</Label>
                  <Input placeholder="מקום ההתנדבות" onChange={e => set('place', e.target.value)} />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1 pb-2">
              <Button onClick={handleSave} disabled={saving || (needsStudentPicker && students.length === 0)} className="flex-1">
                {saving ? 'שומר...' : 'שמור'}
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1">ביטול</Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}