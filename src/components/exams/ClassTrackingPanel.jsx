import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, CheckCircle2, Loader2, Users, XCircle } from 'lucide-react';
import EventTypeBadge from './EventTypeBadge';

export default function ClassTrackingPanel({ events, classId, todayIso }) {
  const [students, setStudents] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
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
  const selectedEvent = upcoming.find(e => e.id === selectedEventId) || upcoming[0];
  const eventCompletions = completions.filter(c => c.exam_id === selectedEvent?.id);
  const markedIds = new Set(eventCompletions.map(c => c.student_id));
  const marked = students.filter(s => markedIds.has(s.id));
  const unmarked = students.filter(s => !markedIds.has(s.id));
  const needsAttention = students.filter(s => {
    const studentStatuses = completions.filter(c => c.student_id === s.id && events.some(e => e.id === c.exam_id));
    return studentStatuses.filter(c => ['not_started', 'in_progress'].includes(c.status)).length >= 2;
  });

  const weeklyLoad = useMemo(() => {
    const end = new Date(todayIso);
    end.setDate(end.getDate() + 7);
    const endIso = end.toISOString().split('T')[0];
    return events.filter(e => e.date >= todayIso && e.date <= endIso).length;
  }, [events, todayIso]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="grid xl:grid-cols-4 gap-4">
      <Card className="xl:col-span-2 p-4">
        <div className="flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-primary" /><h3 className="font-semibold">מעקב כיתתי</h3></div>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {upcoming.map(event => (
            <Button key={event.id} size="sm" variant={selectedEvent?.id === event.id ? 'default' : 'outline'} className="whitespace-nowrap" onClick={() => setSelectedEventId(event.id)}>
              {event.title}
            </Button>
          ))}
        </div>
        {selectedEvent ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/30 p-3"><div><p className="font-medium">{selectedEvent.title}</p><p className="text-xs text-muted-foreground">{selectedEvent.date}{selectedEvent.time ? ` · ${selectedEvent.time}` : ''}</p></div><EventTypeBadge type={selectedEvent.type} /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <StudentList title="מי סימן" icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} students={marked} completions={eventCompletions} />
              <StudentList title="מי לא סימן" icon={<XCircle className="w-4 h-4 text-red-600" />} students={unmarked} />
            </div>
          </div>
        ) : <p className="text-sm text-muted-foreground">אין אירועים קרובים למעקב.</p>}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-amber-500" /><h3 className="font-semibold">עומס שבועי</h3></div>
        <div className="text-4xl font-bold text-primary mb-1">{weeklyLoad}</div>
        <p className="text-sm text-muted-foreground">אירועים ב-7 הימים הקרובים</p>
        {weeklyLoad >= 5 && <p className="mt-3 text-xs rounded-lg bg-amber-50 text-amber-700 p-2 dark:bg-amber-900/20 dark:text-amber-300">שבוע עמוס — מומלץ לבדוק חפיפות והיערכות.</p>}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-primary" /><h3 className="font-semibold">דורשים התייחסות</h3></div>
        {needsAttention.length === 0 ? <p className="text-sm text-muted-foreground">לא זוהו תלמידים חריגים</p> : <div className="space-y-2">{needsAttention.slice(0, 8).map(s => <div key={s.id} className="text-sm rounded-lg bg-muted/40 p-2">{s.full_name}</div>)}</div>}
      </Card>
    </div>
  );
}

function StudentList({ title, icon, students, completions = [] }) {
  return (
    <div className="rounded-xl border p-3 min-h-[150px]">
      <div className="flex items-center gap-2 mb-2 text-sm font-semibold">{icon}{title} <span className="text-muted-foreground">({students.length})</span></div>
      <div className="space-y-1 max-h-52 overflow-y-auto">
        {students.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">אין רשומות</p> : students.map(student => {
          const completion = completions.find(c => c.student_id === student.id);
          return <div key={student.id} className="text-xs rounded-lg bg-muted/35 p-2 flex justify-between gap-2"><span>{student.full_name}</span>{completion?.status && <span className="text-muted-foreground">{completion.status}</span>}</div>;
        })}
      </div>
    </div>
  );
}