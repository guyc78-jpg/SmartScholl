import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, Clock, LogOut, Loader2, Search, AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { formatStudentName, compareStudentsByLastName } from '@/lib/studentName';

const PRESENT = 'נוכח/ת';
const LATE = 'מאחר/ת';
const ABSENT = 'נעדר/ת';
const RELEASED = 'שוחרר';

const EXCEPTION_OPTIONS = [
  { key: LATE, label: 'מאחר/ת', icon: Clock, color: 'bg-amber-500 text-white border-amber-500 hover:bg-amber-500' },
  { key: ABSENT, label: 'נעדר/ת', icon: X, color: 'bg-red-600 text-white border-red-600 hover:bg-red-600' },
  { key: RELEASED, label: 'שוחרר/ה', icon: LogOut, color: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-600' },
];

const sortByLastName = (students) => [...students].sort(compareStudentsByLastName);
const displayName = formatStudentName;

export default function QuickAttendanceForm({ classId, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const [students, setStudents] = useState([]);
  const [existing, setExisting] = useState({}); // student_id -> existing record
  const [marks, setMarks] = useState({}); // student_id -> status (only exceptions tracked; missing = present)
  const [notes, setNotes] = useState({}); // student_id -> note (time for late / reason for released)
  const [allPresent, setAllPresent] = useState(false);
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [sts, att] = await Promise.all([
        base44.entities.Student.filter({ class_id: classId }),
        base44.entities.AttendanceRecord.filter({ class_id: classId, date: today }),
      ]);
      const existingMap = {};
      const marksInit = {};
      const notesInit = {};
      let hasPresent = false;
      att.forEach(r => {
        existingMap[r.student_id] = r;
        // Normalize status (some records may be 'נוכח' / 'נעדר' / 'מאחר' without /ת)
        const status = r.status;
        if (status === PRESENT || status === 'נוכח') {
          hasPresent = true;
        } else {
          marksInit[r.student_id] = status;
          if (r.note) notesInit[r.student_id] = r.note;
        }
      });
      setExisting(existingMap);
      setMarks(marksInit);
      setNotes(notesInit);
      // If any previously-saved record marked someone present, treat as already confirmed
      if (hasPresent || att.length > 0) setAllPresent(true);
      setStudents(sortByLastName(sts));
      setLoading(false);
    })();
  }, [classId, today]);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.trim().toLowerCase();
    return students.filter(s => (s.full_name || '').toLowerCase().includes(q));
  }, [students, search]);

  const exceptionsCount = Object.keys(marks).length;
  const presentCount = Math.max(0, students.length - exceptionsCount);

  const setMark = (id, status) => {
    setMarks(p => {
      const next = { ...p };
      if (next[id] === status) delete next[id]; // toggle off → back to present
      else next[id] = status;
      return next;
    });
  };

  const clearMark = (id) => {
    setMarks(p => { const n = { ...p }; delete n[id]; return n; });
    setNotes(p => { const n = { ...p }; delete n[id]; return n; });
  };

  const setNote = (id, value) => setNotes(p => ({ ...p, [id]: value }));

  const confirmAllPresent = () => {
    setAllPresent(true);
    setConfirmAllOpen(false);
  };

  const resetForm = () => {
    setAllPresent(false);
    setMarks({});
    setNotes({});
  };

  const handleSave = async () => {
    setSaving(true);
    const ops = [];
    for (const s of students) {
      const status = marks[s.id] || PRESENT;
      const note = notes[s.id] || '';
      const prev = existing[s.id];
      const payload = {
        student_id: s.id,
        student_name: s.full_name,
        class_id: classId,
        date: today,
        status,
        note,
      };
      if (prev) {
        if (prev.status !== status || (prev.note || '') !== note) {
          ops.push(base44.entities.AttendanceRecord.update(prev.id, { status, note }));
        }
      } else {
        ops.push(base44.entities.AttendanceRecord.create(payload));
      }
    }
    await Promise.all(ops);

    // Run pattern detection — surface immediate alerts for this class
    let patternMsg = null;
    try {
      const res = await base44.functions.invoke('generateSmartAlerts', {});
      const classAlerts = (res?.data?.alerts || []).filter(a =>
        a.class_id === classId && ['high_absences', 'consecutive_lates'].includes(a.alert_type)
      );
      if (classAlerts.length > 0) {
        const names = [...new Set(classAlerts.map(a => a.student_name))];
        patternMsg = `⚠️ ${names.length} תלמיד/ים עם דפוס חריג: ${names.slice(0, 3).join(', ')}${names.length > 3 ? '...' : ''}`;
      }
    } catch {
      // pattern detection is non-blocking
    }

    toast.success('הנוכחות נשמרה בהצלחה');
    if (patternMsg) {
      setTimeout(() => toast.warning(patternMsg, { duration: 6000 }), 400);
    }
    setSaving(false);
    onSaved?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground" dir="rtl">
        <Loader2 className="w-5 h-5 animate-spin ml-2" />
        טוען תלמידים...
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground" dir="rtl">
        לא נמצאו תלמידים בכיתה
      </div>
    );
  }

  // Step 1: ask for "all present" confirmation
  if (!allPresent) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
          <p className="text-sm text-foreground/80 mb-1">תאריך: <span className="font-semibold">{today}</span></p>
          <p className="text-sm text-foreground/80">בכיתה <span className="font-semibold">{students.length}</span> תלמידים</p>
        </div>
        <Button
          onClick={() => setConfirmAllOpen(true)}
          className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Check className="w-5 h-5 ml-1.5" />
          כולם נוכחים
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          לאחר האישור תוכל/י לסמן חריגים בלבד (מאחר/נעדר/שוחרר)
        </p>

        <AlertDialog open={confirmAllOpen} onOpenChange={setConfirmAllOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-right">סימון כל הכיתה כנוכחים</AlertDialogTitle>
              <AlertDialogDescription className="text-right">
                האם לאשר שכל {students.length} התלמידים נוכחים היום? תוכל/י לסמן חריגים בשלב הבא.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAllPresent} className="bg-emerald-600 hover:bg-emerald-700">
                אישור
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Step 2: mark exceptions
  return (
    <div className="space-y-3" dir="rtl">
      {/* Summary bar */}
      <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 font-medium">
          <Check className="w-4 h-4" />
          {presentCount} נוכחים · {exceptionsCount} חריגים
        </div>
        <button
          onClick={resetForm}
          className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          איפוס
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="חיפוש תלמיד..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-9 h-9 text-sm"
        />
      </div>

      <p className="text-xs text-muted-foreground">סמן/י רק תלמידים חריגים — השאר יישמרו כנוכחים</p>

      {/* Student list */}
      <div className="space-y-1.5">
        {filteredStudents.map(s => {
          const current = marks[s.id];
          const showNote = current === LATE || current === RELEASED;
          return (
            <div
              key={s.id}
              className={`rounded-lg border px-2.5 py-2 transition-colors ${
                current ? 'border-primary/30 bg-primary/[0.03]' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate text-right">
                    {displayName(s.full_name)}
                  </span>
                  {!current && (
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                      נוכח/ת
                    </span>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {EXCEPTION_OPTIONS.map(opt => {
                    const active = current === opt.key;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setMark(s.id, opt.key)}
                        title={opt.label}
                        className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${
                          active ? opt.color : 'bg-card border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    );
                  })}
                  {current && (
                    <button
                      type="button"
                      onClick={() => clearMark(s.id)}
                      title="בטל סימון"
                      className="w-8 h-8 rounded-md border border-border text-muted-foreground hover:bg-muted flex items-center justify-center"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {showNote && (
                <Input
                  placeholder={current === LATE ? 'שעת איחור (אופציונלי)' : 'סיבת השחרור (אופציונלי)'}
                  value={notes[s.id] || ''}
                  onChange={e => setNote(s.id, e.target.value)}
                  className="mt-2 h-8 text-xs"
                />
              )}
            </div>
          );
        })}
        {filteredStudents.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">לא נמצאו תוצאות</p>
        )}
      </div>

      {/* Save */}
      <div className="pt-2 sticky bottom-0 bg-card">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 text-sm font-semibold"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin ml-1.5" /> שומר...</>
          ) : (
            <>שמור נוכחות · {presentCount} נוכחים, {exceptionsCount} חריגים</>
          )}
        </Button>
      </div>
    </div>
  );
}