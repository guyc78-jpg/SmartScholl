import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import { Heart, Edit, AlertTriangle, TrendingUp } from 'lucide-react';

export default function Community() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editStudent, setEditStudent] = useState(null);
  const [form, setForm] = useState({});
  const [filter, setFilter] = useState('הכל');

  useEffect(() => { loadStudents(); }, []);
  async function loadStudents() {
    setLoading(true);
    const data = await base44.entities.Student.filter({ class_id: CLASS_ID });
    setStudents(data.filter(s => s.status !== 'מועבר' && s.status !== 'סיים'));
    setLoading(false);
  }

  function openEdit(s) { setForm({ community_service_goal: s.community_service_goal || 60, community_service_done: s.community_service_done || 0, community_service_place: s.community_service_place || '', community_service_contact: s.community_service_contact || '', community_service_status: s.community_service_status || 'לא התחיל' }); setEditStudent(s); }
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    try {
      await base44.entities.Student.update(editStudent.id, form);
      toast.success('עודכן בהצלחה!');
      setEditStudent(null);
      loadStudents();
    } catch { toast.error('שגיאה'); }
  }

  const pct = (s) => s.community_service_goal > 0 ? Math.round((s.community_service_done / s.community_service_goal) * 100) : 0;
  
  const sorted = [...students].sort((a,b) => pct(a) - pct(b));
  const filtered = filter === 'הכל' ? sorted : sorted.filter(s => s.community_service_status === filter);

  const totalDone = students.reduce((sum, s) => sum + (s.community_service_done || 0), 0);
  const avgPct = students.length > 0 ? Math.round(students.reduce((sum, s) => sum + pct(s), 0) / students.length) : 0;
  const completedCount = students.filter(s => s.community_service_status === 'הושלם').length;
  const behindCount = students.filter(s => pct(s) < 50).length;

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader title="מעורבות חברתית" subtitle="מעקב שעות התנדבות" />

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

      <div className="flex gap-2 flex-wrap">
        {['הכל', 'לא התחיל', 'בתהליך', 'הושלם'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${filter === s ? 'bg-primary text-white border-primary' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>
      : <div className="space-y-2">
          {filtered.map((s, i) => {
            const p = pct(s);
            const isBehind = p < 50;
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className={`p-4 transition-all ${isBehind && s.community_service_status !== 'הושלם' ? 'border-amber-200 dark:border-amber-700/50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                      ${p >= 100 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        p >= 50 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {s.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{s.full_name}</span>
                        <StatusBadge status={s.community_service_status} />
                        {isBehind && s.community_service_status !== 'הושלם' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500"/>}
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${p >= 100 ? 'bg-emerald-500' : p >= 50 ? 'bg-blue-500' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(p, 100)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-foreground w-10 text-left">{p}%</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{s.community_service_done || 0} / {s.community_service_goal || 60} שע׳</span>
                        {s.community_service_place && <span>· {s.community_service_place}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="w-8 h-8 flex-shrink-0" onClick={() => openEdit(s)}>
                      <Edit className="w-4 h-4"/>
                    </Button>
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
            <DialogHeader><DialogTitle>עדכון מעורבות – {editStudent.full_name}</DialogTitle></DialogHeader>
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
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{['לא התחיל', 'בתהליך', 'הושלם'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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