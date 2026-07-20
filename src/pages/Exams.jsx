import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getStudentClassId } from '@/lib/studentProfile';
import { getUserApprovedClass, getUserApprovedClassId, getUserApprovedGrade } from '@/lib/schoolStructure';
import { findClassRoomByName } from '@/lib/classAssignment';
import PageHeader from '@/components/ui/PageHeader';
import RtlActionBar from '@/components/ui/RtlActionBar';
import { Button } from '@/components/ui/button';
import { FileUp, Plus, Users, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import EventFilters, { filterByGroup, filterBySearch } from '@/components/exams/EventFilters';
import { MonthView, WeekView, DayView } from '@/components/exams/ExamCalendarViews';
import SmartCalendarImportDialog from '@/components/exams/SmartCalendarImportDialog';
import EventFormDialog from '@/components/exams/EventFormDialog';
import EventDetailsDialog from '@/components/exams/EventDetailsDialog';
import ClassTrackingPanel from '@/components/exams/ClassTrackingPanel';
import SmartCalendarEmptyState from '@/components/exams/SmartCalendarEmptyState';
import { isEventRelevantForStudent } from '@/components/exams/AudienceEditor';
import { getAvailableRoles } from '@/lib/roleUtils';
import { getClassDisplayName } from '@/lib/classIdentity';
import { getLocalDateString } from '@/lib/attendanceScope.js';
import { getPageCache, setPageCache } from '@/lib/pageDataCache';

export default function Exams({ role, user }) {
  const initialClassId = role === 'student' ? getStudentClassId(user, '') : getUserApprovedClassId(user, '');
  const cacheKey = `exams:${initialClassId}:${role}`;
  const cached = getPageCache(cacheKey);
  const [events, setEvents] = useState(cached?.events || []);
  const [students, setStudents] = useState(cached?.students || []);
  const [completions, setCompletions] = useState(cached?.completions || []);
  const [gradeReports, setGradeReports] = useState(cached?.gradeReports || []);
  const [loading, setLoading] = useState(!cached);
  const [view, setView] = useState('week');
  const [viewOffsets, setViewOffsets] = useState({ day: 0, week: 0, month: 0 });
  const [filterGroup, setFilterGroup] = useState('all');
  const [search, setSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState(true);
  const [showTracking, setShowTracking] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeClassId, setActiveClassId] = useState(cached?.activeClassId || '');
  const [currentClassRoom, setCurrentClassRoom] = useState(cached?.currentClassRoom || null);

  const approvedRoles = getAvailableRoles(user);
  const canManageBoard = role !== 'student' && (approvedRoles.includes('admin') || approvedRoles.includes('system_admin') || approvedRoles.includes('coordinator') || approvedRoles.includes('grade_coordinator') || approvedRoles.includes('homeroom_teacher'));
  const canImport = canManageBoard;
  const canEdit = role !== 'student' && (approvedRoles.includes('admin') || approvedRoles.includes('coordinator') || approvedRoles.includes('homeroom_teacher'));
  const canTrack = role !== 'student' && (approvedRoles.includes('coordinator') || approvedRoles.includes('grade_coordinator') || approvedRoles.includes('homeroom_teacher'));
  const isStudent = role === 'student';
  const classId = isStudent ? getStudentClassId(user, '') : getUserApprovedClassId(user, '');
  const fallbackClassName = getUserApprovedClass(user);
  const todayIso = getLocalDateString();

  useEffect(() => { loadData(); }, [classId, role]);

  async function loadData() {
    if (!getPageCache(cacheKey)) setLoading(true);
    try {
    const classRooms = await base44.entities.ClassRoom.list('-updated_date', 200);
    const classRoom = classRooms.find(room => room.id === classId) || findClassRoomByName(classRooms, fallbackClassName);
    const resolvedClassId = classRoom?.id || classId;
    setCurrentClassRoom(classRoom || null);
    setActiveClassId(resolvedClassId);
    const [eventData, studentData] = await Promise.all([
      base44.entities.Exam.filter({ class_id: resolvedClassId }),
      base44.entities.Student.filter({ class_id: resolvedClassId }),
    ]);
    const nextStudents = studentData || [];
    const nextEvents = (eventData || []).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    setEvents(nextEvents);
    setStudents(nextStudents);
    const current = isStudent ? nextStudents.find(s => s.email === user?.email || s.user_email === user?.email) : null;
    const [completionData, reportData] = await Promise.all([
      current ? base44.entities.ExamCompletion.filter({ student_id: current.id }) : Promise.resolve([]),
      canTrack ? base44.entities.ExamGradeReport.list('-updated_action_at', 300) : Promise.resolve([]),
    ]);
    setCompletions(completionData || []);
    setGradeReports(reportData || []);
    setPageCache(cacheKey, {
      events: nextEvents,
      students: nextStudents,
      completions: completionData || [],
      gradeReports: reportData || [],
      activeClassId: resolvedClassId,
      currentClassRoom: classRoom || null,
    });
    } catch (error) {
      console.error('Failed to load exams', error);
      setEvents([]);
      setStudents([]);
      toast.error('טעינת לוח האירועים נכשלה. אפשר לנסות שוב.');
    } finally {
      setLoading(false);
    }
  }

  const currentStudent = useMemo(() => {
    if (!isStudent) return null;
    return students.find(s => s.email === user?.email || s.user_email === user?.email) || null;
  }, [isStudent, students, user]);

  const completionsByEvent = useMemo(() => {
    const relevantCompletions = currentStudent ? completions.filter(c => c.student_id === currentStudent.id) : completions;
    return Object.fromEntries(relevantCompletions.map(c => [c.exam_id, c]));
  }, [completions, currentStudent]);

  const classDisplayName = getClassDisplayName(currentClassRoom, fallbackClassName || 'הכיתה');
  const sourceEvents = events.map(event => ({
    ...event,
    class_or_grade: event.class_or_grade || classDisplayName,
  }));

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
    const resolvedClassId = activeClassId || classId;
    if (!resolvedClassId) { toast.error('יש לבחור כיתה לפני שמירת האירוע'); return; }
    const grade = currentClassRoom?.grade || getUserApprovedGrade(user) || '';
    if (editingEvent) await base44.entities.Exam.update(editingEvent.id, { ...form, class_id: resolvedClassId, grade });
    else await base44.entities.Exam.create({ ...form, class_id: resolvedClassId, grade });
    toast.success(editingEvent ? 'האירוע עודכן' : 'האירוע נוסף');
    setShowForm(false);
    setEditingEvent(null);
    loadData();
  }

  async function updateStudentStatus(payload) {
    if (!currentStudent || !selectedEvent) return;
    if (String(selectedEvent.id || '').startsWith('demo_')) {
      toast.error('לא ניתן לשמור סטטוס השלמה לאירוע הדגמה');
      return;
    }
    const existing = completions.find(c => c.exam_id === selectedEvent.id && c.student_id === currentStudent.id);
    const data = {
      exam_id: selectedEvent.id,
      student_id: currentStudent.id,
      student_name: currentStudent.full_name,
      class_id: currentStudent.class_id,
      grade: currentStudent.grade,
      ...payload,
      completed_at: payload.status === 'done' ? new Date().toISOString() : '',
    };
    if (existing) await base44.entities.ExamCompletion.update(existing.id, data);
    else await base44.entities.ExamCompletion.create(data);
    loadData();
  }

  function openEdit(event) {
    setSelectedEvent(null);
    setEditingEvent(event);
    setShowForm(true);
  }

  const currentOffset = viewOffsets[view] || 0;
  const setCurrentOffset = (nextOffset) => setViewOffsets(prev => ({ ...prev, [view]: nextOffset }));

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-28 lg:pb-10" dir="rtl">
      <PageHeader
        title="לוח מבחנים ואירועים חכם"
        subtitle={`כל אירועי ${classDisplayName} במקום אחד — מבחנים, בגרויות, חזרות, טקסים, חגים, צילומים ופעילויות`}
        actions={
          <RtlActionBar
            primary={(canEdit || canTrack || canManageBoard) ? (
              <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2 sm:w-auto sm:min-w-[360px]" dir="rtl">
                {canEdit && (
                  <Button size="lg" onClick={() => { setEditingEvent(null); setShowForm(true); }} className="h-10 w-full rounded-full font-bold shadow-sm justify-center whitespace-nowrap">
                    <Plus className="w-4 h-4" />הוסף אירוע
                  </Button>
                )}
                {canTrack && (
                  <Button size="lg" variant={showTracking ? 'secondary' : 'outline'} onClick={() => setShowTracking(v => !v)} className="h-10 w-full rounded-full font-bold justify-center whitespace-nowrap">
                    <Users className="w-4 h-4" />מעקב כיתתי
                  </Button>
                )}
                {canManageBoard && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-10 w-10 rounded-full shrink-0" aria-label="תפריט אפשרויות">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      <DropdownMenuItem onClick={() => setShowImport(true)} className="justify-start gap-2 cursor-pointer">
                        <FileUp className="w-4 h-4" /> ייבוא לוח
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ) : null}
          />
        }
      />

      <EventFilters activeGroup={filterGroup} onGroupChange={setFilterGroup} search={search} onSearchChange={setSearch} />

      {isStudent && (
        <div className="flex flex-wrap items-center justify-start gap-3" dir="rtl">
          <Button size="sm" variant={onlyMine ? 'default' : 'outline'} onClick={() => setOnlyMine(v => !v)}>{onlyMine ? 'הלוח שלי' : 'כל הלוח השכבתי'}</Button>
        </div>
      )}

      {showTracking && canTrack && <ClassTrackingPanel events={visibleEvents} classId={classId} todayIso={todayIso} />}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" /></div>
      ) : visibleEvents.length === 0 ? (
        <SmartCalendarEmptyState
          canImport={canImport}
          canAdd={canEdit}
          onImport={() => setShowImport(true)}
          onAdd={() => { setEditingEvent(null); setShowForm(true); }}
        />
      ) : view === 'month' ? (
        <MonthView events={visibleEvents} offset={currentOffset} onOffsetChange={setCurrentOffset} onEventClick={setSelectedEvent} onEdit={openEdit} canEdit={canEdit} todayIso={todayIso} view={view} onViewChange={setView} />
      ) : view === 'week' ? (
        <WeekView events={visibleEvents} offset={currentOffset} onOffsetChange={setCurrentOffset} onEventClick={setSelectedEvent} onEdit={openEdit} canEdit={canEdit} todayIso={todayIso} view={view} onViewChange={setView} />
      ) : (
        <DayView events={visibleEvents} offset={currentOffset} onOffsetChange={setCurrentOffset} onEventClick={setSelectedEvent} onEdit={openEdit} canEdit={canEdit} todayIso={todayIso} view={view} onViewChange={setView} />
      )}

      {canImport && <SmartCalendarImportDialog open={showImport} onOpenChange={setShowImport} classId={activeClassId || classId} grade={currentClassRoom?.grade || getUserApprovedGrade(user) || ''} onImported={loadData} />}
      <EventFormDialog open={showForm} onOpenChange={setShowForm} event={editingEvent} onSave={saveEvent} />
      <EventDetailsDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        canEdit={canEdit}
        isStudent={isStudent}
        completion={selectedEvent ? completions.find(c => c.exam_id === selectedEvent.id && c.student_id === currentStudent?.id) : null}
        onStudentUpdate={updateStudentStatus}
        onEdit={openEdit}
      />
    </div>
  );
}