import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { getStudentClassId } from '@/lib/studentProfile';
import { getUserApprovedClass, getUserApprovedClassId } from '@/lib/schoolStructure';
import { findClassRoomByName } from '@/lib/classAssignment';
import PageHeader from '@/components/ui/PageHeader';
import RtlActionBar from '@/components/ui/RtlActionBar';
import { Button } from '@/components/ui/button';
import { FileUp, Plus, Users, Trash2, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import EventFilters, { filterByGroup, filterBySearch } from '@/components/exams/EventFilters';
import { MonthView, WeekView, DayView } from '@/components/exams/ExamCalendarViews';
import SmartCalendarImportDialog from '@/components/exams/SmartCalendarImportDialog';
import EventFormDialog from '@/components/exams/EventFormDialog';
import EventDetailsDialog from '@/components/exams/EventDetailsDialog';
import ClassTrackingPanel from '@/components/exams/ClassTrackingPanel';
import ExamGradeReportsPanel from '@/components/staff/ExamGradeReportsPanel';
import UpcomingEventsPanel from '@/components/exams/UpcomingEventsPanel';
import SmartCalendarEmptyState from '@/components/exams/SmartCalendarEmptyState';
import { isEventRelevantForStudent } from '@/components/exams/AudienceEditor';
import { getAvailableRoles } from '@/lib/roleUtils';
import { getLocalDateString } from '@/lib/attendanceScope.js';

export default function Exams({ role, user }) {
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [gradeReports, setGradeReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('week');
  const [viewOffsets, setViewOffsets] = useState({ day: 0, week: 0, month: 0 });
  const [filterGroup, setFilterGroup] = useState('all');
  const [search, setSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState(true);
  const [showTracking, setShowTracking] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeClassId, setActiveClassId] = useState('');

  const approvedRoles = getAvailableRoles(user);
  const canImport = approvedRoles.includes('admin') || approvedRoles.includes('coordinator');
  const canEdit = role !== 'student' && (approvedRoles.includes('admin') || approvedRoles.includes('coordinator') || approvedRoles.includes('homeroom_teacher'));
  const canTrack = role !== 'student' && (approvedRoles.includes('coordinator') || approvedRoles.includes('grade_coordinator') || approvedRoles.includes('homeroom_teacher'));
  const isStudent = role === 'student';
  const classId = isStudent ? getStudentClassId(user, CLASS_ID) : getUserApprovedClassId(user, CLASS_ID);
  const fallbackClassName = getUserApprovedClass(user);
  const todayIso = getLocalDateString();

  useEffect(() => { loadData(); }, [classId, role]);

  async function loadData() {
    setLoading(true);
    const classRooms = await base44.entities.ClassRoom.list('-updated_date', 200);
    const classRoom = classRooms.find(room => room.id === classId) || findClassRoomByName(classRooms, fallbackClassName);
    const resolvedClassId = classRoom?.id || classId;
    setActiveClassId(resolvedClassId);
    const [eventData, studentData] = await Promise.all([
      base44.entities.Exam.filter({ class_id: resolvedClassId }),
      base44.entities.Student.filter({ class_id: resolvedClassId }),
    ]);
    const nextStudents = studentData || [];
    setEvents((eventData || []).sort((a, b) => (a.date || '').localeCompare(b.date || '')));
    setStudents(nextStudents);
    setLoading(false);

    const current = isStudent ? nextStudents.find(s => s.email === user?.email || s.user_email === user?.email) : null;
    Promise.all([
      current ? base44.entities.ExamCompletion.filter({ student_id: current.id }) : Promise.resolve([]),
      canTrack ? base44.entities.ExamGradeReport.list('-updated_action_at', 300) : Promise.resolve([]),
    ]).then(([completionData, reportData]) => {
      setCompletions(completionData || []);
      setGradeReports(reportData || []);
    }).catch(() => {});
  }

  const currentStudent = useMemo(() => {
    if (!isStudent) return null;
    return students.find(s => s.email === user?.email || s.user_email === user?.email) || null;
  }, [isStudent, students, user]);

  const completionsByEvent = useMemo(() => {
    const relevantCompletions = currentStudent ? completions.filter(c => c.student_id === currentStudent.id) : completions;
    return Object.fromEntries(relevantCompletions.map(c => [c.exam_id, c]));
  }, [completions, currentStudent]);

  const demoEvents = useMemo(() => [
    { id: 'demo_1', class_id: classId, title: 'בגרות במתמטיקה', subject: 'מתמטיקה', type: 'בגרות', date: todayIso, time: '09:00', audience_scope: 'grade', audience_grades: ['יב'], material: 'חדו״א, הסתברות וגיאומטריה' },
    { id: 'demo_2', class_id: classId, title: 'חזרה לטקס סיום', subject: 'שכבה', type: 'טקס', date: todayIso, time: '12:00', audience_scope: 'school', notes: 'באולם הספורט' },
    { id: 'demo_3', class_id: classId, title: 'צילומי מחזור', subject: 'שכבה', type: 'צילומים', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '10:30', audience_scope: 'class', audience_classes: ['יב5', 'יב7'] },
    { id: 'demo_4', class_id: classId, title: 'מועד ב׳ באנגלית', subject: 'אנגלית', type: 'מועד ב׳', date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0], time: '08:30', audience_scope: 'subject', audience_subjects: ['אנגלית'] }
  ], [classId, todayIso]);

  const sourceEvents = showDemo && events.length === 0 ? demoEvents : events;

  const visibleEvents = useMemo(() => {
    let list = filterBySearch(filterByGroup(sourceEvents, filterGroup), search);
    if (isStudent && onlyMine) {
      if (!currentStudent) return [];
      list = list.filter(event => isEventRelevantForStudent(event, currentStudent));
      list = list.filter(event => completionsByEvent[event.id]?.status !== 'not_relevant');
    }
    return list;
  }, [sourceEvents, filterGroup, search, isStudent, currentStudent, onlyMine, completionsByEvent]);

  async function saveEvent(form) {
    if (!form.title || !form.date) return;
    if (editingEvent?.id?.startsWith('demo_')) return;
    const resolvedClassId = activeClassId || classId;
    if (editingEvent) await base44.entities.Exam.update(editingEvent.id, { ...form, class_id: resolvedClassId });
    else await base44.entities.Exam.create({ ...form, class_id: resolvedClassId });
    toast.success(editingEvent ? 'האירוע עודכן' : 'האירוע נוסף');
    setShowForm(false);
    setEditingEvent(null);
    loadData();
  }

  async function clearAllEvents() {
    if (!events.length) return;
    if (!window.confirm(`למחוק את כל ${events.length} האירועים בלוח? פעולה זו אינה הפיכה.`)) return;
    if (!window.confirm('אישור סופי: כל האירועים יימחקו לצמיתות.')) return;
    await Promise.all(events.map(e => base44.entities.Exam.delete(e.id)));
    toast.success('הלוח נוקה');
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
  const currentOffset = viewOffsets[view] || 0;
  const setCurrentOffset = (nextOffset) => setViewOffsets(prev => ({ ...prev, [view]: nextOffset }));

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-28 lg:pb-10" dir="rtl">
      <PageHeader
        title="לוח שנה שכבתי חכם"
        subtitle="כל אירועי השכבה במקום אחד — מבחנים, בגרויות, חזרות, טקסים, חגים, צילומים ופעילויות"
        actions={
          <RtlActionBar
            primary={canEdit ? (
              <Button size="lg" onClick={() => { setEditingEvent(null); setShowForm(true); }} className="font-bold shadow-sm">
                <Plus className="w-4 h-4" />הוסף אירוע
              </Button>
            ) : null}
            more={(canTrack || canImport) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="תפריט אפשרויות"><MoreVertical className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {canTrack && (
                    <>
                      <DropdownMenuItem onClick={() => setShowTracking(v => !v)} className={showTracking ? 'bg-primary/10' : ''}>
                        <Users className="w-4 h-4" /> {showTracking ? 'סגור מעקב' : 'מעקב כיתתי'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {canImport && (
                    <>
                      <DropdownMenuLabel>ניהול</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setShowImport(true)}>
                        <FileUp className="w-4 h-4" /> ייבוא לוח מקובץ
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={clearAllEvents}
                        disabled={events.length === 0}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" /> נקה את כל האירועים
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          />
        }
      />

      <EventFilters activeGroup={filterGroup} onGroupChange={setFilterGroup} search={search} onSearchChange={setSearch} />

      <div className="flex flex-wrap items-center justify-start gap-3" dir="rtl">
        {isStudent && <Button size="sm" variant={onlyMine ? 'default' : 'outline'} onClick={() => setOnlyMine(v => !v)}>{onlyMine ? 'הלוח שלי' : 'כל הלוח השכבתי'}</Button>}
      </div>

      {visibleEvents.length > 0 && <UpcomingEventsPanel events={visibleEvents} todayIso={todayIso} onEventClick={setSelectedEvent} onEdit={openEdit} onDelete={deleteEvent} canEdit={canEdit} />}

      {showTracking && canTrack && <ClassTrackingPanel events={visibleEvents} classId={classId} todayIso={todayIso} />}
      {canTrack && <ExamGradeReportsPanel reports={gradeReports} user={user} onChanged={loadData} readOnly={!['admin','system_admin','homeroom_teacher','coordinator','grade_coordinator'].includes(role)} />}

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
        <MonthView events={visibleEvents} offset={currentOffset} onOffsetChange={setCurrentOffset} onEventClick={setSelectedEvent} onEdit={openEdit} onDelete={deleteEvent} canEdit={canEdit} todayIso={todayIso} view={view} onViewChange={setView} />
      ) : view === 'week' ? (
        <WeekView events={visibleEvents} offset={currentOffset} onOffsetChange={setCurrentOffset} onEventClick={setSelectedEvent} onEdit={openEdit} onDelete={deleteEvent} canEdit={canEdit} todayIso={todayIso} view={view} onViewChange={setView} />
      ) : (
        <DayView events={visibleEvents} offset={currentOffset} onOffsetChange={setCurrentOffset} onEventClick={setSelectedEvent} onEdit={openEdit} onDelete={deleteEvent} canEdit={canEdit} todayIso={todayIso} view={view} onViewChange={setView} />
      )}

      {canImport && <SmartCalendarImportDialog open={showImport} onOpenChange={setShowImport} classId={activeClassId || classId} onImported={loadData} />}
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