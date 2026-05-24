import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { getStudentClassId } from '@/lib/studentProfile';
import { getUserApprovedClassId } from '@/lib/schoolStructure';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { CalendarDays, Plus, Edit, Trash2, Calendar, Clock, User, AlertTriangle, FileUp, Eraser, Loader2, LayoutGrid, List, Filter, Heart } from 'lucide-react';
import ImportExamsDialog from '@/components/exams/ImportExamsDialog';
import ImportExamsPreview from '@/components/exams/ImportExamsPreview';
import CalendarWeekView from '@/components/exams/CalendarWeekView';
import CalendarMonthView from '@/components/exams/CalendarMonthView';
import CalendarDayView from '@/components/exams/CalendarDayView';
import ExamDetailsDialog from '@/components/exams/ExamDetailsDialog';
import EventFilters, { filterByGroup, filterBySearch } from '@/components/exams/EventFilters';
import EventTypeBadge, { ALL_EVENT_TYPES } from '@/components/exams/EventTypeBadge';
import AudienceEditor, { isEventRelevantForStudent } from '@/components/exams/AudienceEditor';
import ClassTrackingPanel from '@/components/exams/ClassTrackingPanel';

const SUBJECTS = ['מתמטיקה', 'עברית', 'ספרות', 'אנגלית', 'היסטוריה', 'גיאוגרפיה', 'פיזיקה', 'כימיה', 'ביולוגיה', 'חינוך גופני', 'אמנות', 'כללי', 'אחר'];

const emptyForm = {
  title: '', subject: '', type: 'אירוע שכבתי', date: '', time: '', end_time: '',
  class_or_grade: '', teacher: '', material: '', notes: '',
  audience_scope: 'grade', audience_grades: ['יב'], audience_classes: [], audience_tracks: [], audience_subjects: [], audience_group_label: ''
};

export default function Exams({ role, user }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('week'); // 'month' | 'week' | 'day' | 'list'
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [dayOffset, setDayOffset] = useState(0);
  const [filterGroup, setFilterGroup] = useState('all');
  const [search, setSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState(true); // student-side "My calendar" toggle
  const [selectedExam, setSelectedExam] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [previewEvents, setPreviewEvents] = useState([]);
  const [importing, setImporting] = useState(false);
  const [examCompletions, setExamCompletions] = useState([]);
  const [studentData, setStudentData] = useState(null);
  const [editExam, setEditExam] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const fileInputRef = useRef(null);
  const canEditExams = ['admin', 'homeroom_teacher', 'coordinator'].includes(role);
  const isStudentView = role === 'student';
  const classId = isStudentView ? getStudentClassId(user, CLASS_ID) : getUserApprovedClassId(user, CLASS_ID);

  useEffect(() => { loadExams(); }, []);

  async function loadExams() {
    setLoading(true);
    const data = await base44.entities.Exam.filter({ class_id: classId });
    setExams(data.sort((a, b) => a.date.localeCompare(b.date)));

    if (isStudentView) {
      const students = await base44.entities.Student.filter({ class_id: classId });
      const myStudent = students.find(s => s.email === user?.email || s.user_email === user?.email) || students[0];
      setStudentData(myStudent || null);
      const completions = myStudent ? await base44.entities.ExamCompletion.filter({ student_id: myStudent.id }) : [];
      setExamCompletions(completions);
    }

    setLoading(false);
  }

  const today = new Date().toISOString().split('T')[0];

  // Quick lookup: exam_id → completion row.
  const completionsByExamId = useMemo(() => {
    const map = {};
    for (const c of examCompletions) map[c.exam_id] = c;
    return map;
  }, [examCompletions]);

  // Apply all filters: group → search → audience relevance (student only, when toggle on) → hide "not_relevant" student-side.
  const filteredExams = useMemo(() => {
    let list = filterByGroup(exams, filterGroup);
    list = filterBySearch(list, search);
    if (isStudentView && studentData && onlyMine) {
      list = list.filter(e => isEventRelevantForStudent(e, studentData));
      list = list.filter(e => completionsByExamId[e.id]?.status !== 'not_relevant');
    }
    return list;
  }, [exams, filterGroup, search, isStudentView, studentData, onlyMine, completionsByExamId]);

  function openAdd() { setForm(emptyForm); setEditExam(null); setShowForm(true); }
  function openEdit(exam) {
    setForm({ ...emptyForm, ...exam });
    setEditExam(exam); setShowForm(true); setSelectedExam(null);
  }

  async function handleSave() {
    if (!form.title || !form.date) { toast.error('כותרת ותאריך הם שדות חובה'); return; }
    if (editExam) { await base44.entities.Exam.update(editExam.id, { ...form, class_id: classId }); toast.success('פריט עודכן'); }
    else { await base44.entities.Exam.create({ ...form, class_id: classId }); toast.success('פריט נוסף!'); }
    setShowForm(false);
    loadExams();
  }

  async function handleDelete(id) {
    if (!window.confirm('למחוק את הפריט?')) return;
    await base44.entities.Exam.delete(id);
    toast.success('נמחק');
    setSelectedExam(null);
    loadExams();
  }

  async function handleDeleteAll() {
    if (!window.confirm(`למחוק את כל ${exams.length} הפריטים? פעולה זו אינה הפיכה.`)) return;
    await Promise.all(exams.map(e => base44.entities.Exam.delete(e.id)));
    toast.success('כל הפריטים נמחקו');
    loadExams();
  }

  async function handleFileUpload(file) {
    if (!file) return;
    setImporting(true);
    try {
      const uploadResponse = await base44.integrations.Core.UploadFile({ file });
      const parseResponse = await base44.functions.invoke('parseExamsFromFile', { file_url: uploadResponse.file_url });
      if (parseResponse.data.events && parseResponse.data.events.length > 0) {
        setPreviewEvents(parseResponse.data.events);
        setShowPreview(true);
      } else {
        toast.error('לא נמצאו אירועים בקובץ');
      }
    } catch (err) {
      toast.error('שגיאה בעיבוד הקובץ: ' + err.message);
    } finally {
      setImporting(false);
    }
  }

  async function handleConfirmImport(events) {
    if (events.length === 0) { toast.error('אין אירועים לייבוא'); return; }
    setImporting(true);
    const toCreate = events.map(e => ({
      class_id: classId,
      title: e.title || '',
      subject: e.subject || '',
      type: e.type || 'אחר',
      date: e.date,
      time: e.time || '',
      class_or_grade: e.class_or_grade || '',
      teacher: e.teacher || '',
      material: '',
      notes: e.notes || ''
    }));
    await Promise.all(toCreate.map(e => base44.entities.Exam.create(e)));
    toast.success(`${events.length} אירועים יובאו בהצלחה!`);
    setShowPreview(false);
    setImporting(false);
    loadExams();
  }

  // Upsert student status + personal note for a calendar item.
  async function updateCompletion({ status, personal_note }) {
    if (!studentData || !selectedExam) return;
    const existing = completionsByExamId[selectedExam.id];
    const payload = {
      exam_id: selectedExam.id,
      student_id: studentData.id,
      student_name: studentData.full_name,
      status,
      personal_note: personal_note || '',
      completed_at: status === 'done' ? new Date().toISOString() : ''
    };
    if (existing) {
      const updated = await base44.entities.ExamCompletion.update(existing.id, payload);
      setExamCompletions(prev => prev.map(c => c.id === existing.id ? updated : c));
    } else {
      const created = await base44.entities.ExamCompletion.create(payload);
      setExamCompletions(prev => [...prev, created]);
    }
  }

  // List-view helpers
  const getWeekKey = (date) => { const d = new Date(date); const day = d.getDay(); const mon = new Date(d); mon.setDate(d.getDate() - day); return mon.toISOString().split('T')[0]; };
  const weekCounts = {};
  filteredExams.filter(e => e.date >= today).forEach(e => { const k = getWeekKey(e.date); weekCounts[k] = (weekCounts[k] || 0) + 1; });
  const overloadWeeks = Object.entries(weekCounts).filter(([, v]) => v >= 3).map(([k]) => k);

  const upcoming = filteredExams.filter(e => e.date >= today);
  const past = filteredExams.filter(e => e.date < today);

  // Today/Next-up at the top — works in any view.
  const nextSoon = useMemo(() => {
    return filteredExams.filter(e => e.date >= today).slice(0, 5);
  }, [filteredExams, today]);

  const ExamRow = ({ exam }) => {
    const weekKey = getWeekKey(exam.date);
    const isOverloaded = overloadWeeks.includes(weekKey);
    const isPast = exam.date < today;
    const completion = completionsByExamId[exam.id];
    const completed = completion?.status === 'done';
    return (
      <Card
        className={`p-4 hover:shadow-sm transition-all cursor-pointer ${isOverloaded && !isPast ? 'border-amber-300 dark:border-amber-700' : ''} ${isPast && !completed ? 'opacity-60' : ''} ${completed ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-900/10' : ''}`}
        onClick={() => setSelectedExam(exam)}
      >
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isPast ? 'bg-slate-100 text-slate-500' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'}`}>
            <span className="text-sm font-bold">{new Date(exam.date).getDate()}</span>
            <span className="text-[9px]">{['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'][new Date(exam.date).getMonth()]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap flex-row-reverse justify-end">
              <h3 className={`font-semibold text-sm ${completed ? 'line-through text-muted-foreground' : ''}`}>{exam.title}</h3>
              <EventTypeBadge type={exam.type} />
              {isOverloaded && !isPast && <AlertTriangle className="w-4 h-4 text-amber-500" />}
            </div>
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground flex-row-reverse justify-end">
              {exam.subject && <span>{exam.subject}</span>}
              {exam.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{exam.time}{exam.end_time ? `–${exam.end_time}` : ''}</span>}
              {exam.class_or_grade && <span>{exam.class_or_grade}</span>}
              {exam.teacher && <span className="flex items-center gap-1"><User className="w-3 h-3" />{exam.teacher}</span>}
            </div>
          </div>
          {canEditExams && !isPast && (
            <div className="flex gap-1 flex-row-reverse" onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(exam)}><Edit className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500" onClick={() => handleDelete(exam.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader
        title="לוח שנה שכבתי חכם"
        subtitle="כל האירועים — מבחנים, בגרויות, חזרות, טקסים, אירועים שכבתיים וחגים"
        actions={
          <>
            {canEditExams && (
              <Button size="sm" variant={showTracking ? 'default' : 'outline'} className="gap-2" onClick={() => setShowTracking(v => !v)}>
                <Filter className="w-4 h-4" />מעקב כיתתי
              </Button>
            )}
            {canEditExams && exams.length > 0 && (
              <Button size="sm" variant="outline" className="gap-2 text-red-500 hover:text-red-600 hover:border-red-300" onClick={handleDeleteAll}>
                <Eraser className="w-4 h-4" />מחק הכל
              </Button>
            )}
            {canEditExams && (
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowImport(true)}>
                <FileUp className="w-4 h-4" />ייבוא קובץ
              </Button>
            )}
            {canEditExams && <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="w-4 h-4" />הוסף</Button>}
          </>
        }
      />

      {showPreview && (
        <Dialog open onOpenChange={() => !importing && setShowPreview(false)}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
            <DialogHeader><DialogTitle>בדיקת ייבוא אירועים</DialogTitle></DialogHeader>
            <ImportExamsPreview events={previewEvents} classId={classId} onConfirm={handleConfirmImport} onCancel={() => setShowPreview(false)} />
          </DialogContent>
        </Dialog>
      )}

      {!showPreview && !showForm && !showImport && canEditExams && exams.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">העלה קובץ לוח אירועים שכבתי — נסווג אוטומטית בגרויות, חזרות, טקסים, חגים וכל פריט אחר.</p>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.xlsx,.csv,.txt" onChange={(e) => handleFileUpload(e.target.files?.[0])} disabled={importing} className="hidden" />
            <Button variant="outline" className="gap-2" disabled={importing} onClick={() => fileInputRef.current?.click()}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
              {importing ? 'עיבוד...' : 'בחר קובץ (PDF, Word, Excel)'}
            </Button>
            <Button onClick={() => setShowImport(true)} className="gap-2">פתח חלון ייבוא מתקדם</Button>
          </div>
        </div>
      )}

      {/* Filters + Search + View switcher */}
      <div className="flex flex-col gap-3">
        <EventFilters activeGroup={filterGroup} onGroupChange={setFilterGroup} search={search} onSearchChange={setSearch} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          {isStudentView && (
            <Button
              size="sm"
              variant={onlyMine ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => setOnlyMine(v => !v)}
            >
              <Heart className="w-4 h-4" />{onlyMine ? 'הלוח שלי בלבד' : 'כל הלוח השכבתי'}
            </Button>
          )}
          <div className="flex gap-1 rounded-lg border bg-card p-1 ms-auto">
            <Button size="sm" variant={view === 'month' ? 'default' : 'ghost'} className="gap-1 h-8" onClick={() => setView('month')}>
              <Calendar className="w-4 h-4" />חודש
            </Button>
            <Button size="sm" variant={view === 'week' ? 'default' : 'ghost'} className="gap-1 h-8" onClick={() => setView('week')}>
              <LayoutGrid className="w-4 h-4" />שבוע
            </Button>
            <Button size="sm" variant={view === 'day' ? 'default' : 'ghost'} className="gap-1 h-8" onClick={() => setView('day')}>
              <CalendarDays className="w-4 h-4" />יום
            </Button>
            <Button size="sm" variant={view === 'list' ? 'default' : 'ghost'} className="gap-1 h-8" onClick={() => setView('list')}>
              <List className="w-4 h-4" />רשימה
            </Button>
          </div>
        </div>
      </div>

      {/* Tracking panel — staff only, toggled */}
      {showTracking && canEditExams && (
        <ClassTrackingPanel exams={filteredExams} classId={classId} todayIso={today} />
      )}

      {/* Compact next-up strip (works alongside any view) */}
      {!loading && nextSoon.length > 0 && view !== 'list' && (
        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-medium">הקרובים אליך</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {nextSoon.map(exam => (
              <button
                key={exam.id}
                onClick={() => setSelectedExam(exam)}
                className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border bg-card hover:shadow-sm transition-all"
              >
                <EventTypeBadge type={exam.type} />
                <span className="font-medium">{exam.title}</span>
                <span className="text-muted-foreground">· {exam.date}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/20 rounded-3xl flex items-center justify-center mb-5">
            <CalendarDays className="w-10 h-10 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">הלוח ריק עדיין</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">העלה קובץ לוח אירועים שכבתי כדי לסווג אוטומטית את כל הפריטים, או הוסף ידנית.</p>
          {canEditExams && (
            <Button onClick={openAdd} size="lg" className="gap-2 px-8"><Plus className="w-5 h-5" />הוסף פריט ראשון</Button>
          )}
        </div>
      ) : view === 'month' ? (
        <CalendarMonthView
          exams={filteredExams}
          monthOffset={monthOffset}
          onMonthChange={setMonthOffset}
          onEventClick={setSelectedExam}
          todayIso={today}
          completionsByExamId={completionsByExamId}
        />
      ) : view === 'week' ? (
        <CalendarWeekView
          exams={filteredExams}
          weekOffset={weekOffset}
          onWeekChange={setWeekOffset}
          onEventClick={setSelectedExam}
          todayIso={today}
          completionsByExamId={completionsByExamId}
        />
      ) : view === 'day' ? (
        <CalendarDayView
          exams={filteredExams}
          dayOffset={dayOffset}
          onDayChange={setDayOffset}
          onEventClick={setSelectedExam}
          completionsByExamId={completionsByExamId}
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />קרובים ({upcoming.length})
              </h2>
              <div className="space-y-2">
                {upcoming.map(exam => <motion.div key={exam.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}><ExamRow exam={exam} /></motion.div>)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">עבר ({past.length})</h2>
              <div className="space-y-2">{past.slice(0, 10).map(exam => <ExamRow key={exam.id} exam={exam} />)}</div>
            </div>
          )}
        </>
      )}

      <ExamDetailsDialog
        exam={selectedExam}
        open={!!selectedExam}
        onClose={() => setSelectedExam(null)}
        isStudentView={isStudentView}
        currentCompletion={selectedExam ? completionsByExamId[selectedExam.id] : null}
        onStatusChange={updateCompletion}
      />

      {showImport && (
        <ImportExamsDialog open={showImport} onOpenChange={setShowImport} onImported={loadExams} classId={classId} />
      )}

      {showForm && (
        <Dialog open onOpenChange={() => setShowForm(false)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader><DialogTitle>{editExam ? 'עריכת פריט' : 'הוספת פריט חדש'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>כותרת *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>סוג</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ALL_EVENT_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>מקצוע</Label>
                  <Select value={form.subject || ''} onValueChange={v => setForm(p => ({ ...p, subject: v }))}>
                    <SelectTrigger><SelectValue placeholder="ללא" /></SelectTrigger>
                    <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label>תאריך *</Label><Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
                <div className="space-y-1"><Label>שעת התחלה</Label><Input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} /></div>
                <div className="space-y-1"><Label>שעת סיום</Label><Input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} /></div>
              </div>
              <div className="space-y-1"><Label>חדר / מקום</Label><Input value={form.class_or_grade || ''} onChange={e => setForm(p => ({ ...p, class_or_grade: e.target.value }))} /></div>
              <div className="space-y-1"><Label>מורה / אחראי</Label><Input value={form.teacher || ''} onChange={e => setForm(p => ({ ...p, teacher: e.target.value }))} /></div>

              <div className="rounded-lg border p-3 bg-muted/30">
                <AudienceEditor value={form} onChange={(v) => setForm(p => ({ ...p, ...v }))} />
              </div>

              <div className="space-y-1"><Label>חומר / הכנה</Label><Textarea value={form.material} onChange={e => setForm(p => ({ ...p, material: e.target.value }))} rows={2} /></div>
              <div className="space-y-1"><Label>הערות</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSave} className="flex-1">שמור</Button>
                <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">ביטול</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}