import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import RtlActionBar from '@/components/ui/RtlActionBar';
import { toast } from 'sonner';
import { Save, CheckCircle2 } from 'lucide-react';
import { formatStudentName, compareStudentsByLastName } from '@/lib/studentName';

const STATUSES = ['נוכח', 'נעדר', 'מאחר', 'מוצדק', 'שוחרר'];
const STATUS_SHORT = { 'נוכח': 'נוכח', 'נעדר': 'נעדר', 'מאחר': 'מאחר', 'מוצדק': 'מוצדק', 'שוחרר': 'שוחרר' };
const statusColors = {
  'נוכח':  { active: 'bg-emerald-500 text-white border-emerald-500', idle: 'bg-background border-border text-muted-foreground hover:bg-emerald-50 hover:border-emerald-300' },
  'נעדר':  { active: 'bg-red-500 text-white border-red-500',    idle: 'bg-background border-border text-muted-foreground hover:bg-red-50 hover:border-red-300' },
  'מאחר':  { active: 'bg-amber-500 text-white border-amber-500', idle: 'bg-background border-border text-muted-foreground hover:bg-amber-50 hover:border-amber-300' },
  'מוצדק': { active: 'bg-blue-500 text-white border-blue-500',   idle: 'bg-background border-border text-muted-foreground hover:bg-blue-50 hover:border-blue-300' },
  'שוחרר': { active: 'bg-purple-500 text-white border-purple-500', idle: 'bg-background border-border text-muted-foreground hover:bg-purple-50 hover:border-purple-300' },
};

export default function Attendance() {
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [existingIds, setExistingIds] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => { loadData(); }, [date]);

  async function loadData() {
    setLoading(true);
    const [sts, att] = await Promise.all([
      base44.entities.Student.filter({ class_id: CLASS_ID }),
      base44.entities.AttendanceRecord.filter({ class_id: CLASS_ID, date })
    ]);
    setStudents(sts.filter(s => s.status === 'פעיל' || s.status === 'דורש מעקב').sort(compareStudentsByLastName));
    const map = {};
    const ids = {};
    att.forEach(a => { map[a.student_id] = { status: a.status, note: a.note || '' }; ids[a.student_id] = a.id; });
    setAttendanceMap(map);
    setExistingIds(ids);
    setLoading(false);
  }

  const setStatus = (sid, status) => setAttendanceMap(p => ({ ...p, [sid]: { ...(p[sid] || {}), status } }));
  const setNote = (sid, note) => setAttendanceMap(p => ({ ...p, [sid]: { ...(p[sid] || {}), note } }));

  const markAll = (status) => {
    const map = {};
    students.forEach(s => { map[s.id] = { status, note: attendanceMap[s.id]?.note || '' }; });
    setAttendanceMap(map);
  };

  async function handleSave() {
    setSaving(true);
    try {
      for (const student of students) {
        const a = attendanceMap[student.id];
        if (!a?.status) continue;
        const data = { student_id: student.id, student_name: formatStudentName(student), class_id: CLASS_ID, date, status: a.status, note: a.note || '' };
        if (existingIds[student.id]) {
          await base44.entities.AttendanceRecord.update(existingIds[student.id], data);
        } else {
          await base44.entities.AttendanceRecord.create(data);
        }
      }
      const now = new Date();
      setLastSaved(`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`);
      toast.success('נוכחות נשמרה בהצלחה!');
      loadData().catch(() => {});
    } catch (e) {
      toast.error(`שמירת הנוכחות נכשלה: ${e?.message || 'אין הרשאה או שהחיבור למסד נכשל'}`);
    }
    setSaving(false);
  }

  const presentCount = Object.values(attendanceMap).filter(a => a.status === 'נוכח').length;
  const absentCount  = Object.values(attendanceMap).filter(a => a.status === 'נעדר').length;
  const lateCount    = Object.values(attendanceMap).filter(a => a.status === 'מאחר').length;
  const markedCount  = Object.values(attendanceMap).filter(a => a.status).length;

  return (
    <div className="p-4 lg:p-6 space-y-4 text-right" dir="rtl">
      <PageHeader
        title="נוכחות"
        subtitle="סימון נוכחות יומי"
        actions={
          <RtlActionBar
            primary={(
              <Button onClick={handleSave} disabled={saving} size="sm" className="h-9 gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'שומר...' : 'שמור'}
              </Button>
            )}
            secondary={lastSaved ? (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400" dir="rtl">
                <CheckCircle2 className="w-3.5 h-3.5" />
                נשמר ב-{lastSaved}
              </span>
            ) : null}
          />
        }
      />

      {/* Date + Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="date" className="text-sm flex-shrink-0">תאריך:</Label>
          <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
        </div>
        <div className="flex gap-2 flex-wrap text-sm">
          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl font-medium">✓ {presentCount} נוכחים</span>
          <span className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium">✗ {absentCount} נעדרים</span>
          <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl font-medium">⏰ {lateCount} מאחרים</span>
          <span className="px-3 py-1 bg-muted text-muted-foreground rounded-xl font-medium">{markedCount}/{students.length} סומנו</span>
        </div>
      </div>

      {/* Mark All */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">סמן הכל:</span>
        {STATUSES.map(st => (
          <button key={st} onClick={() => markAll(st)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${statusColors[st].idle}`}>
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
            const isAbsent = current?.status === 'נעדר';
            const isLate = current?.status === 'מאחר';
            return (
              <motion.div key={student.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <Card className={`p-3 transition-all ${isAbsent ? 'border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-900/5' : ''}`}>
                  <div className="grid grid-cols-[auto,minmax(7rem,10rem),1fr] items-center gap-3" dir="rtl">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                      ${student.gender === 'נקבה' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                      {formatStudentName(student).charAt(0)}
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="font-medium text-sm truncate">{formatStudentName(student)}</p>
                      {student.status === 'דורש מעקב' && <StatusBadge status="דורש מעקב" className="mt-0.5 scale-90 origin-center" />}
                    </div>
                    {/* Status buttons */}
                    <div className="flex gap-1 flex-wrap justify-center sm:justify-start min-w-0">
                      {STATUSES.map(st => {
                        const isSelected = current?.status === st;
                        return (
                          <button
                            key={st}
                            onClick={() => setStatus(student.id, st)}
                            title={st}
                            className={`text-[11px] px-1.5 sm:px-2 py-1.5 rounded-lg border font-medium transition-all whitespace-nowrap
                              ${isSelected ? statusColors[st].active : statusColors[st].idle}`}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {(isAbsent || isLate || current?.note) && (
                    <div className="mt-2 me-12">
                      <Input
                        placeholder="הערה (אופציונלי)..."
                        value={current?.note || ''}
                        onChange={e => setNote(student.id, e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {!loading && students.length > 0 && (
        <Button onClick={handleSave} disabled={saving} className="w-full gap-2 mt-2">
          <Save className="w-4 h-4" />
          {saving ? 'שומר...' : 'שמור נוכחות'}
        </Button>
      )}
    </div>
  );
}