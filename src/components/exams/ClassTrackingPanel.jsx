import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { Loader2, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import EventTypeBadge from './EventTypeBadge';

export default function ClassTrackingPanel({ exams, classId, todayIso }) {
  const [students, setStudents] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [studentsData, allCompletions] = await Promise.all([
        base44.entities.Student.filter({ class_id: classId }),
        base44.entities.ExamCompletion.list()
      ]);
      if (cancelled) return;
      setStudents(studentsData || []);
      setCompletions(allCompletions || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [classId]);

  const upcoming = useMemo(
    () => exams.filter(e => e.date >= todayIso).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6),
    [exams, todayIso]
  );

  const weekCounts = useMemo(() => {
    const counts = {};
    for (const e of exams.filter(x => x.date >= todayIso)) {
      const d = new Date(e.date);
      d.setDate(d.getDate() - d.getDay());
      const key = d.toISOString().split('T')[0];
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [exams, todayIso]);
  const overloadWeeks = Object.entries(weekCounts).filter(([, v]) => v >= 4);

  const studentLoad = useMemo(() => {
    const upcomingAll = exams.filter(e => e.date >= todayIso);
    return students.map(s => ({
      student: s,
      total: upcomingAll.length,
      ready: completions.filter(c => c.student_id === s.id && ['ready', 'done'].includes(c.status)).length
    })).sort((a, b) => a.ready - b.ready);
  }, [students, completions, exams, todayIso]);

  const conflicts = useMemo(() => {
    const examTypes = ['בגרות', 'מתכונת', 'מועד ב׳', 'מבחן', 'בחן'];
    const byDate = {};
    for (const e of exams.filter(x => x.date >= todayIso && examTypes.includes(x.type))) {
      (byDate[e.date] = byDate[e.date] || []).push(e);
    }
    return Object.entries(byDate).filter(([, list]) => list.length >= 3);
  }, [exams, todayIso]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {(overloadWeeks.length > 0 || conflicts.length > 0) && (
        <Card className="p-4 border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-900/10">
          <div className="flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="font-semibold text-sm">התראות עומס והתנגשויות</h3>
          </div>
          <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
            {overloadWeeks.map(([week, count]) => (
              <li key={week}>שבוע של {week} — {count} פריטים מתוכננים</li>
            ))}
            {conflicts.map(([date, list]) => (
              <li key={date}>{date}: {list.length} מבחנים באותו יום ({list.map(e => e.title).join(', ')})</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">מעקב הכנה — אירועים קרובים</h3>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין אירועים קרובים</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map(exam => {
              const examCompletions = completions.filter(c => c.exam_id === exam.id);
              const ready = examCompletions.filter(c => ['ready', 'done'].includes(c.status)).length;
              const notRelevant = examCompletions.filter(c => c.status === 'not_relevant').length;
              const total = students.length || 1;
              const pct = Math.round((ready / total) * 100);
              const notMarked = students.filter(s => !examCompletions.find(c => c.student_id === s.id));
              return (
                <div key={exam.id} className="border rounded-lg p-3 bg-card">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap flex-row-reverse">
                      <span className="font-medium text-sm">{exam.title}</span>
                      <EventTypeBadge type={exam.type} />
                    </div>
                    <span className="text-xs text-muted-foreground">{exam.date}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-12 text-end">{pct}%</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>מוכנים: {ready}/{students.length}</span>
                    {notRelevant > 0 && <span>לא רלוונטי: {notRelevant}</span>}
                    {notMarked.length > 0 && (
                      <span title={notMarked.map(s => s.full_name).join(', ')}>לא סימנו: {notMarked.length}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">תלמידים שזקוקים לתשומת לב</h3>
        </div>
        {studentLoad.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין תלמידים בכיתה</p>
        ) : (
          <div className="space-y-1.5">
            {studentLoad.slice(0, 5).map(({ student, ready, total }) => (
              <div key={student.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-1.5 last:pb-0">
                <span className="font-medium">{student.full_name}</span>
                <span className="text-xs text-muted-foreground">סימן {ready} מתוך {total} אירועים</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}