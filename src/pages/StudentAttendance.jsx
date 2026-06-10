import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { getStudentClassId } from '@/lib/studentProfile';
import { fetchMyStudent } from '@/lib/studentData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/StatusBadge';
import { CalendarCheck } from 'lucide-react';

const fmt = d => d ? new Date(d).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' }) : '';

const STAT_CHIPS = [
  { status: 'נוכח', classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' },
  { status: 'נעדר', classes: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' },
  { status: 'מאחר', classes: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' },
  { status: 'מוצדק', classes: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
  { status: 'שוחרר', classes: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' },
];

export default function StudentAttendance({ user }) {
  const classId = getStudentClassId(user, CLASS_ID);
  const [records, setRecords] = useState(null);

  useEffect(() => {
    (async () => {
      const student = await fetchMyStudent(user, classId);
      const recs = student
        ? await base44.entities.AttendanceRecord.filter({ student_id: student.id }, '-date', 90)
        : [];
      setRecords(recs.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    })();
  }, [classId]);

  if (!records) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const counts = STAT_CHIPS.map(chip => ({ ...chip, count: records.filter(r => r.status === chip.status).length }));
  const presentPct = records.length ? Math.round((counts[0].count / records.length) * 100) : null;

  return (
    <div className="p-4 lg:p-6 space-y-4 text-right max-w-3xl mx-auto" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">הנוכחות שלי</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{presentPct !== null ? `${presentPct}% נוכחות מתוך ${records.length} רישומים אחרונים` : 'מעקב נוכחות אישי'}</p>
      </div>

      {/* סיכום */}
      <div className="flex flex-wrap gap-2" dir="rtl">
        {counts.filter(c => c.count > 0).map(c => (
          <span key={c.status} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${c.classes}`}>{c.status} · {c.count}</span>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-emerald-500" />רישומים אחרונים</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">עדיין אין רישומי נוכחות.</p>
          ) : (
            <div className="space-y-2">
              {records.slice(0, 40).map(r => (
                <div key={r.id} className={`flex items-center gap-3 rounded-xl border p-2.5 ${r.status !== 'נוכח' ? 'bg-muted/40' : ''}`}>
                  <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{fmt(r.date)}</span>
                  <StatusBadge status={r.status} />
                  {r.period && <span className="text-xs text-muted-foreground flex-shrink-0">שיעור {r.period}</span>}
                  {r.note && <span className="text-xs text-muted-foreground truncate flex-1">{r.note}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}