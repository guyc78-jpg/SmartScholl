import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import { BarChart2, Plus, Edit, Trash2 } from 'lucide-react';

const CATEGORIES = [
  { key: 'learning_habits', label: 'הרגלי למידה' },
  { key: 'participation', label: 'השתתפות' },
  { key: 'responsibility', label: 'אחריות' },
  { key: 'behavior', label: 'התנהגות' },
  { key: 'social_functioning', label: 'תפקוד חברתי' },
  { key: 'emotional_state', label: 'מצב רגשי' },
];

const RatingDots = ({ value, onChange }) => (
  <div className="flex gap-2">
    {[1,2,3,4,5].map(n => (
      <button key={n} type="button" onClick={() => onChange && onChange(n)}
        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all
          ${n <= value
            ? n <= 2 ? 'bg-red-400 border-red-400 text-white'
              : n <= 3 ? 'bg-amber-400 border-amber-400 text-white'
              : 'bg-emerald-400 border-emerald-400 text-white'
            : 'border-muted text-muted-foreground hover:border-primary'}`}>
        {n}
      </button>
    ))}
  </div>
);

const avg = (r) => {
  const vals = [r.learning_habits, r.participation, r.responsibility, r.behavior, r.social_functioning, r.emotional_state].filter(Boolean);
  return vals.length > 0 ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '—';
};

export default function Performance({ role = 'homeroom_teacher' }) {
  const [reviews, setReviews] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editReview, setEditReview] = useState(null);
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ student_id: '', period: '', date: today, learning_habits: 3, participation: 3, responsibility: 3, behavior: 3, social_functioning: 3, emotional_state: 3, notes: '' });

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    setLoading(true);
    const [rvs, sts] = await Promise.all([
      base44.entities.PerformanceReview.filter({ class_id: CLASS_ID }),
      base44.entities.Student.filter({ class_id: CLASS_ID }),
    ]);
    setReviews(rvs.sort((a,b) => b.date.localeCompare(a.date)));
    setStudents(sts);
    setLoading(false);
  }

  function openAdd() { setForm({ student_id: '', period: 'רבעון ב׳', date: today, learning_habits: 3, participation: 3, responsibility: 3, behavior: 3, social_functioning: 3, emotional_state: 3, notes: '' }); setEditReview(null); setShowForm(true); }
  function openEdit(r) { setForm({ ...r }); setEditReview(r); setShowForm(true); }
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.student_id || !form.period) { toast.error('יש לבחור תלמיד ותקופה'); return; }
    const student = students.find(s => s.id === form.student_id);
    const data = { ...form, student_name: student?.full_name, class_id: CLASS_ID };
    try {
      if (editReview) { await base44.entities.PerformanceReview.update(editReview.id, data); toast.success('עודכן'); }
      else { await base44.entities.PerformanceReview.create(data); toast.success('הערכה נשמרה!'); }
      setShowForm(false); loadData();
    } catch { toast.error('שגיאה'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('למחוק?')) return;
    await base44.entities.PerformanceReview.delete(id);
    loadData();
  }

  const formatDate = (d) => { if (!d) return ''; const dt = new Date(d); return `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear()}`; };

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader title="תפקוד" subtitle="הערכות תקופתיות לתלמידים"
        actions={['admin','homeroom_teacher','coordinator'].includes(role) ? <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="w-4 h-4"/>הערכה חדשה</Button> : null} />

      {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>
      : reviews.length === 0
        ? <EmptyState icon={BarChart2} title="אין הערכות תפקוד" description="הוסף הערכה ראשונה" action={<Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4"/>הערכה חדשה</Button>} />
        : <div className="grid gap-3 sm:grid-cols-2">
          {reviews.map((r, i) => {
            const average = avg(r);
            const avgNum = parseFloat(average);
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-sm">{r.student_name}</p>
                      <p className="text-xs text-muted-foreground">{r.period} · {formatDate(r.date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-xl font-bold ${avgNum >= 4 ? 'text-emerald-500' : avgNum >= 3 ? 'text-blue-500' : 'text-red-500'}`}>{average}</div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(r)}><Edit className="w-3.5 h-3.5"/></Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500" onClick={() => handleDelete(r.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                    {CATEGORIES.map(cat => (
                      <div key={cat.key} className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{cat.label}</span>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(n => (
                            <div key={n} className={`w-2.5 h-2.5 rounded-full ${n <= (r[cat.key] || 0)
                              ? (r[cat.key] <= 2 ? 'bg-red-400' : r[cat.key] <= 3 ? 'bg-amber-400' : 'bg-emerald-400')
                              : 'bg-muted'}`}/>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {r.notes && <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">{r.notes}</p>}
                </Card>
              </motion.div>
            );
          })}
        </div>
      }

      {showForm && (
        <Dialog open onOpenChange={() => setShowForm(false)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader><DialogTitle>{editReview ? 'עריכת הערכה' : 'הערכת תפקוד חדשה'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>תלמיד *</Label>
                  <Select value={form.student_id} onValueChange={v => set('student_id', v)}>
                    <SelectTrigger><SelectValue placeholder="בחר"/></SelectTrigger>
                    <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>תקופה *</Label>
                  <Select value={form.period} onValueChange={v => set('period', v)}>
                    <SelectTrigger><SelectValue placeholder="בחר"/></SelectTrigger>
                    <SelectContent>{['רבעון א׳', 'רבעון ב׳', 'רבעון ג׳', 'רבעון ד׳', 'סמסטר א׳', 'סמסטר ב׳'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label>תאריך</Label><Input type="date" value={form.date} onChange={e => set('date', e.target.value)}/></div>
              <div className="space-y-4 pt-2">
                <p className="text-sm font-semibold text-muted-foreground">דירוגים (1 נמוך – 5 גבוה)</p>
                {CATEGORIES.map(cat => (
                  <div key={cat.key} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm">{cat.label}</Label>
                      <span className="text-sm font-bold text-primary">{form[cat.key]}</span>
                    </div>
                    <RatingDots value={form[cat.key]} onChange={v => set(cat.key, v)} />
                  </div>
                ))}
              </div>
              <div className="space-y-1"><Label>הערה חופשית</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}/></div>
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