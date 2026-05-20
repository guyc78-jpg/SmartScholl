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
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import { Calendar, Plus, Edit, Trash2 } from 'lucide-react';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
const SUBJECTS = ['מתמטיקה', 'עברית', 'ספרות', 'אנגלית', 'היסטוריה', 'גיאוגרפיה', 'פיזיקה', 'כימיה', 'ביולוגיה', 'חינוך גופני', 'אמנות', 'שעת כיתה', 'אחר'];
const subjectColors = {
  'מתמטיקה': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'עברית': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'ספרות': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'אנגלית': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'היסטוריה': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'פיזיקה': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  'כימיה': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'ביולוגיה': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'שעת כיתה': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
};

export default function Schedule({ role = 'homeroom_teacher' }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [form, setForm] = useState({ day: 'ראשון', period: 1, start_time: '08:00', end_time: '08:45', subject: '', teacher: '', room: '', notes: '' });

  useEffect(() => { loadSlots(); }, []);
  async function loadSlots() {
    setLoading(true);
    const data = await base44.entities.ScheduleSlot.filter({ class_id: CLASS_ID });
    setSlots(data);
    setLoading(false);
  }

  function openAdd() { setForm({ day: 'ראשון', period: 1, start_time: '08:00', end_time: '08:45', subject: '', teacher: '', room: '', notes: '' }); setEditSlot(null); setShowForm(true); }
  function openEdit(s) { setForm({ ...s }); setEditSlot(s); setShowForm(true); }
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.subject) { toast.error('מקצוע הוא שדה חובה'); return; }
    const data = { ...form, class_id: CLASS_ID, period: Number(form.period) };
    try {
      if (editSlot) { await base44.entities.ScheduleSlot.update(editSlot.id, data); toast.success('עודכן'); }
      else { await base44.entities.ScheduleSlot.create(data); toast.success('שיעור נוסף!'); }
      setShowForm(false); loadSlots();
    } catch { toast.error('שגיאה'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('למחוק שיעור זה?')) return;
    await base44.entities.ScheduleSlot.delete(id);
    toast.success('נמחק'); loadSlots();
  }

  const byDay = DAYS.map(day => ({
    day,
    slots: slots.filter(s => s.day === day).sort((a,b) => a.period - b.period)
  }));

  const todayDayName = DAYS[new Date().getDay() === 0 ? 0 : new Date().getDay() - 1] || DAYS[0];

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader title="מערכת שעות" subtitle="לוח השיעורים השבועי"
        actions={role === 'homeroom_teacher' ? <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="w-4 h-4"/>הוסף שיעור</Button> : null} />

      {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>
      : slots.length === 0
        ? <EmptyState icon={Calendar} title="מערכת שעות ריקה" description="הוסף שיעורים למערכת"
            action={role === 'homeroom_teacher' ? <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4"/>הוסף שיעור</Button> : null} />
        : <div className="space-y-4">
          {byDay.filter(d => d.slots.length > 0).map(({ day, slots: daySlots }) => (
            <div key={day}>
              <div className={`flex items-center gap-2 mb-2 ${day === todayDayName ? '' : ''}`}>
                <h2 className={`text-sm font-bold ${day === todayDayName ? 'text-primary' : 'text-foreground'}`}>יום {day}</h2>
                {day === todayDayName && <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full">היום</span>}
              </div>
              <div className="grid gap-2">
                {daySlots.map(slot => {
                  const color = subjectColors[slot.subject] || 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
                  return (
                    <motion.div key={slot.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Card className="p-3 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                            {slot.period}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-24 flex-shrink-0">
                            {slot.start_time && slot.end_time ? `${slot.start_time}–${slot.end_time}` : slot.start_time || ''}
                          </div>
                          <div className="flex-1 flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${color}`}>{slot.subject}</span>
                            {slot.teacher && <span className="text-xs text-muted-foreground">{slot.teacher}</span>}
                            {slot.room && <span className="text-xs text-muted-foreground">· חדר {slot.room}</span>}
                          </div>
                          {role === 'homeroom_teacher' && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(slot)}><Edit className="w-3.5 h-3.5"/></Button>
                              <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500" onClick={() => handleDelete(slot.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      }

      {showForm && (
        <Dialog open onOpenChange={() => setShowForm(false)}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader><DialogTitle>{editSlot ? 'עריכת שיעור' : 'הוספת שיעור'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>יום</Label>
                  <Select value={form.day} onValueChange={v => set('day', v)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>שיעור מספר</Label><Input type="number" min="1" max="10" value={form.period} onChange={e => set('period', e.target.value)}/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>שעת התחלה</Label><Input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)}/></div>
                <div className="space-y-1"><Label>שעת סיום</Label><Input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)}/></div>
              </div>
              <div className="space-y-1">
                <Label>מקצוע *</Label>
                <Select value={form.subject} onValueChange={v => set('subject', v)}>
                  <SelectTrigger><SelectValue placeholder="בחר מקצוע"/></SelectTrigger>
                  <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>מורה</Label><Input value={form.teacher} onChange={e => set('teacher', e.target.value)}/></div>
                <div className="space-y-1"><Label>חדר</Label><Input value={form.room} onChange={e => set('room', e.target.value)}/></div>
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