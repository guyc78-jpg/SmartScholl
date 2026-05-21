import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { Save, AlertTriangle, TrendingUp, Users, Clock, UserX, ChevronDown, ChevronUp } from 'lucide-react';
import AttendanceAlerts from '@/components/attendance/AttendanceAlerts';
import AttendancePatterns from '@/components/attendance/AttendancePatterns';
import { isStudentInApprovedScope, getUserApprovedClass } from '@/lib/schoolStructure';
import { useAuth } from '@/lib/AuthContext';
import { formatAttendanceStatus } from '@/lib/genderUtils';

const STATUSES = ['נוכח/ת', 'מאחר/ת', 'נעדר/ת', 'שוחרר/ה'];

const statusStyle = {
  'נוכח/ת':   { active: 'bg-emerald-500 text-white border-emerald-500', idle: 'border-border text-muted-foreground hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-900/20' },
  'מאחר/ת':   { active: 'bg-amber-500 text-white border-amber-500',    idle: 'border-border text-muted-foreground hover:bg-amber-50 hover:border-amber-300 dark:hover:bg-amber-900/20' },
  'נעדר/ת':   { active: 'bg-red-500 text-white border-red-500',         idle: 'border-border text-muted-foreground hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20' },
  'שוחרר/ה':  { active: 'bg-purple-500 text-white border-purple-500',   idle: 'border-border text-muted-foreground hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-900/20' },
};

// Absence thresholds for alerts
export const THRESHOLDS = { absences: 5, lates: 8 };

export default function ClassAttendance({ role }) {
  const { user } = useAuth();
  const isHomeroomTeacher = role === 'homeroom_teacher' || role === 'admin';

  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [existingIds, setExistingIds] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allRecords, setAllRecords] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [tab, setTab] = useState('daily');

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (tab === 'daily') loadDay(); }, [date, tab]);

  async function loadAll() {
    setLoading(true);
    const [sts, recs] = await Promise.all([
      base44.entities.Student.filter({ class_id: CLASS_ID }),
      base44.entities.AttendanceRecord.filter({ class_id: CLASS_ID }),
    ]);
    const scopedStudents = sts.filter(s => isStudentInApprovedScope(s, user, role) && (s.status === 'פעיל' || s.status === 'דורש מעקב'));
    const scopedIds = new Set(scopedStudents.map(s => s.id));
    setStudents(scopedStudents);
    // Only use records with the new statuses
    setAllRecords(recs.filter(r => STATUSES.includes(r.status) && scopedIds.has(r.student_id)));
    setLoading(false);
  }

  async function loadDay() {
    const att = await base44.entities.AttendanceRecord.filter({ class_id: CLASS_ID, date });
    const map = {}, ids = {};
    att.filter(r => STATUSES.includes(r.status)).forEach(a => {
      map[a.student_id] = { status: a.status, note: a.note || '' };
      ids[a.student_id] = a.id;
    });
    setAttendanceMap(map);
    setExistingIds(ids);
  }

  const setStatus = (sid, status) => setAttendanceMap(p => {
    const current = p[sid];
    if (current?.status === status) {
      const next = { ...p };
      delete next[sid];
      return next;
    }
    return { ...p, [sid]: { ...(current || {}), status } };
  });
  const setNote   = (sid, note)   => setAttendanceMap(p => ({ ...p, [sid]: { ...(p[sid] || {}), note } }));

  const markAll = (status) => {
    const map = {};
    students.forEach(s => { map[s.id] = { status, note: attendanceMap[s.id]?.note || '' }; });
    setAttendanceMap(map);
  };

  async function handleSave() {
    if (!isHomeroomTeacher) { toast.error('אין לך הרשאה לסמן נוכחות'); return; }
    setSaving(true);
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    for (const student of students) {
      const a = attendanceMap[student.id];
      const existingId = existingIds[student.id];

      if (!a?.status) {
        if (existingId) await base44.entities.AttendanceRecord.delete(existingId);
        continue;
      }

      const data = {
        student_id: student.id,
        student_name: student.full_name,
        class_id: CLASS_ID,
        date,
        status: a.status,
        note: a.note || '',
        period: timeStr,
      };
      if (existingId) {
        await base44.entities.AttendanceRecord.update(existingId, data);
      } else {
        await base44.entities.AttendanceRecord.create(data);
      }
    }
    setLastSaved(timeStr);
    toast.success('נוכחות נשמרה!');
    await loadAll();
    await loadDay();
    setSaving(false);
  }

  // Compute per-student stats
  const statsPerStudent = students.map(s => {
    const recs = allRecords.filter(r => r.student_id === s.id);
    const absences = recs.filter(r => r.status === 'נעדר/ת').length;
    const lates    = recs.filter(r => r.status === 'מאחר/ת').length;
    const released = recs.filter(r => r.status === 'שוחרר/ה').length;
    const total    = recs.length;
    return { ...s, absences, lates, released, total };
  });

  const alertStudents = statsPerStudent.filter(s => s.absences >= THRESHOLDS.absences || s.lates >= THRESHOLDS.lates);

  const presentCount = Object.values(attendanceMap).filter(a => a.status === 'נוכח/ת').length;
  const absentCount  = Object.values(attendanceMap).filter(a => a.status === 'נעדר/ת').length;
  const lateCount    = Object.values(attendanceMap).filter(a => a.status === 'מאחר/ת').length;
  const markedCount  = Object.values(attendanceMap).filter(a => a.status).length;

  if (!isHomeroomTeacher) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 text-center" dir="rtl">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-lg font-semibold mb-1">גישה מוגבלת</h2>
        <p className="text-muted-foreground text-sm">מודול זה זמין למחנכ/ת כיתה בלבד.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 text-right" dir="rtl">
      <PageHeader
        title="מעקב נוכחות כיתתי"
        subtitle={`כלי פנימי לזיהוי דפוסי איחורים והיעדרויות · כיתה ${getUserApprovedClass(user) || ''}`}
        actions={
          alertStudents.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              {alertStudents.length} תלמידים בסף חריג
            </div>
          )
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="daily">סימון יומי</TabsTrigger>
          <TabsTrigger value="patterns">דפוסים והתראות</TabsTrigger>
        </TabsList>

        {/* ── DAILY TAB ── */}
        <TabsContent value="daily" className="space-y-4">
          {/* Date + Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right" dir="rtl">
            <div className="flex items-center flex-row-reverse gap-2">
              <Label htmlFor="date" className="text-sm flex-shrink-0">תאריך:</Label>
              <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
            </div>
            <div className="flex gap-2 flex-wrap flex-row-reverse text-sm">
              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl font-medium">✓ {presentCount} נוכחים</span>
              <span className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium">✗ {absentCount} נעדרים</span>
              <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl font-medium">⏰ {lateCount} מאחרים</span>
              <span className="px-3 py-1 bg-muted text-muted-foreground rounded-xl font-medium">{markedCount}/{students.length} סומנו</span>
            </div>
          </div>

          {/* Mark All */}
          <div className="flex items-center flex-row-reverse gap-2 flex-wrap text-right" dir="rtl">
            <span className="text-xs text-muted-foreground">סמן הכל:</span>
            {STATUSES.map(st => (
              <button key={st} onClick={() => markAll(st)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${statusStyle[st].idle}`}>
                {st}
              </button>
            ))}
          </div>

          {/* Students */}
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>
          ) : (
            <div className="space-y-2">
              {students.map((student, i) => {
                const current = attendanceMap[student.id];
                const stats = statsPerStudent.find(s => s.id === student.id);
                const isAlert = stats && (stats.absences >= THRESHOLDS.absences || stats.lates >= THRESHOLDS.lates);
                const isExpanded = expandedStudent === student.id;
                return (
                  <motion.div key={student.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                    <Card className={`transition-all ${isAlert ? 'border-red-200 dark:border-red-800/60 bg-red-50/20 dark:bg-red-900/5' : ''}`}>
                      <div className="p-3">
                        <div className="grid grid-cols-[auto,minmax(7rem,10rem),1fr,auto] items-center gap-3 rtl:grid-cols-[auto,1fr,minmax(7rem,10rem),auto]" dir="rtl">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                            ${student.gender === 'נקבה' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            {student.full_name.charAt(0)}
                          </div>
                          <div className="min-w-0 text-right">
                            <p className="font-medium text-sm truncate">{student.full_name}</p>
                            {isAlert && (
                              <p className="text-[10px] text-red-500 inline-flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />חריג
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-wrap flex-row-reverse min-w-0">
                            {STATUSES.map(st => (
                              <button key={st} onClick={() => setStatus(student.id, st)}
                                className={`text-[11px] px-1.5 sm:px-2 py-1.5 rounded-lg border font-medium transition-all whitespace-nowrap
                                  ${current?.status === st ? statusStyle[st].active : statusStyle[st].idle}`}>
                                {formatAttendanceStatus(st, student)}
                              </button>
                            ))}
                          </div>
                          <button onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 justify-self-start">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Note input when absent/late */}
                        {(current?.status === 'נעדר/ת' || current?.status === 'מאחר/ת' || current?.note) && (
                          <div className="mt-2 me-12">
                            <Input placeholder="הערה (אופציונלי)..." value={current?.note || ''}
                              onChange={e => setNote(student.id, e.target.value)} className="text-sm h-8" />
                          </div>
                        )}

                        {/* Expanded stats */}
                        {isExpanded && stats && (
                          <div className="mt-3 me-12 p-2 bg-muted/40 rounded-lg flex flex-row-reverse gap-4 text-xs flex-wrap text-right">
                            <span className="text-red-600 dark:text-red-400 font-medium">היעדרויות: {stats.absences}</span>
                            <span className="text-amber-600 dark:text-amber-400 font-medium">איחורים: {stats.lates}</span>
                            <span className="text-purple-600 dark:text-purple-400 font-medium">{formatAttendanceStatus('שוחרר/ה', student)}: {stats.released}</span>
                            <span className="text-muted-foreground">סה"כ רשומות: {stats.total}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {students.length > 0 && (
            <div className="flex items-center flex-row-reverse gap-3 text-right" dir="rtl">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'שומר...' : 'שמור נוכחות'}
              </Button>
              {lastSaved && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">נשמר ב-{lastSaved}</span>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── PATTERNS TAB ── */}
        <TabsContent value="patterns" className="space-y-4">
          <AttendanceAlerts statsPerStudent={statsPerStudent} />
          <AttendancePatterns statsPerStudent={statsPerStudent} allRecords={allRecords} />
        </TabsContent>
      </Tabs>
    </div>
  );
}