import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { getStudentClassId } from '@/lib/studentProfile';
import { getUserApprovedClassId, isStudentInApprovedScope, getActiveScopeMode } from '@/lib/schoolStructure';
import { formatStudentName, compareStudentsByLastName } from '@/lib/studentName';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import CommunityServiceReportsPanel from '@/components/staff/CommunityServiceReportsPanel';
import { toast } from 'sonner';
import { Heart, Edit, AlertTriangle, TrendingUp } from 'lucide-react';

export default function Community({ role = 'homeroom_teacher', user }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serviceReports, setServiceReports] = useState([]);
  const [editStudent, setEditStudent] = useState(null);
  const [form, setForm] = useState({});
  const [filter, setFilter] = useState('הכל');
  const scopeMode = getActiveScopeMode();
  const classId = role === 'student' ? getStudentClassId(user, CLASS_ID) : getUserApprovedClassId(user, CLASS_ID);

  const withCommunityDefaults = (student) => ({
    ...student,
    community_service_goal: student.community_service_goal ?? 60,
    community_service_done: student.community_service_done ?? 0,
    community_service_place: student.community_service_place || '',
    community_service_contact: student.community_service_contact || '',
    community_service_status: student.community_service_status || 'לא התחיל',
  });

  useEffect(() => { loadStudents(); }, [user?.id, role, scopeMode]);
  async function loadStudents() {
    setLoading(true);
    // Fetch only scoped students instead of all students for performance + security
    let studentQuery = {};
    if (role === 'student') {
      studentQuery = { class_id: classId };
    } else if (role === 'homeroom_teacher') {
      studentQuery = { class_id: classId };
    } else if (role === 'coordinator' || role === 'grade_coordinator') {
      const grade = user?.profile_grade_managed || user?.authorization?.scope?.gradeId || '';
      if (grade) studentQuery = { grade };
    }
    // division_manager and admin: no filter (scoped by accessGuard)

    const [data, reports] = await Promise.all([
      Object.keys(studentQuery).length > 0
        ? base44.entities.Student.filter(studentQuery, '-updated_date', 500)
        : base44.entities.Student.list('-updated_date', 500),
      base44.entities.CommunityServiceReport.list('-updated_action_at', 500)
    ]);
    const activeStudents = (data || []).filter(s => s.status !== 'מועבר' && s.status !== 'סיים');
    const scopedStudents = role === 'student'
      ? activeStudents.filter(s => s.class_id === classId || s.user_email === user?.email)
      : activeStudents.filter(s => isStudentInApprovedScope(s, user, role));
    const scopedStudentIds = new Set(scopedStudents.map(s => s.id));
    setServiceReports((reports || []).filter(report => scopedStudentIds.has(report.student_id)));
    setStudents(scopedStudents.map(withCommunityDefaults).sort(compareStudentsByLastName));
    setLoading(false);
  }

  function openEdit(s) { const normalized = withCommunityDefaults(s); setForm({ community_service_goal: normalized.community_service_goal, community_service_done: normalized.community_service_done, community_service_place: normalized.community_service_place, community_service_contact: normalized.community_service_contact, community_service_status: normalized.community_service_status }); setEditStudent(s); }
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    const payload = {
      community_service_goal: Number(form.community_service_goal || 0),
      // השלמת שדות חובה לרשומות ישנות שחסרים בהן שם פרטי/משפחה
      ...(!editStudent.firstName || !editStudent.lastName ? (() => {
        const parts = (editStudent.full_name || editStudent.fullName || formatStudentName(editStudent) || '').trim().split(/\s+/);
        return {
          firstName: editStudent.firstName || parts[0] || '-',
          lastName: editStudent.lastName || parts.slice(1).join(' ') || '-',
        };
      })() : {}),
      community_service_done: Number(form.community_service_done || 0),
      community_service_place: form.community_service_place || '',
      community_service_contact: form.community_service_contact || '',
      community_service_status: form.community_service_status || 'לא התחיל',
    };

    try {
      await base44.entities.Student.update(editStudent.id, payload);
      setEditStudent(null);
      toast.success('המעורבות עודכנה');
      loadStudents().catch(() => {});
    } catch (e) {
      toast.error(`שמירת המעורבות נכשלה: ${e?.message || 'אין הרשאה או שהחיבור למסד נכשל'}`);
    }
  }

  const pct = (s) => Number(s.community_service_goal) > 0 ? Math.round((Number(s.community_service_done || 0) / Number(s.community_service_goal)) * 100) : 0;
  
  const sorted = [...students].sort(compareStudentsByLastName);
  const filtered = filter === 'הכל' ? sorted : sorted.filter(s => s.community_service_status === filter);

  const totalDone = students.reduce((sum, s) => sum + Number(s.community_service_done || 0), 0);
  const avgPct = students.length > 0 ? Math.round(students.reduce((sum, s) => sum + pct(s), 0) / students.length) : 0;
  const completedCount = students.filter(s => s.community_service_status === 'הושלם').length;
  const behindCount = students.filter(s => pct(s) < 50).length;

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader title="מעורבות חברתית" subtitle="מעקב שעות התנדבות" actions={null} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">השלימו</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{avgPct}%</div>
          <div className="text-xs text-muted-foreground mt-0.5">ממוצע כיתה</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{behindCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">בפיגור</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalDone}</div>
          <div className="text-xs text-muted-foreground mt-0.5">שעות סה״כ</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap" dir="rtl">
        {['הכל', 'לא התחיל', 'בתהליך', 'הושלם'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${filter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>
            {s}
          </button>
        ))}
      </div>

      {!loading && ['admin','system_admin','homeroom_teacher','coordinator','grade_coordinator','division_manager'].includes(role) && (
        <CommunityServiceReportsPanel reports={serviceReports} user={user} onChanged={loadStudents} readOnly={!['admin','system_admin','homeroom_teacher','coordinator','grade_coordinator'].includes(role)} />
      )}

      {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>
      : <div className="space-y-2 text-right" dir="rtl">
          {filtered.map((s, i) => {
            const p = pct(s);
            const isBehind = p < 50;
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className={`p-4 transition-all ${isBehind && s.community_service_status !== 'הושלם' ? 'border-amber-200 dark:border-amber-700/50' : ''}`}>
                  <div className="flex items-center gap-3 text-right" dir="rtl">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                      ${p >= 100 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        p >= 50 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {formatStudentName(s).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{formatStudentName(s)}</span>
                        <StatusBadge status={s.community_service_status} />
                        {isBehind && s.community_service_status !== 'הושלם' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500"/>}
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${p >= 100 ? 'bg-emerald-500' : p >= 50 ? 'bg-blue-500' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(p, 100)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-foreground w-10 text-center">{p}%</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{s.community_service_done || 0} / {s.community_service_goal || 60} שע׳</span>
                        {s.community_service_place && <span>· {s.community_service_place}</span>}
                      </div>
                    </div>
                    {['admin','system_admin','homeroom_teacher','coordinator','grade_coordinator'].includes(role) && (
                      <Button variant="ghost" size="icon" className="w-8 h-8 flex-shrink-0" onClick={() => openEdit(s)}>
                        <Edit className="w-4 h-4"/>
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      }

      {editStudent && (
        <Dialog open onOpenChange={() => setEditStudent(null)}>
          <DialogContent className="sm:max-w-sm" dir="rtl">
            <DialogHeader><DialogTitle>עדכון מעורבות – {formatStudentName(editStudent)}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>יעד שעות</Label><Input type="number" value={form.community_service_goal} onChange={e => set('community_service_goal', Number(e.target.value))}/></div>
                <div className="space-y-1"><Label>שעות שבוצעו</Label><Input type="number" value={form.community_service_done} onChange={e => set('community_service_done', Number(e.target.value))}/></div>
              </div>
              <div className="space-y-1"><Label>מקום התנדבות</Label><Input value={form.community_service_place} onChange={e => set('community_service_place', e.target.value)}/></div>
              <div className="space-y-1"><Label>איש קשר</Label><Input value={form.community_service_contact} onChange={e => set('community_service_contact', e.target.value)}/></div>
              <div className="space-y-1">
                <Label>סטטוס</Label>
                <Select value={form.community_service_status} onValueChange={v => set('community_service_status', v)}>
                  <SelectTrigger className="h-10 w-full justify-between text-right" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    dir="rtl"
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={6}
                    collisionPadding={12}
                    className="z-[10001] max-h-64 w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] overflow-x-hidden overflow-y-auto text-right"
                  >
                    {['לא התחיל', 'בתהליך', 'הושלם'].map(s => (
                      <SelectItem
                        key={s}
                        value={s}
                        className="min-h-10 whitespace-normal break-words py-2.5 pe-8 ps-3 text-right leading-relaxed"
                      >
                        <span className="block w-full text-right">{s}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSave} className="flex-1">שמור</Button>
                <Button variant="outline" onClick={() => setEditStudent(null)} className="flex-1">ביטול</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}