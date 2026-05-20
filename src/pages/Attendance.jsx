import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { Calendar, Save, ChevronDown, ChevronUp } from 'lucide-react';

const STATUSES = ['נוכח', 'נעדר', 'מאחר', 'מוצדק', 'שוחרר'];
const statusColors = {
  'נוכח': 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  'נעדר': 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  'מאחר': 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  'מוצדק': 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  'שוחרר': 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
};

export default function Attendance() {
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [existingIds, setExistingIds] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [date]);

  async function loadData() {
    setLoading(true);
    const [sts, att] = await Promise.all([
      base44.entities.Student.filter({ class_id: CLASS_ID }),
      base44.entities.AttendanceRecord.filter({ class_id: CLASS_ID, date })
    ]);
    setStudents(sts.filter(s => s.status === 'פעיל' || s.status === 'דורש מעקב'));
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
        const data = { student_id: student.id, student_name: student.full_name, class_id: CLASS_ID, date, status: a.status, note: a.note || '' };
        if (existingIds[student.id]) {
          await base44.entities.AttendanceRecord.update(existingIds[student.id], data);
        } else {
          await base44.entities.AttendanceRecord.create(data);
        }
      }
      toast.success('נוכחות נשמרה בהצלחה!');
      await loadData();
    } catch {
      toast.error('שגיאה בשמירה');
    }
    setSaving(false);
  }

  const presentCount = Object.values(attendanceMap).filter(a => a.status === 'נוכח').length;
  const absentCount = Object.values(attendanceMap).filter(a => a.status === 'נעדר').length;
  const lateCount = Object.values(attendanceMap).filter(a => a.status === 'מאחר').length;

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader
        title="נוכחות"
        subtitle="סימון נוכחות יומי"
        actions={
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'שומר...' : 'שמור נוכחות'}
          </Button>
        }
      />

      {/* Date & Stats */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-3">
          <Label htmlFor="date" className="flex-shrink-0">תאריך:</Label>
          <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-sm font-medium text-emerald-700 dark:text-emerald-400">
            ✓ {presentCount} נוכחים
          </div>
          <div className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm font-medium text-red-600 dark:text-red-400">
            ✗ {absentCount} נעדרים
          </div>
          <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm font-medium text-amber-600 dark:text-amber-400">
            ⏰ {lateCount} מאחרים
          </div>
        </div>
      </div>

      {/* Quick Mark All */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground pt-1">סמן הכל:</span>
        {STATUSES.map(st => (
          <button key={st} onClick={() => markAll(st)} className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${statusColors[st]}`}>
            {st}
          </button>
        ))}
      </div>

      {/* Students List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>
      ) : (
        <div className="space-y-2">
          {students.map((student, i) => {
            const current = attendanceMap[student.id];
            return (
              <motion.div key={student.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <Card className={`p-3 transition-all ${current?.status === 'נעדר' ? 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                      ${student.gender === 'נקבה' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                      {student.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{student.full_name}</p>
                      {student.status === 'דורש מעקב' && <StatusBadge status="דורש מעקב" className="mt-0.5" />}
                    </div>
                    {/* Status buttons */}
                    <div className="flex gap-1 flex-wrap justify-end">
                      {STATUSES.map(st => (
                        <button
                          key={st}
                          onClick={() => setStatus(student.id, st)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${current?.status === st ? statusColors[st] + ' ring-1 ring-current' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(current?.status === 'נעדר' || current?.status === 'מאחר' || current?.note) && (
                    <div className="mt-2 pr-12">
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
        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'שומר...' : 'שמור נוכחות'}
        </Button>
      )}
    </div>
  );
}