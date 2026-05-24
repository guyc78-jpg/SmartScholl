import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Loader2, Users } from 'lucide-react';
import EventTypeBadge from './EventTypeBadge';

export default function ClassTrackingPanel({ events, classId, todayIso }) {
  const [students, setStudents] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [studentsData, completionData] = await Promise.all([
        base44.entities.Student.filter({ class_id: classId }),
        base44.entities.ExamCompletion.list()
      ]);
      if (!active) return;
      setStudents(studentsData || []);
      setCompletions(completionData || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [classId]);

  const upcoming = useMemo(() => events.filter(e => e.date >= todayIso).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8), [events, todayIso]);
  const overloadDays = useMemo(() => {
    const byDate = {};
    events.filter(e => e.date >= todayIso).forEach(e => (byDate[e.date] = byDate[e.date] || []).push(e));
    return Object.entries(byDate).filter(([, list]) => list.length >= 3);
  }, [events, todayIso]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2 p-4">
        <div className="flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-primary" /><h3 className="font-semibold">מעקב כיתתי</h3></div>
        <div className="space-y-3">
          {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">אין אירועים קרובים</p> : upcoming.map(event => {
            const relevant = completions.filter(c => c.exam_id === event.id && c.status !== 'not_relevant');
            const ready = relevant.filter(c => ['ready', 'done'].includes(c.status)).length;
            const pct = students.length ? Math.round((ready / students.length) * 100) : 0;
            return (
              <div key={event.id} className="rounded-xl border p-3">
                <div className="flex justify-between gap-2 mb-2"><span className="font-medium text-sm">{event.title}</span><EventTypeBadge type={event.type} /></div>
                <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                <p className="text-xs text-muted-foreground mt-1">{pct}% מוכנים · {ready}/{students.length} תלמידים</p>
              </div>
            );
          })}
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-amber-500" /><h3 className="font-semibold">עומסים</h3></div>
        {overloadDays.length === 0 ? <p className="text-sm text-muted-foreground">לא זוהו עומסים חריגים</p> : (
          <div className="space-y-2 text-sm">{overloadDays.map(([date, list]) => <div key={date} className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2"><b>{date}</b><p className="text-xs text-muted-foreground">{list.length} אירועים</p></div>)}</div>
        )}
      </Card>
    </div>
  );
}