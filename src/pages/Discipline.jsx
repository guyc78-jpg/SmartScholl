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
import { Checkbox } from '@/components/ui/checkbox';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import { Shield, Plus, Edit, Trash2, Filter } from 'lucide-react';

export default function Discipline({ role = 'homeroom_teacher' }) {
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [statusFilter, setStatusFilter] = useState('הכל');
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ student_id: '', date: today, time: '', severity: 'קלה', category: 'התנהגות', description: '', treatment: '', parents_updated: false, follow_up_date: '', status: 'פתוח' });

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    setLoading(true);
    const [evs, sts] = await Promise.all([
      base44.entities.DisciplineEvent.filter({ class_id: CLASS_ID }),
      base44.entities.Student.filter({ class_id: CLASS_ID }),
    ]);
    setEvents(evs.sort((a,b) => b.date.localeCompare(a.date)));
    setStudents(sts);
    setLoading(false);
  }

  function openAdd() { setForm({ student_id: '', date: today, time: '', severity: 'קלה', category: 'התנהגות', description: '', treatment: '', parents_updated: false, follow_up_date: '', status: 'פתוח' }); setEditEvent(null); setShowForm(true); }
  function openEdit(ev) { setForm({ ...ev }); setEditEvent(ev); setShowForm(true); }
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.student_id || !form.description) { toast.error('יש למלא תלמיד ותיאור'); return; }
    const student = students.find(s => s.id === form.student_id);
    const data = { ...form, student_name: student?.full_name, class_id: CLASS_ID };
    try {
      if (editEvent) { await base44.entities.DisciplineEvent.update(editEvent.id, data); toast.success('עודכן'); }
      else { await base44.entities.DisciplineEvent.create(data); toast.success('אירוע תועד!'); }
      setShowForm(false); loadData();
    } catch { toast.error('שגיאה'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('למחוק?')) return;
    await base44.entities.DisciplineEvent.delete(id);
    toast.success('נמחק'); loadData();
  }

  async function updateStatus(id, status) {
    await base44.entities.DisciplineEvent.update(id, { status });
    toast.success(`סטטוס עודכן ל${status}`); loadData();
  }

  const filtered = statusFilter === 'הכל' ? events : events.filter(e => e.status === statusFilter);
  const formatDate = (d) => { const dt = new Date(d); return `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear()}`; };

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader title="משמעת" subtitle={`${events.filter(e => e.status === 'פתוח').length} אירועים פתוחים`}
        actions={['admin','homeroom_teacher','coordinator'].includes(role) ? <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="w-4 h-4"/>הוסף אירוע</Button> : null} />

      <div className="flex gap-2 flex-wrap">
        {['הכל', 'פתוח', 'בטיפול', 'סגור'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${statusFilter === s ? 'bg-primary text-white border-primary' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>
            {s} {s !== 'הכל' && `(${events.filter(e => e.status === s).length})`}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>
      : filtered.length === 0
        ? <EmptyState icon={Shield} title="אין אירועי משמעת" description={statusFilter === 'הכל' ? 'כל האירועים מסודרים!' : `אין אירועים בסטטוס ${statusFilter}`} action={<Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4"/>הוסף אירוע</Button>} />
        : <div className="space-y-3">
          {filtered.map((ev, i) => (
            <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className={`p-4 ${ev.status === 'פתוח' ? 'border-red-200 dark:border-red-800/50' : ev.status === 'בטיפול' ? 'border-amber-200 dark:border-amber-800/50' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                        {ev.student_name?.charAt(0)}
                      </div>
                      <span className="font-semibold text-sm">{ev.student_name}</span>
                      <StatusBadge status={ev.severity} />
                      <StatusBadge status={ev.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{formatDate(ev.date)} {ev.time && `· ${ev.time}`} · {ev.category}</p>
                    <p className="text-sm text-foreground mb-2">{ev.description}</p>
                    {ev.treatment && (
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-muted-foreground">טיפול:</span>
                        <span className="text-foreground">{ev.treatment}</span>
                      </div>
                    )}
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      {ev.parents_updated && <span className="text-emerald-600 dark:text-emerald-400">✓ הורים עודכנו</span>}
                      {ev.follow_up_date && <span>מעקב: {formatDate(ev.follow_up_date)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(ev)}><Edit className="w-3.5 h-3.5"/></Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500" onClick={() => handleDelete(ev.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
                  </div>
                </div>
                {ev.status !== 'סגור' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    {ev.status === 'פתוח' && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(ev.id, 'בטיפול')}>העבר לטיפול</Button>}
                    <Button size="sm" variant="outline" className="text-xs h-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => updateStatus(ev.id, 'סגור')}>סגור</Button>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      }

      {showForm && (
        <Dialog open onOpenChange={() => setShowForm(false)}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader><DialogTitle>{editEvent ? 'עריכת אירוע משמעת' : 'תיעוד אירוע משמעת'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>תלמיד *</Label>
                <Select value={form.student_id} onValueChange={v => set('student_id', v)}>
                  <SelectTrigger><SelectValue placeholder="בחר תלמיד"/></SelectTrigger>
                  <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>תאריך</Label><Input type="date" value={form.date} onChange={e => set('date', e.target.value)}/></div>
                <div className="space-y-1"><Label>שעה</Label><Input type="time" value={form.time} onChange={e => set('time', e.target.value)}/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>חומרה</Label>
                  <Select value={form.severity} onValueChange={v => set('severity', v)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{['קלה', 'בינונית', 'חמורה'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>קטגוריה</Label>
                  <Select value={form.category} onValueChange={v => set('category', v)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{['התנהגות', 'למידה', 'נוכחות', 'תקשורת', 'אחר'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label>תיאור האירוע *</Label><Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}/></div>
              <div className="space-y-1"><Label>טיפול שבוצע</Label><Textarea value={form.treatment} onChange={e => set('treatment', e.target.value)} rows={2}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>סטטוס</Label>
                  <Select value={form.status} onValueChange={v => set('status', v)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{['פתוח', 'בטיפול', 'סגור'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>תאריך מעקב</Label><Input type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)}/></div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="parents" checked={form.parents_updated} onCheckedChange={v => set('parents_updated', v)}/>
                <Label htmlFor="parents">הורים עודכנו</Label>
              </div>
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