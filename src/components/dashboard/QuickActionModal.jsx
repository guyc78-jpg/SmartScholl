import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// Normalize Hebrew class name variants: י"א1 / י״א1 / יא1 → יא1
function normalizeClassName(s = '') {
  return String(s).replace(/[״"'׳\s]/g, '').trim();
}

// Check if a student belongs to the given classId or class name (tolerant matching)
function studentMatchesClass(student, classId, className) {
  if (classId && student.class_id === classId) return true;
  if (className && student.class_name && normalizeClassName(student.class_name) === normalizeClassName(className)) return true;
  return false;
}

export default function QuickActionModal({ action, classId: classIdProp, user, role, onClose, onSuccess }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const needsStudentPicker = ['discipline', 'note', 'communication', 'community'].includes(action);
  const today = new Date().toISOString().split('T')[0];

  // Resolve the best classId for this user
  const resolvedClassId = classIdProp || getUserApprovedClassId(user, CLASS_ID) || '';
  const approvedClass = user?.profile_homeroom_class || user?.profile_class || '';
  const approvedGrade = getUserApprovedGrade(user);
  const approvedRoles = getAvailableRoles(user);
  const isCoordinator = hasApprovedRole(user, 'coordinator');
  const isAdmin = approvedRoles.includes('admin');

  useEffect(() => {
    if (!needsStudentPicker) return;
    loadStudents();
  }, [action]);

  async function loadStudents() {
    setLoadingStudents(true);
    let fetched = [];

    if (resolvedClassId) {
      // Fetch by classId directly — most reliable
      fetched = await base44.entities.Student.filter({ class_id: resolvedClassId });
    }

    // If still empty and user has a class name, try matching by class_name (handles import mismatches)
    if (fetched.length === 0 && approvedClass) {
      const all = await base44.entities.Student.list();
      fetched = all.filter(s => studentMatchesClass(s, resolvedClassId, approvedClass));
    }

    // Coordinator: fetch by grade
    if (fetched.length === 0 && isCoordinator && approvedGrade) {
      const all = await base44.entities.Student.filter({ grade: approvedGrade });
      fetched = all;
    }

    // Admin fallback: fetch all
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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{titles[action]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">

          {/* Student picker — with clear empty-state message */}
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
                <Select onValueChange={v => set('student_id', v)}>
                  <SelectTrigger><SelectValue placeholder="בחר תלמיד" /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {action === 'discipline' && <>
            <div className="grid grid-cols-2 gap-3">
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
              <Textarea placeholder="תיאור..." onChange={e => set('description', e.target.value)} rows={3} />
            </div>
          </>}

          {action === 'exam' && <>
            <div className="space-y-1">
              <Label>כותרת</Label>
              <Input placeholder="שם המבחן" onChange={e => set('title', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
              <Textarea placeholder="תוכן ההודעה..." onChange={e => set('content', e.target.value)} rows={4} />
            </div>
          </>}

          {(action === 'note' || action === 'communication') && <>
            {action === 'communication' && (
              <div className="grid grid-cols-2 gap-3">
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
              <Textarea placeholder="כתוב כאן..." onChange={e => set(action === 'note' ? 'content' : 'summary', e.target.value)} rows={4} />
            </div>
          </>}

          {action === 'task' && <>
            <div className="space-y-1">
              <Label>כותרת</Label>
              <Input placeholder="שם המשימה" onChange={e => set('title', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving || (needsStudentPicker && students.length === 0)} className="flex-1">
              {saving ? 'שומר...' : 'שמור'}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">ביטול</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}