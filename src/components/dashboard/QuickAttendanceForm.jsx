import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUSES = [
  { key: 'נוכח/ת', label: 'נוכח', icon: Check, activeClass: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-600' },
  { key: 'נעדר/ת', label: 'נעדר', icon: X, activeClass: 'bg-red-600 text-white border-red-600 hover:bg-red-600' },
  { key: 'מאחר/ת', label: 'מאחר', icon: Clock, activeClass: 'bg-amber-500 text-white border-amber-500 hover:bg-amber-500' },
];

function sortByLastName(students) {
  return [...students].sort((a, b) => {
    const lastA = (a.full_name || '').trim().split(/\s+/).pop();
    const lastB = (b.full_name || '').trim().split(/\s+/).pop();
    return lastA.localeCompare(lastB, 'he');
  });
}

function displayName(fullName = '') {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[parts.length - 1]} ${parts.slice(0, -1).join(' ')}`;
}

export default function QuickAttendanceForm({ classId, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const [students, setStudents] = useState([]);
  const [existing, setExisting] = useState({}); // student_id -> record
  const [marks, setMarks] = useState({}); // student_id -> status
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
      att.forEach(r => {
        existingMap[r.student_id] = r;
        marksInit[r.student_id] = r.status;
      });
      setExisting(existingMap);
      setMarks(marksInit);
      setStudents(sortByLastName(sts));
      setLoading(false);
    })();
  }, [classId, today]);

  const markAll = (status) => {
    const next = {};
    students.forEach(s => { next[s.id] = status; });
    setMarks(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ops = [];
      for (const s of students) {
        const status = marks[s.id];
        if (!status) continue;
        const prev = existing[s.id];
        if (prev) {
          if (prev.status !== status) {
            ops.push(base44.entities.AttendanceRecord.update(prev.id, { status }));
          }
        } else {
          ops.push(base44.entities.AttendanceRecord.create({
            student_id: s.id,
            student_name: s.full_name,
            class_id: classId,
            date: today,
            status,
          }));
        }
      }
      await Promise.all(ops);
      toast.success('הנוכחות נשמרה');
      onSaved?.();
    } catch {
      toast.error('שגיאה בשמירת הנוכחות');
    }
    setSaving(false);
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

  const markedCount = Object.values(marks).filter(Boolean).length;

  return (
    <div className="space-y-3" dir="rtl">
      {/* Bulk actions */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
        <span className="text-xs text-muted-foreground">סומנו {markedCount} / {students.length}</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => markAll('נוכח/ת')}
            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            סמן הכל נוכח
          </button>
        </div>
      </div>

      {/* Student list */}
      <div className="space-y-1.5">
        {students.map(s => {
          const current = marks[s.id];
          return (
            <div
              key={s.id}
              className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/50"
            >
              <span className="text-sm font-medium text-foreground truncate flex-1 text-right">
                {displayName(s.full_name)}
              </span>
              <div className="flex gap-1 flex-shrink-0">
                {STATUSES.map(st => {
                  const active = current === st.key;
                  const Icon = st.icon;
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => setMarks(p => ({ ...p, [s.id]: st.key }))}
                      title={st.label}
                      className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${
                        active ? st.activeClass : 'bg-card border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <div className="pt-2 sticky bottom-0 bg-card">
        <Button onClick={handleSave} disabled={saving || markedCount === 0} className="w-full">
          {saving ? 'שומר...' : `שמור נוכחות (${markedCount})`}
        </Button>
      </div>
    </div>
  );
}