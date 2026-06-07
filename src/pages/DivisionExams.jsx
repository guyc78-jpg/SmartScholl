import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { CalendarDays, LayoutGrid, List, Plus, Trash2, MoreVertical, FileUp, Lock, GraduationCap } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { MonthView, WeekView } from '@/components/exams/ExamCalendarViews';
import EventListView from '@/components/exams/EventListView';
import EventDetailsDialog from '@/components/exams/EventDetailsDialog';
import SmartCalendarImportDialog from '@/components/exams/SmartCalendarImportDialog';
import DivisionEventFormDialog from '@/components/division/DivisionEventFormDialog';
import ConflictWarnings from '@/components/division/ConflictWarnings';
import ExamGradeReportsPanel from '@/components/staff/ExamGradeReportsPanel';
import { normalizeGrade, formatGrade, getUserDivisionGrades, getDivisionLabel } from '@/lib/schoolStructure';
import { detectConflicts } from '@/lib/examConflicts';
import { logActivity } from '@/lib/activityLogger';

const gradeOrder = ['ז', 'ח', 'ט', 'י', 'יא', 'יב'];

export default function DivisionExams({ user, role }) {
  const [events, setEvents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [gradeReports, setGradeReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [offset, setOffset] = useState(0);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const allowedGrades = useMemo(() => getUserDivisionGrades(user), [user]);
  const divisionLabel = getDivisionLabel(user?.profile_division);
  const todayIso = new Date().toISOString().split('T')[0];

  useEffect(() => { loadData(); }, [allowedGrades.join(',')]);

  async function loadData() {
    setLoading(true);
    const [allClasses, allExams, reports] = await Promise.all([
      base44.entities.ClassRoom.list('grade', 500),
      base44.entities.Exam.list('-date', 1000),
      base44.entities.ExamGradeReport.list('-updated_action_at', 500),
    ]);
    const divClasses = allClasses
      .filter(c => allowedGrades.includes(normalizeGrade(c.grade)))
      .sort((a, b) => {
        const gd = gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade);
        if (gd !== 0) return gd;
        return (a.name || '').localeCompare(b.name || '');
      });
    setClasses(divClasses);

    const divClassIds = new Set(divClasses.map(c => c.id));
    // אירוע שייך לחטיבה אם class_id שלו בכיתות החטיבה, או שה-audience_grades בשכבות המורשות
    const divEvents = (allExams || []).filter(e => {
      if (divClassIds.has(e.class_id)) return true;
      const grades = (e.audience_grades || []).map(normalizeGrade);
      return grades.some(g => allowedGrades.includes(g));
    });
    setEvents(divEvents.sort((a, b) => (a.date || '').localeCompare(b.date || '')));
    setGradeReports(reports || []);
    setLoading(false);
  }

  const visibleEvents = useMemo(() => {
    if (gradeFilter === 'all') return events;
    return events.filter(e => {
      const grades = (e.audience_grades || []).map(normalizeGrade);
      if (grades.length) return grades.includes(gradeFilter);
      const cls = classes.find(c => c.id === e.class_id);
      return cls && normalizeGrade(cls.grade) === gradeFilter;
    });
  }, [events, gradeFilter, classes]);

  // עוגן class_id לאירוע שכבתי: כיתה ראשונה בשכבה הנבחרת
  function anchorClassId(form) {
    const grade = form.audience_grades?.[0];
    const firstClass = classes.find(c => normalizeGrade(c.grade) === normalizeGrade(grade));
    return firstClass?.id || form.class_id || (classes[0]?.id ?? '');
  }

  async function saveEvent(form) {
    const class_id = anchorClassId(form);
    const payload = { ...form, class_id };
    const hadConflict = detectConflicts(form, events).length > 0;
    if (editingEvent) {
      await base44.entities.Exam.update(editingEvent.id, payload);
    } else {
      await base44.entities.Exam.create(payload);
    }
    await logActivity({
      user, role,
      actionName: editingEvent ? 'עריכת אירוע שכבתי' : 'הוספת אירוע שכבתי',
      details: `${form.type}: ${form.title} (${(form.audience_grades || []).map(formatGrade).join(', ')})${hadConflict ? ' — אושרה חריגה' : ''}`,
      severity: hadConflict ? 'warning' : 'info',
    });
    toast.success(editingEvent ? 'האירוע עודכן' : 'האירוע נוסף');
    setShowForm(false);
    setEditingEvent(null);
    loadData();
  }

  async function deleteEvent(id) {
    if (!window.confirm('למחוק את האירוע?')) return;
    const ev = events.find(e => e.id === id);
    await base44.entities.Exam.delete(id);
    await logActivity({ user, role, actionName: 'מחיקת אירוע שכבתי', details: ev ? `${ev.type}: ${ev.title}` : id });
    toast.success('האירוע נמחק');
    setSelectedEvent(null);
    loadData();
  }

  function openEdit(event) {
    setSelectedEvent(null);
    setEditingEvent(event);
    setShowForm(true);
  }

  if (role !== 'division_manager' && role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground" dir="rtl">
        <Lock className="w-10 h-10" />
        <p className="font-medium">גישה מוגבלת</p>
      </div>
    );
  }

  // אזהרות עבור האירוע הנבחר (בתצוגת פרטים)
  const selectedWarnings = selectedEvent ? detectConflicts(selectedEvent, events) : [];

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-28 lg:pb-10 text-right" dir="rtl">
      <PageHeader
        title={`לוח מבחנים חכם${divisionLabel ? ` – ${divisionLabel}` : ''}`}
        subtitle="ניהול מבחנים ואירועים לשכבות החטיבה, עם זיהוי כפילויות והתנגשויות"
        actions={
          <>
            <Button size="lg" onClick={() => { setEditingEvent(null); setShowForm(true); }} className="font-bold shadow-sm">
              <Plus className="w-4 h-4" />הוסף אירוע
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="תפריט"><MoreVertical className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>ניהול</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setShowImport(true)}>
                  <FileUp className="w-4 h-4" /> ייבוא לוח מקובץ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Grade filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setGradeFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
            ${gradeFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'}`}
        >כל השכבות</button>
        {allowedGrades.map(g => (
          <button
            key={g}
            onClick={() => setGradeFilter(g)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors inline-flex items-center gap-1
              ${gradeFilter === g ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'}`}
          ><GraduationCap className="w-3.5 h-3.5" />שכבת {formatGrade(g)}</button>
        ))}
      </div>

      {/* View switcher */}
      <div className="grid grid-cols-3 gap-1 rounded-lg border bg-card p-1 w-full sm:w-auto sm:min-w-[280px] ms-auto">
        {[
          { key: 'list', label: 'רשימה', icon: List },
          { key: 'week', label: 'שבוע', icon: LayoutGrid },
          { key: 'month', label: 'חודש', icon: CalendarDays },
        ].map(({ key, label, icon: Icon }) => (
          <Button key={key} size="sm" variant={view === key ? 'default' : 'ghost'}
            onClick={() => { setView(key); setOffset(0); }}
            className="h-9 px-2 w-full flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium">
            <Icon className="w-4 h-4 shrink-0" /><span>{label}</span>
          </Button>
        ))}
      </div>

      {!loading && <ExamGradeReportsPanel reports={gradeReports} user={user} onChanged={loadData} readOnly />}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" /></div>
      ) : view === 'month' ? (
        <MonthView events={visibleEvents} offset={offset} onOffsetChange={setOffset} onEventClick={setSelectedEvent} todayIso={todayIso} />
      ) : view === 'week' ? (
        <WeekView events={visibleEvents} offset={offset} onOffsetChange={setOffset} onEventClick={setSelectedEvent} todayIso={todayIso} />
      ) : (
        <EventListView events={visibleEvents} onEventClick={setSelectedEvent} todayIso={todayIso} />
      )}

      <DivisionEventFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        event={editingEvent}
        onSave={saveEvent}
        allowedGrades={allowedGrades}
        classes={classes}
        allEvents={events}
      />

      <SmartCalendarImportDialog open={showImport} onOpenChange={setShowImport} classId={classes[0]?.id} onImported={loadData} />

      <EventDetailsDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        canEdit
        isStudent={false}
        onEdit={openEdit}
        onDelete={deleteEvent}
        extraContent={selectedWarnings.length > 0 ? <ConflictWarnings warnings={selectedWarnings} /> : null}
      />
    </div>
  );
}