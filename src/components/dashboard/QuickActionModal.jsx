import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Check, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLogger';
import { getUserApprovedGrade, getUserDivisionGrades } from '@/lib/schoolStructure';
import { getAvailableRoles, hasApprovedRole } from '@/lib/roleUtils';
import CommunityExceptionsQuickAction from '@/components/dashboard/CommunityExceptionsQuickAction';
import PositiveReinforcementDialog from '@/components/dashboard/PositiveReinforcementDialog';
import { formatStudentName, compareStudentsByLastName } from '@/lib/studentName';
import { getLocalDateString } from '@/lib/attendanceScope';

const titles = {
  positive_reinforcement: 'חיזוק חיובי',
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

const getStudentDisplayName = formatStudentName;
const sortByLastName = (students) => [...students].sort(compareStudentsByLastName);

export default function QuickActionModal({ action, classId: classIdProp, user, role, onClose, onSuccess, initialStudents = null }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentListOpen, setStudentListOpen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(null);
  const [sheetBottom, setSheetBottom] = useState(0);
  const [sheetTop, setSheetTop] = useState(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const sheetRef = useRef(null);
  const scrollAreaRef = useRef(null);

  // גובה הבסיס מחושב מחלון מלא (ללא תלות במקלדת) — כך נשמר גובה מקורי יציב
  useEffect(() => {
    const computeBase = () => {
      const navInset = window.innerWidth < 1024 ? 112 : 0;
      const fullHeight = window.innerHeight;
      const usableHeight = Math.max(320, fullHeight - navInset);
      const baseHeight = Math.min(Math.round(usableHeight * 0.85), 640);
      setSheetHeight(baseHeight);
      // ברירת מחדל ללא מקלדת — מצמיד לתחתית מעל ניווט המובייל
      setSheetBottom(navInset);
      setSheetTop(Math.max(0, fullHeight - navInset - baseHeight));
    };
    computeBase();
    window.addEventListener('orientationchange', computeBase);
    return () => window.removeEventListener('orientationchange', computeBase);
  }, []);

  // מעקב אחר המקלדת ב-visualViewport — מתאים מיקום זמני כשהיא פתוחה ומשחזר בסגירה
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const KB_THRESHOLD = 120; // מתחת לסף לא נחשב מקלדת (סרגלי דפדפן וכד')

    const onViewportChange = () => {
      const viewportBottom = (vv.offsetTop ?? 0) + vv.height;
      const keyboardInset = Math.max(0, window.innerHeight - viewportBottom);
      const isKeyboard = keyboardInset > KB_THRESHOLD;
      const navInset = window.innerWidth < 1024 ? 112 : 0;

      if (isKeyboard) {
        // העלאה זמנית מעל המקלדת — ללא שינוי גובה הבסיס
        setKeyboardOpen(true);
        setSheetBottom(keyboardInset);
        setSheetTop(prev => {
          const baseHeight = sheetHeight ?? 0;
          return Math.max(0, viewportBottom - baseHeight);
        });
      } else {
        // המקלדת נסגרה — שחזור אוטומטי לגובה ולמיקום המקוריים
        setKeyboardOpen(false);
        const fullHeight = window.innerHeight;
        const baseHeight = sheetHeight ?? 0;
        setSheetBottom(navInset);
        setSheetTop(Math.max(0, fullHeight - navInset - baseHeight));
      }
    };

    vv.addEventListener('resize', onViewportChange);
    vv.addEventListener('scroll', onViewportChange);
    return () => {
      vv.removeEventListener('resize', onViewportChange);
      vv.removeEventListener('scroll', onViewportChange);
    };
  }, [sheetHeight]);

  // ניקוי styles זמניים בעת איבוד פוקוס מכל השדות — מבטיח חזרה לגובה המקורי
  useEffect(() => {
    const onBlurAnywhere = () => {
      // עיכוב קצר כדי לאפשר מעבר פוקוס בין שדות מבלי לאפס באמצע
      setTimeout(() => {
        const active = document.activeElement;
        const stillEditing = active && ['INPUT', 'TEXTAREA'].includes(active.tagName);
        if (!stillEditing) {
          const navInset = window.innerWidth < 1024 ? 112 : 0;
          const fullHeight = window.innerHeight;
          const baseHeight = sheetHeight ?? 0;
          setKeyboardOpen(false);
          setSheetBottom(navInset);
          setSheetTop(Math.max(0, fullHeight - navInset - baseHeight));
        }
      }, 120);
    };
    const node = sheetRef.current;
    node?.addEventListener('focusout', onBlurAnywhere);
    return () => node?.removeEventListener('focusout', onBlurAnywhere);
  }, [sheetHeight]);

  // גלילה אוטומטית לשדה הפעיל בתוך אזור הגלילה
  function handleFieldFocus(e) {
    const el = e.target;
    const container = scrollAreaRef.current;
    if (!(el instanceof HTMLElement) || !container) return;

    const isTextField = ['INPUT', 'TEXTAREA'].includes(el.tagName) || el.getAttribute('role') === 'combobox';
    if (!isTextField) return;

    setTimeout(() => {
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const nextTop = elRect.top - containerRect.top + container.scrollTop - Math.max(24, container.clientHeight * 0.28);
      container.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
    }, 360);
  }

  const needsStudentPicker = ['discipline', 'note', 'communication', 'positive_reinforcement'].includes(action);
  const usesStudentData = needsStudentPicker || action === 'community';
  const today = getLocalDateString();

  const resolvedClassId = classIdProp || user?.profile_class_id || '';
  const approvedClass = user?.profile_homeroom_class || user?.profile_class || '';
  const approvedGrade = getUserApprovedGrade(user);
  const approvedRoles = getAvailableRoles(user);
  const isCoordinator = hasApprovedRole(user, 'coordinator');
  const isAdmin = approvedRoles.includes('admin');
  const activeRole = role || (isAdmin ? 'admin' : isCoordinator ? 'coordinator' : 'homeroom_teacher');
  const hasInitialStudents = Array.isArray(initialStudents);

  // שימוש בתלמידים שכבר נטענו בדשבורד כדי למנוע בקשות כפולות
  useEffect(() => {
    if (!usesStudentData) return;
    if (hasInitialStudents) {
      setStudents(initialStudents);
      setLoadingStudents(false);
      return;
    }
    loadStudents();
  }, [action, usesStudentData, resolvedClassId, hasInitialStudents, initialStudents]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll on iOS while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // כל פעולה מהירה מתחילה מטופס נקי כדי למנוע זליגת נתונים בין מודולים
  useEffect(() => {
    setForm({});
    setSearchQuery('');
    setStudentListOpen(false);
    setStudents(hasInitialStudents ? initialStudents : []);
  }, [action, hasInitialStudents, initialStudents]);

  async function loadStudents() {
    setLoadingStudents(true);
    let fetched = [];

    if (activeRole === 'admin') {
      fetched = await base44.entities.Student.list();
    } else if (activeRole === 'division_manager') {
      const divisionGrades = getUserDivisionGrades(user);
      const all = await base44.entities.Student.list();
      fetched = all.filter(student => divisionGrades.includes(student.grade));
    } else if (activeRole === 'coordinator' && approvedGrade) {
      fetched = await base44.entities.Student.filter({ grade: approvedGrade });
    } else {
      const all = await base44.entities.Student.list();
      const seen = new Set();
      fetched = all.filter(s => {
        if (studentMatchesClass(s, resolvedClassId, approvedClass) && !seen.has(s.id)) {
          seen.add(s.id);
          return true;
        }
        return false;
      });
    }

    setStudents(fetched);
    setLoadingStudents(false);
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function handleStudentSelect(student) {
    const studentName = getStudentDisplayName(student);
    setForm(p => ({
      ...p,
      student_id: student.id,
      student_name: studentName,
      selectedStudentId: student.id,
      selectedStudentName: studentName,
    }));
    setSearchQuery(studentName);
    setStudentListOpen(false);
  }

  const getSelectedStudent = () => students.find(s => s.id === form.student_id);

  const filteredStudents = sortByLastName(students)
    .filter(s => !searchQuery || getStudentDisplayName(s).toLowerCase().includes(searchQuery.toLowerCase()));

  async function saveDisciplineAction() {
    const student = getSelectedStudent();
    const disciplineData = {
      student_id: form.student_id,
      student_name: form.student_name || student?.full_name,
      class_id: resolvedClassId,
      date: today,
      time: form.time || '',
      severity: form.severity || 'קלה',
      category: form.category || 'התנהגות',
      description: form.description || '',
      treatment: '',
      parents_updated: false,
      status: 'פתוח'
    };
    await base44.entities.DisciplineEvent.create(disciplineData);
  }

  async function saveExamAction() {
    const examData = {
      class_id: resolvedClassId,
      title: form.title,
      subject: form.subject,
      type: form.type || 'מבחן',
      date: form.date || today,
      time: form.time || '',
      teacher: form.teacher || '',
      material: form.material || '',
      notes: form.notes || ''
    };
    await base44.entities.Exam.create(examData);
  }

  async function saveAnnouncementAction() {
    const announcementData = {
      class_id: resolvedClassId,
      title: form.title,
      content: form.content,
      type: form.type || 'כיתתית',
      requires_confirmation: false,
      published_at: today,
      is_published: true
    };
    await base44.entities.Announcement.create(announcementData);
  }

  async function saveNoteAction() {
    const student = getSelectedStudent();
    const noteData = {
      student_id: form.student_id,
      student_name: form.student_name || student?.full_name,
      class_id: resolvedClassId,
      date: today,
      content: form.content,
      category: form.category || 'כללי',
      is_private: true
    };
    await base44.entities.TeacherNote.create(noteData);
  }

  async function saveCommunicationAction() {
    const student = getSelectedStudent();
    const communicationData = {
      student_id: form.student_id,
      student_name: form.student_name || student?.full_name,
      class_id: resolvedClassId,
      date: today,
      type: form.type || 'שיחה טלפונית',
      with_whom: form.with_whom || 'הורה 1',
      summary: form.summary || '',
      follow_up: form.follow_up || ''
    };
    await base44.entities.Communication.create(communicationData);
  }

  async function saveTaskAction() {
    const student = getSelectedStudent();
    const taskData = {
      class_id: resolvedClassId,
      student_id: form.student_id,
      student_name: form.student_name || student?.full_name,
      title: form.title,
      description: form.description || '',
      due_date: form.due_date || today,
      priority: form.priority || 'בינונית',
      status: 'לביצוע',
      category: 'כללי'
    };
    await base44.entities.Task.create(taskData);
  }

  const saveHandlers = {
    discipline: saveDisciplineAction,
    exam: saveExamAction,
    announcement: saveAnnouncementAction,
    note: saveNoteAction,
    communication: saveCommunicationAction,
    task: saveTaskAction,
    positive_reinforcement: () => false, // Handled by PositiveReinforcementDialog
  };

  async function handleSave() {
    if (needsStudentPicker && !form.student_id) {
      toast.error('יש לבחור תלמיד');
      return;
    }
    const saveAction = saveHandlers[action];
    if (!saveAction) return;
    setSaving(true);
    try {
      const saved = await saveAction();
      if (saved === false) { setSaving(false); return; }
      await logActivity({
        user, role,
        actionName: `quick_${action}`,
        details: `${user?.full_name || 'משתמש'} ביצע/ה פעולה מהירה: ${titles[action]}`,
        metadata: { classId: resolvedClassId }
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
      {/* Backdrop — close on click of the backdrop itself only (not bubbled events) */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      />

      {/* Sheet panel — follows visualViewport so it floats above the keyboard */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed',
          top: sheetTop ?? undefined,
          right: 0,
          left: 0,
          height: sheetHeight ? `${sheetHeight}px` : '85vh',
          maxHeight: 'calc(100dvh - var(--app-mobile-overlay-bottom-space) - 1rem)',
          background: 'hsl(var(--card))',
          borderRadius: '1rem 1rem 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'top 0.2s ease, height 0.2s ease',
        }}
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
        <div
          ref={scrollAreaRef}
          onFocusCapture={handleFieldFocus}
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '1rem',
            paddingRight: '1rem',
            paddingLeft: '1rem',
            paddingBottom: keyboardOpen
            ? `${Math.max(120, sheetBottom + 24)}px`
            : 'var(--app-overlay-padding-bottom)',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {action === 'positive_reinforcement' ? (
            <div className="space-y-4">
              {/* Student picker */}
              <div className="space-y-1">
                <Label>תלמיד</Label>
                {loadingStudents ? (
                  <p className="text-sm text-muted-foreground">טוען תלמידים...</p>
                ) : students.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-3 text-center">
                    <p className="text-sm text-muted-foreground">לא נמצאו תלמידים המשויכים לכיתה שלך</p>
                  </div>
                ) : (
                  <div className="space-y-2" dir="rtl">
                    <div className="flex items-center gap-2" dir="rtl">
                      <Input
                        placeholder="חיפוש תלמיד/ה..."
                        value={studentListOpen ? searchQuery : (form.selectedStudentName || form.student_name || searchQuery || '')}
                        onChange={e => setSearchQuery(e.target.value)}
                        onFocus={() => {
                          setSearchQuery(form.selectedStudentName || form.student_name || searchQuery || '');
                          setStudentListOpen(true);
                        }}
                        className="text-sm flex-1 text-right"
                      />
                      <button
                        type="button"
                        onClick={() => setStudentListOpen(open => !open)}
                        aria-expanded={studentListOpen}
                        aria-label={studentListOpen ? 'סגור רשימת תלמידים' : 'פתח רשימת תלמידים'}
                        className="h-9 w-9 flex-shrink-0 rounded-md border border-input bg-background inline-flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${studentListOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${studentListOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border" style={{ WebkitOverflowScrolling: 'touch' }} dir="rtl">
                        {filteredStudents.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-muted-foreground text-right">לא נמצאו תלמידים תואמים</div>
                        ) : filteredStudents.map(s => {
                          const selected = (form.selectedStudentId || form.student_id) === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => handleStudentSelect(s)}
                              className={`w-full flex items-center justify-between gap-2 text-right px-3 py-2.5 text-sm transition-colors ${selected ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'}`}
                              dir="rtl"
                            >
                              <span>{getStudentDisplayName(s)}</span>
                              {selected && <Check size={16} className="flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {getSelectedStudent() && (
                <PositiveReinforcementDialog
                  student={getSelectedStudent()}
                  classId={resolvedClassId}
                  user={user}
                  onClose={onClose}
                  onSuccess={onSuccess}
                />
              )}
            </div>
          ) : action === 'community' ? (
            <CommunityExceptionsQuickAction students={students} loading={loadingStudents} user={user} role={activeRole} />
          ) : (
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
                  <div className="space-y-2" dir="rtl">
                    <div className="flex items-center gap-2" dir="rtl">
                      <Input
                        placeholder="חיפוש תלמיד/ה..."
                        value={studentListOpen ? searchQuery : (form.selectedStudentName || form.student_name || searchQuery || '')}
                        onChange={e => setSearchQuery(e.target.value)}
                        onFocus={() => {
                          setSearchQuery(form.selectedStudentName || form.student_name || searchQuery || '');
                          setStudentListOpen(true);
                        }}
                        className="text-sm flex-1 text-right"
                      />
                      <button
                        type="button"
                        onClick={() => setStudentListOpen(open => !open)}
                        aria-expanded={studentListOpen}
                        aria-label={studentListOpen ? 'סגור רשימת תלמידים' : 'פתח רשימת תלמידים'}
                        className="h-9 w-9 flex-shrink-0 rounded-md border border-input bg-background inline-flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${studentListOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${studentListOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border" style={{ WebkitOverflowScrolling: 'touch' }} dir="rtl">
                        {filteredStudents.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-muted-foreground text-right">לא נמצאו תלמידים תואמים</div>
                        ) : filteredStudents.map(s => {
                          const selected = (form.selectedStudentId || form.student_id) === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => handleStudentSelect(s)}
                              className={`w-full flex items-center justify-between gap-2 text-right px-3 py-2.5 text-sm transition-colors ${selected ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'}`}
                              dir="rtl"
                            >
                              <span>{getStudentDisplayName(s)}</span>
                              {selected && <Check size={16} className="flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
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
                <Textarea placeholder="תיאור..." onChange={e => set('description', e.target.value)} onFocus={handleFieldFocus} rows={3} className="resize-none" />
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
                <Textarea placeholder="תוכן ההודעה..." onChange={e => set('content', e.target.value)} onFocus={handleFieldFocus} rows={3} className="resize-none" />
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
                <Textarea placeholder="כתוב כאן..." onChange={e => set(action === 'note' ? 'content' : 'summary', e.target.value)} onFocus={handleFieldFocus} rows={3} className="resize-none" />
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

            {/* Actions */}
            <div className="flex gap-2 pt-1" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
              <Button onClick={handleSave} disabled={saving || (needsStudentPicker && students.length === 0)} className="flex-1">
                {saving ? 'שומר...' : 'שמור'}
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1">ביטול</Button>
            </div>

          </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}