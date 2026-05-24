import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { getStudentClassId } from '@/lib/studentProfile';
import { getUserApprovedClassId } from '@/lib/schoolStructure';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CalendarDays, FileUp, LayoutGrid, List, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import EventFilters, { filterByGroup, filterBySearch } from '@/components/exams/EventFilters';
import EventTypeBadge from '@/components/exams/EventTypeBadge';
import { MonthView, WeekView, DayView } from '@/components/exams/ExamCalendarViews';
import SmartCalendarImportDialog from '@/components/exams/SmartCalendarImportDialog';
import EventFormDialog from '@/components/exams/EventFormDialog';
import EventDetailsDialog from '@/components/exams/EventDetailsDialog';
import ClassTrackingPanel from '@/components/exams/ClassTrackingPanel';
import UpcomingEventsPanel from '@/components/exams/UpcomingEventsPanel';
import SmartCalendarEmptyState from '@/components/exams/SmartCalendarEmptyState';
import { isEventRelevantForStudent } from '@/components/exams/AudienceEditor';

export default function Exams({ role, user }) {
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('week');
  const [offset, setOffset] = useState(0);
  const [filterGroup, setFilterGroup] = useState('all');
  const [search, setSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState(true);
  const [showTracking, setShowTracking] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const canImport = ['admin', 'coordinator'].includes(role);
  const canEdit = ['admin', 'coordinator', 'homeroom_teacher'].includes(role);
  const canTrack = ['coordinator', 'homeroom_teacher'].includes(role);
  const isStudent = role === 'student';
  const classId = isStudent ? getStudentClassId(user, CLASS_ID) : getUserApprovedClassId(user, CLASS_ID);
  const todayIso = new Date().toISOString().split('T')[0];

  useEffect(() => { loadData(); }, [classId]);

  async function loadData() {
    setLoading(true);
    const [eventData, studentData, completionData] = await Promise.all([
      base44.entities.Exam.filter({ class_id: classId }),
      base44.entities.Student.filter({ class_id: classId }),
      base44.entities.ExamCompletion.list()
    ]);
    setEvents((eventData || []).sort((a, b) => (a.date || '').localeCompare(b.date || '')));
    setStudents(studentData || []);
    setCompletions(completionData || []);
    setLoading(false);
  }

  const currentStudent = useMemo(() => {
    if (!isStudent) return null;
    return students.find(s => s.email === user?.email || s.user_email === user?.email) || students[0] || null;
  }, [isStudent, students, user]);

  const completionsByEvent = useMemo(() => Object.fromEntries(completions.map(c => [c.exam_id, c])), [completions]);

  const demoEvents = useMemo(() => [
    { id: 'demo_1', class_id: classId, title: 'בגרות במתמטיקה', subject: 'מתמטיקה', type: 'בגרות', date: todayIso, time: '09:00', audience_scope: 'grade', audience_grades: ['יב'], material: 'חדו״א, הסתברות וגיאומטריה' },
    { id: 'demo_2', class_id: classId, title: 'חזרה לטקס סיום', subject: 'שכבה', type: 'טקס', date: todayIso, time: '12:00', audience_scope: 'school', notes: 'באולם הספורט' },
    { id: 'demo_3', class_id: classId, title: 'צילומי מחזור', subject: 'שכבה', type: 'צילומים', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '10:30', audience_scope: 'class', audience_classes: ['יב5', 'יב7'] },
    { id: 'demo_4', class_id: classId, title: 'מועד ב׳ באנגלית', subject: 'אנגלית', type: 'מועד ב׳', date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0], time: '08:30', audience_scope: 'subject', audience_subjects: ['אנגלית'] }
  ], [classId, todayIso]);

  const sourceEvents = showDemo && events.length === 0 ? demoEvents : events;

  const visibleEvents = useMemo(() => {
    let list = filterBySearch(filterByGroup(sourceEvents, filterGroup), search);
    if (isStudent && currentStudent && onlyMine) {
      list = list.filter(event => isEventRelevantForStudent(event, currentStudent));
      list = list.filter(event => completionsByEvent[event.id]?.status !== 'not_relevant');
    }
    return list;
  }, [sourceEvents, filterGroup, search, isStudent, currentStudent, onlyMine, completionsByEvent]);

  async function saveEvent(form) {
    if (!form.title || !form.date) return;
    if (editingEvent?.id?.startsWith('demo_')) return;
    if (editingEvent) await base44.entities.Exam.update(editingEvent.id, { ...form, class_id: classId });
    else await base44.entities.Exam.create({ ...form, class_id: classId });
    toast.success(editingEvent ? 'האירוע עודכן' : 'האירוע נוסף');
    setShowForm(false);
    setEditingEvent(null);
    loadData();
  }

  async function deleteEvent(id) {
    if (String(id).startsWith('demo_')) return;
    if (!window.confirm('למחוק את האירוע?')) return;
    await base44.entities.Exam.delete(id);
    toast.success('האירוע נמחק');
    setSelectedEvent(null);
    loadData();
  }

  async function updateStudentStatus(payload) {
    if (!currentStudent || !selectedEvent) return;
    const existing = completions.find(c => c.exam_id === selectedEvent.id && c.student_id === currentStudent.id);
    const data = { exam_id: selectedEvent.id, student_id: currentStudent.id, student_name: currentStudent.full_name, ...payload, completed_at: payload.status === 'done' ? new Date().toISOString() : '' };
    if (existing) await base44.entities.ExamCompletion.update(existing.id, data);
    else await base44.entities.ExamCompletion.create(data);
    loadData();
  }

  function openEdit(event) {
    setSelectedEvent(null);
    setEditingEvent(event);
    setShowForm(true);
  }

  const upcoming = visibleEvents.filter(event => event.date >= todayIso).slice(0, 8);

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader
        title="לוח שנה שכבתי חכם"
        subtitle="כל אירועי השכבה במקום אחד — מבחנים, בגרויות, חזרות, טקסים, חגים, צילומים ופעילויות"
        actions={
          <>
            {canTrack && <Button variant={showTracking ? 'default' : 'outline'} size="sm" onClick={() => setShowTracking(v => !v)}><Users className="w-4 h-4" />מעקב כיתתי</Button>}
            {canImport && <Button size="sm" onClick={() => setShowImport(true)}><FileUp className="w-4 h-4" />ייבוא לוח מקובץ</Button>}
            {canEdit && <Button variant="outline" size="sm" onClick={() => { setEditingEvent(null); setShowForm(true); }}><Plus className="w-4 h-4" />הוסף אירוע</Button>}
          </>
        }
      />

      <EventFilters activeGroup={filterGroup} onGroupChange={setFilterGroup} search={search} onSearchChange={setSearch} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {isStudent && <Button size="sm" variant={onlyMine ? 'default' : 'outline'} onClick={() => setOnlyMine(v => !v)}>{onlyMine ? 'הלוח שלי' : 'כל הלוח השכבתי'}</Button>}
        <div className="flex gap-1 rounded-lg border bg-card p-1 ms-auto overflow-x-auto max-w-full">
          <Button size="sm" className="whitespace-nowrap" variant={view === 'month' ? 'default' : 'ghost'} onClick={() => { setView('month'); setOffset(0); }}><CalendarDays className="w-4 h-4" />חודש</Button>
          <Button size="sm" className="whitespace-nowrap" variant={view === 'week' ? 'default' : 'ghost'} onClick={() => { setView('week'); setOffset(0); }}><LayoutGrid className="w-4 h-4" />שבוע</Button>
          <Button size="sm" className="whitespace-nowrap" variant={view === 'day' ? 'default' : 'ghost'} onClick={() => { setView('day'); setOffset(0); }}><CalendarDays className="w-4 h-4" />יום</Button>
          <Button size="sm" className="whitespace-nowrap" variant={view === 'list' ? 'default' : 'ghost'} onClick={() => setView('list')}><List className="w-4 h-4" />רשימה</Button>
        </div>
      </div>

      {visibleEvents.length > 0 && <UpcomingEventsPanel events={visibleEvents} todayIso={todayIso} onEventClick={setSelectedEvent} />}

      {showTracking && canTrack && <ClassTrackingPanel events={visibleEvents} classId={classId} todayIso={todayIso} />}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" /></div>
      ) : visibleEvents.length === 0 ? (
        <SmartCalendarEmptyState
          canImport={canImport}
          canAdd={canEdit}
          onImport={() => setShowImport(true)}
          onAdd={() => { setEditingEvent(null); setShowForm(true); }}
          onDemo={() => setShowDemo(true)}
        />
      ) : view === 'month' ? (
        <MonthView events={visibleEvents} offset={offset} onOffsetChange={setOffset} onEventClick={setSelectedEvent} todayIso={todayIso} />
      ) : view === 'week' ? (
        <WeekView events={visibleEvents} offset={offset} onOffsetChange={setOffset} onEventClick={setSelectedEvent} todayIso={todayIso} />
      ) : view === 'day' ? (
        <DayView events={visibleEvents} offset={offset} onOffsetChange={setOffset} onEventClick={setSelectedEvent} />
      ) : (
        <div className="space-y-2">{upcoming.map(event => <Card key={event.id} className="p-3 cursor-pointer hover:shadow-sm" onClick={() => setSelectedEvent(event)}><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">{event.title}</h3><p className="text-xs text-muted-foreground">{event.date}{event.time ? ` · ${event.time}` : ''}</p></div><EventTypeBadge type={event.type} /></div></Card>)}</div>
      )}

      {canImport && <SmartCalendarImportDialog open={showImport} onOpenChange={setShowImport} classId={classId} onImported={loadData} />}
      <EventFormDialog open={showForm} onOpenChange={setShowForm} event={editingEvent} onSave={saveEvent} />
      <EventDetailsDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        canEdit={canEdit && !selectedEvent?.id?.startsWith('demo_')}
        isStudent={isStudent}
        completion={selectedEvent ? completions.find(c => c.exam_id === selectedEvent.id && c.student_id === currentStudent?.id) : null}
        onStudentUpdate={updateStudentStatus}
        onEdit={openEdit}
        onDelete={deleteEvent}
      />
    </div>
  );
}