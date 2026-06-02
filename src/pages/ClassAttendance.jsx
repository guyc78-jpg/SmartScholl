import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import {
  CheckCircle2, AlertTriangle, Users, Clock, UserX, LogOut,
  Search, Save, ListFilter, X, Pencil
} from 'lucide-react';
import AttendanceAlerts from '@/components/attendance/AttendanceAlerts';
import AttendancePatterns from '@/components/attendance/AttendancePatterns';
import AttendanceSummaryChips from '@/components/attendance/AttendanceSummaryChips';
import StudentQuickPicker from '@/components/attendance/StudentQuickPicker';
import ExceptionDetailDialog from '@/components/attendance/ExceptionDetailDialog';
import WorthCheckingPanel from '@/components/attendance/WorthCheckingPanel';
import ExceptionRow from '@/components/attendance/ExceptionRow';
import { isStudentInApprovedScope, getUserApprovedClass, getUserApprovedClassId } from '@/lib/schoolStructure';
import { useAuth } from '@/lib/AuthContext';
import { formatStudentName, compareStudentsByLastName } from '@/lib/studentName';

const STATUSES = ['נוכח/ת', 'מאחר/ת', 'נעדר/ת', 'שוחרר/ה'];
const PRESENT = 'נוכח/ת';

export const THRESHOLDS = { absences: 5, lates: 8 };

const statusBtnStyle = {
  'נוכח/ת':   { active: 'bg-emerald-500 text-white border-emerald-500', idle: 'border-border text-muted-foreground hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-900/20' },
  'מאחר/ת':   { active: 'bg-amber-500 text-white border-amber-500',     idle: 'border-border text-muted-foreground hover:bg-amber-50 hover:border-amber-300 dark:hover:bg-amber-900/20' },
  'נעדר/ת':   { active: 'bg-red-500 text-white border-red-500',          idle: 'border-border text-muted-foreground hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20' },
  'שוחרר/ה':  { active: 'bg-purple-500 text-white border-purple-500',    idle: 'border-border text-muted-foreground hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-900/20' },
};

function isPastDay(dateStr) {
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today;
}

export default function ClassAttendance({ role }) {
  const { user } = useAuth();
  const canEdit = role === 'homeroom_teacher' || role === 'admin' || role === 'coordinator';
  const classId = getUserApprovedClassId(user, CLASS_ID);

  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [existingIds, setExistingIds] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState(null);
  const [allRecords, setAllRecords] = useState([]);
  const [view, setView] = useState('exceptions'); // exceptions | all
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('daily');

  // Picker / dialog state
  const [pickerStatus, setPickerStatus] = useState(null); // 'נעדר/ת' | 'מאחר/ת' | 'שוחרר/ה'
  const [detailStudent, setDetailStudent] = useState(null);
  const [detailStatus, setDetailStatus] = useState(null);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (students.length > 0) loadDay(); }, [date, students.length]);

  async function loadAll() {
    setLoading(true);
    const allStudents = await base44.entities.Student.list();
    const activeStudents = allStudents.filter(s => s.status === 'פעיל' || s.status === 'דורש מעקב');
    let scopedStudents = activeStudents.filter(s => isStudentInApprovedScope(s, user, role));
    if (scopedStudents.length === 0 && role === 'admin') scopedStudents = activeStudents;

    const scopedIds = new Set(scopedStudents.map(s => s.id));
    const classIds = [...new Set(scopedStudents.map(s => s.class_id).filter(Boolean))];
    const recsArrays = await Promise.all(classIds.map(cid => base44.entities.AttendanceRecord.filter({ class_id: cid })));
    const recs = recsArrays.flat();

    setStudents(scopedStudents.sort(compareStudentsByLastName));
    setAllRecords(recs.filter(r => STATUSES.includes(r.status) && scopedIds.has(r.student_id)));
    setLoading(false);
  }

  async function loadDay() {
    const classIds = [...new Set(students.map(s => s.class_id).filter(Boolean))];
    if (classIds.length === 0) { setAttendanceMap({}); setExistingIds({}); setConfirmed(false); return; }
    const attArrays = await Promise.all(classIds.map(cid => base44.entities.AttendanceRecord.filter({ class_id: cid, date })));
    const att = attArrays.flat();
    const scopedIds = new Set(students.map(s => s.id));
    const map = {}, ids = {};
    att.filter(r => STATUSES.includes(r.status) && scopedIds.has(r.student_id)).forEach(a => {
      map[a.student_id] = { status: a.status, note: a.note || '' };
      ids[a.student_id] = a.id;
    });
    setAttendanceMap(map);
    setExistingIds(ids);
    // If any record exists for today → it was confirmed
    setConfirmed(att.length > 0);
    if (att.length > 0) {
      const latest = att.reduce((acc, r) => {
        const t = r.updated_date || r.created_date;
        return (!acc || (t && t > acc)) ? t : acc;
      }, null);
      setConfirmedAt(latest || null);
    } else {
      setConfirmedAt(null);
    }
  }

  // ── Save helpers — auto-save on every change ──────────────────────────────
  async function persistOne(student, statusOrNull, note = '') {
    const existingId = existingIds[student.id];
    if (!statusOrNull) {
      if (existingId) {
        await base44.entities.AttendanceRecord.delete(existingId);
        setExistingIds(p => { const n = { ...p }; delete n[student.id]; return n; });
      }
      return;
    }
    const data = {
      student_id: student.id,
      student_name: student.full_name,
      class_id: student.class_id || classId,
      date,
      status: statusOrNull,
      note,
      period: new Date().toTimeString().slice(0, 5),
    };
    if (existingId) {
      await base44.entities.AttendanceRecord.update(existingId, data);
    } else {
      const created = await base44.entities.AttendanceRecord.create(data);
      if (created?.id) setExistingIds(p => ({ ...p, [student.id]: created.id }));
    }
  }

  async function setStatus(student, status, note = '') {
    if (!canEdit) { toast.error('אין הרשאה'); return; }
    setAttendanceMap(p => ({ ...p, [student.id]: { status, note } }));
    try { await persistOne(student, status, note); }
    catch (e) { console.error(e); toast.error('שמירה נכשלה'); }
  }

  // Confirm: mark all unmarked as נוכח/ת
  async function handleConfirmAllPresent() {
    if (!canEdit) return;
    setSaving(true);
    const updates = students.filter(s => !attendanceMap[s.id]?.status);
    const newMap = { ...attendanceMap };
    for (const s of updates) {
      newMap[s.id] = { status: PRESENT, note: '' };
    }
    setAttendanceMap(newMap);
    try {
      await Promise.all(updates.map(s => persistOne(s, PRESENT, '')));
      setConfirmed(true);
      setConfirmedAt(new Date().toISOString());
      toast.success('נוכחות אושרה — כל התלמידים סומנו כנוכחים');
    } catch (e) {
      console.error(e); toast.error('שמירה חלקית — נסה שוב');
    }
    setSaving(false);
  }

  // Return a flagged student back to present (clears note)
  async function handleMarkPresent(student) {
    await setStatus(student, PRESENT, '');
  }

  // Open the detail dialog for editing an existing exception
  function handleEditException(student, status) {
    setDetailStudent(student);
    setDetailStatus(status);
  }

  // Create a task in "treatment" — uses the Task entity
  async function handleAddToTreatment(student, status, note) {
    try {
      const reasonLabel = status === 'מאחר/ת' ? 'איחור' : status === 'נעדר/ת' ? 'היעדרות' : 'שחרור';
      await base44.entities.Task.create({
        class_id: student.class_id || classId,
        student_id: student.id,
        student_name: student.full_name,
        title: `מעקב ${reasonLabel} — ${student.full_name}`,
        description: note || '',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'גבוהה',
        status: 'לביצוע',
        category: 'כללי',
      });
      toast.success(`${formatStudentName(student)} נוסף/ה לטיפול`);
    } catch (e) {
      console.error(e); toast.error('הוספה לטיפול נכשלה');
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const vals = Object.values(attendanceMap);
    return {
      present:  vals.filter(a => a.status === 'נוכח/ת').length,
      late:     vals.filter(a => a.status === 'מאחר/ת').length,
      absent:   vals.filter(a => a.status === 'נעדר/ת').length,
      released: vals.filter(a => a.status === 'שוחרר/ה').length,
      marked:   vals.filter(a => a.status).length,
    };
  }, [attendanceMap]);

  const statsPerStudent = useMemo(() => students.map(s => {
    const recs = allRecords.filter(r => r.student_id === s.id);
    return {
      ...s,
      absences: recs.filter(r => r.status === 'נעדר/ת').length,
      lates:    recs.filter(r => r.status === 'מאחר/ת').length,
      released: recs.filter(r => r.status === 'שוחרר/ה').length,
      total:    recs.length,
    };
  }), [students, allRecords]);

  // Worth checking — recent issues (last 14 days)
  const worthChecking = useMemo(() => {
    const cutoff = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
    return students.map(s => {
      const recent = allRecords.filter(r => r.student_id === s.id && r.date >= cutoff);
      const recentLates = recent.filter(r => r.status === 'מאחר/ת').length;
      const recentAbsences = recent.filter(r => r.status === 'נעדר/ת').length;
      const reasons = [];
      if (recentLates >= 3) reasons.push(`${recentLates} איחורים ב-14 ימים`);
      if (recentAbsences >= 2) reasons.push(`${recentAbsences} היעדרויות לאחרונה`);
      return reasons.length ? { ...s, flagReason: reasons.join(' · ') } : null;
    }).filter(Boolean);
  }, [students, allRecords]);

  // ── Filtered student list ─────────────────────────────────────────────────
  const EXCEPTION_STATUSES = ['מאחר/ת', 'נעדר/ת', 'שוחרר/ה'];
  const filteredStudents = useMemo(() => {
    let list = students;
    if (view === 'exceptions') {
      list = list.filter(s => EXCEPTION_STATUSES.includes(attendanceMap[s.id]?.status));
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter(s => s.full_name?.toLowerCase().includes(term));
    }
    return list;
  }, [students, attendanceMap, view, search]);

  const exceptionCount = useMemo(
    () => students.filter(s => EXCEPTION_STATUSES.includes(attendanceMap[s.id]?.status)).length,
    [students, attendanceMap]
  );

  // ── Picker handlers ───────────────────────────────────────────────────────
  function openPicker(status) { setPickerStatus(status); }
  function handlePickerSelect(student) {
    const status = pickerStatus;
    setPickerStatus(null);
    if (status === 'נעדר/ת' || status === 'מאחר/ת' || status === 'שוחרר/ה') {
      setDetailStudent(student); setDetailStatus(status);
    }
  }
  async function handleDetailSave(data) {
    await setStatus(detailStudent, data.status, data.note);
    setDetailStudent(null); setDetailStatus(null);
  }

  // Direct quick-button on "all" view
  async function handleQuickStatus(student, status) {
    if (status === PRESENT) {
      await setStatus(student, PRESENT, '');
    } else {
      // Clear marking by clicking same status again
      if (attendanceMap[student.id]?.status === status) {
        await setStatus(student, null);
        setAttendanceMap(p => { const n = { ...p }; delete n[student.id]; return n; });
      } else {
        setDetailStudent(student); setDetailStatus(status);
      }
    }
  }

  // ── Permissions ───────────────────────────────────────────────────────────
  if (!canEdit) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 text-center" dir="rtl">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-lg font-semibold mb-1">גישה מוגבלת</h2>
        <p className="text-muted-foreground text-sm">מודול זה זמין לצוות חינוכי בלבד.</p>
      </div>
    );
  }

  return (
    <div
      className="p-4 lg:p-6 space-y-4 text-right"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      dir="rtl"
    >
      <PageHeader
        title="מעקב נוכחות כיתתי"
        subtitle={`סימון יומי · כיתה ${getUserApprovedClass(user) || ''}`}
      />

      <Tabs value={tab} onValueChange={setTab} dir="rtl">
        <TabsList className="mb-3">
          <TabsTrigger value="daily">סימון יומי</TabsTrigger>
          <TabsTrigger value="patterns">דפוסים והתראות</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          {/* Date */}
          <div className="flex items-center gap-2 text-right" dir="rtl">
            <Label htmlFor="date" className="text-sm flex-shrink-0">תאריך:</Label>
            <Input id="date" type="date" value={date}
              onChange={e => setDate(e.target.value)} className="w-40" />
            {isPastDay(date) && (
              <span className="text-xs text-amber-700 dark:text-amber-400 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                תצוגת עבר — לקריאה בלבד
              </span>
            )}
          </div>

          {loading ? (
            <SkeletonList />
          ) : students.length === 0 ? (
            <EmptyState user={user} role={role} />
          ) : (
            <>
              {/* Summary */}
              <AttendanceSummaryChips
                present={counts.present} late={counts.late} absent={counts.absent}
                released={counts.released} marked={counts.marked} total={students.length}
              />

              {/* Worth Checking */}
              <WorthCheckingPanel students={worthChecking} onSelectStudent={(s) => {
                setDetailStudent(s); setDetailStatus('נעדר/ת');
              }} />

              {/* Quick Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" dir="rtl">
                <Button
                  onClick={handleConfirmAllPresent}
                  disabled={saving || isPastDay(date)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-11"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">אשר נוכחות</span>
                </Button>
                <Button variant="outline" onClick={() => openPicker('נעדר/ת')}
                  disabled={isPastDay(date)}
                  className="gap-1.5 h-11 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20">
                  <UserX className="w-4 h-4 text-red-500" />
                  <span className="text-xs sm:text-sm">הוסף נעדר/ת</span>
                </Button>
                <Button variant="outline" onClick={() => openPicker('מאחר/ת')}
                  disabled={isPastDay(date)}
                  className="gap-1.5 h-11 hover:bg-amber-50 hover:border-amber-300 dark:hover:bg-amber-900/20">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-xs sm:text-sm">הוסף מאחר/ת</span>
                </Button>
                <Button variant="outline" onClick={() => openPicker('שוחרר/ה')}
                  disabled={isPastDay(date)}
                  className="gap-1.5 h-11 hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-900/20">
                  <LogOut className="w-4 h-4 text-purple-500" />
                  <span className="text-xs sm:text-sm">הוסף שחרור</span>
                </Button>
              </div>

              {/* View toggle + search */}
              <div className="flex items-center gap-2 flex-wrap" dir="rtl">
                <div className="inline-flex rounded-lg border bg-card p-1">
                  <button onClick={() => setView('exceptions')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1 ${
                      view === 'exceptions' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}>
                    <ListFilter className="w-3.5 h-3.5" />
                    חריגים בלבד
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${view === 'exceptions' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {exceptionCount}
                    </span>
                  </button>
                  <button onClick={() => setView('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1 ${
                      view === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}>
                    <Users className="w-3.5 h-3.5" />
                    כל התלמידים
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${view === 'all' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {students.length}
                    </span>
                  </button>
                </div>
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="חיפוש תלמיד/ה..." className="pr-9 text-right h-9" />
                  {search && (
                    <button onClick={() => setSearch('')}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Student list */}
              {filteredStudents.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center" dir="rtl">
                    {view === 'exceptions' ? (
                      <>
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                        <p className="font-medium text-sm">אין חריגים כרגע</p>
                        <p className="text-xs text-muted-foreground mt-1">כל הסימונים הם "נוכח/ת" או טרם סומנו.</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">לא נמצאו תלמידים תואמים לחיפוש.</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredStudents.map((student, i) => {
                    const current = attendanceMap[student.id];
                    if (view === 'exceptions' && current?.status) {
                      return (
                        <ExceptionRow
                          key={student.id}
                          index={i}
                          student={student}
                          status={current.status}
                          note={current.note}
                          disabled={isPastDay(date)}
                          onMarkPresent={handleMarkPresent}
                          onEdit={handleEditException}
                          onAddToTreatment={handleAddToTreatment}
                        />
                      );
                    }
                    const stats = statsPerStudent.find(s => s.id === student.id);
                    const isAlert = stats && (stats.absences >= THRESHOLDS.absences || stats.lates >= THRESHOLDS.lates);
                    return (
                      <motion.div key={student.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.015, 0.2) }}>
                        <Card className={isAlert ? 'border-red-200 dark:border-red-800/60' : ''}>
                          <div className="p-2.5 flex items-center gap-1.5" dir="rtl">
                            <div className="flex-1 min-w-0 text-right">
                              <p className="font-medium text-sm leading-tight"><span className="text-xs text-muted-foreground me-1">{i + 1}.</span>{formatStudentName(student)}</p>
                              {current?.note && (
                                <p className="text-[11px] text-muted-foreground">{current.note}</p>
                              )}
                              {!current?.note && isAlert && (
                                <p className="text-[10px] text-red-500 inline-flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5" />חריג ({stats.absences} היעדרויות · {stats.lates} איחורים)
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                              {STATUSES.map(st => (
                                <button key={st}
                                  onClick={() => handleQuickStatus(student, st)}
                                  disabled={isPastDay(date)}
                                  aria-label={st}
                                  className={`text-[11px] h-8 w-[58px] px-0 rounded-lg border font-medium transition-all whitespace-nowrap text-center disabled:opacity-50
                                    ${current?.status === st ? statusBtnStyle[st].active : statusBtnStyle[st].idle}`}>
                                  {st}
                                </button>
                              ))}
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Footer status */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 flex-wrap" dir="rtl">
                <Save className="w-3.5 h-3.5" />
                <span>שמירה אוטומטית פעילה</span>
                {confirmed && (
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    נוכחות אושרה
                    {confirmedAt && (
                      <span className="text-emerald-600/80 dark:text-emerald-300/80 font-normal">
                        בשעה {new Date(confirmedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </span>
                )}
                {confirmed && !isPastDay(date) && (
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    <Pencil className="w-3 h-3" />
                    ניתן לערוך עד סוף היום
                  </span>
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <AttendanceAlerts statsPerStudent={statsPerStudent} />
          <AttendancePatterns statsPerStudent={statsPerStudent} allRecords={allRecords} />
        </TabsContent>
      </Tabs>

      {/* Quick picker for exception adding */}
      <StudentQuickPicker
        open={!!pickerStatus}
        onClose={() => setPickerStatus(null)}
        students={students}
        title={
          pickerStatus === 'נעדר/ת' ? 'בחר/י תלמיד/ה לסימון כנעדר/ת' :
          pickerStatus === 'מאחר/ת' ? 'בחר/י תלמיד/ה לסימון כמאחר/ת' :
          pickerStatus === 'שוחרר/ה' ? 'בחר/י תלמיד/ה לסימון כמשוחרר/ת' : ''
        }
        onSelect={handlePickerSelect}
        excludeIds={Object.entries(attendanceMap)
          .filter(([, v]) => v.status === pickerStatus)
          .map(([k]) => k)}
      />

      {/* Detail dialog (minutes / reason / release time) */}
      <ExceptionDetailDialog
        open={!!detailStudent}
        onClose={() => { setDetailStudent(null); setDetailStatus(null); }}
        student={detailStudent}
        status={detailStatus}
        initial={null}
        onSave={handleDetailSave}
      />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ user, role }) {
  const approvedClass = getUserApprovedClass(user);
  const noClass = !approvedClass && role !== 'admin';
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center" dir="rtl">
        <Users className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
        <h3 className="font-semibold text-base mb-2">לא נמצאו תלמידים בכיתה זו</h3>
        <div className="text-sm text-muted-foreground space-y-1.5 mb-4 max-w-md mx-auto">
          {noClass ? (
            <p>⚠️ <strong>אין שיוך כיתה לפרופיל שלך.</strong> יש להגדיר את הכיתה שאת/ה מחנכ/ת בעמוד הפרופיל.</p>
          ) : (
            <>
              <p>הכיתה המשויכת: <strong>{approvedClass || '—'}</strong></p>
              <p>ייתכן שעדיין לא יובאו תלמידים לכיתה זו, או שהם לא משויכים לכיתה הנכונה.</p>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/profile'}>
            בדיקת שיוך כיתה
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/students'}>
            {role === 'admin' ? 'ייבוא תלמידים' : 'רשימת תלמידים'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-3 animate-pulse" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-muted rounded w-32" />
              <div className="h-2.5 bg-muted/60 rounded w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}