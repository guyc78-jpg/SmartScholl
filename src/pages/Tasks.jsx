import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { getUserApprovedClassId } from '@/lib/schoolStructure';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import { CheckSquare, Plus, Edit, Trash2, Check } from 'lucide-react';

export default function Tasks({ role = 'homeroom_teacher', user }) {
  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState('הכל');
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ student_id: '', student_name: '', title: '', description: '', due_date: today, priority: 'בינונית', status: 'לביצוע', category: 'כללי' });
  const classId = getUserApprovedClassId(user, CLASS_ID);

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    setLoading(true);
    const [tks, sts] = await Promise.all([
      base44.entities.Task.filter({ class_id: classId }),
      base44.entities.Student.filter({ class_id: classId }),
    ]);
    setTasks(tks.sort((a,b) => a.due_date?.localeCompare(b.due_date || '') || 0));
    setStudents(sts);
    setLoading(false);
  }

  function openAdd() { setForm({ student_id: 'none', student_name: '', title: '', description: '', due_date: today, priority: 'בינונית', status: 'לביצוע', category: 'כללי' }); setEditTask(null); setShowForm(true); }
  function openEdit(t) { setForm({ ...t, student_id: t.student_id || 'none' }); setEditTask(t); setShowForm(true); }
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.title) { toast.error('כותרת היא שדה חובה'); return; }
    const student = form.student_id !== 'none' ? students.find(s => s.id === form.student_id) : null;
    const data = { ...form, student_id: student?.id || '', student_name: student?.full_name || '', class_id: classId };
    try {
      if (editTask) { await base44.entities.Task.update(editTask.id, data); toast.success('עודכן'); }
      else { await base44.entities.Task.create(data); toast.success('משימה נוספה!'); }
      setShowForm(false); loadData();
    } catch { toast.error('שגיאה'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('למחוק?')) return;
    await base44.entities.Task.delete(id);
    toast.success('נמחק'); loadData();
  }

  async function toggleDone(task) {
    const newStatus = task.status === 'בוצע' ? 'לביצוע' : 'בוצע';
    await base44.entities.Task.update(task.id, { status: newStatus });
    loadData();
  }

  const filtered = statusFilter === 'הכל' ? tasks : tasks.filter(t => t.status === statusFilter);
  const formatDate = (d) => { if (!d) return '—'; const dt = new Date(d); return `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear()}`; };
  const isOverdue = (t) => t.due_date && t.due_date < today && t.status !== 'בוצע';

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader title="משימות" subtitle={`${tasks.filter(t => t.status !== 'בוצע').length} פתוחות`}
        actions={<Button size="sm" className="gap-2" onClick={openAdd}><Plus className="w-4 h-4"/>משימה חדשה</Button>} />

      <div className="flex gap-2 flex-wrap">
        {['הכל', 'לביצוע', 'בטיפול', 'בוצע'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${statusFilter === s ? 'bg-primary text-white border-primary' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>
            {s} {s !== 'הכל' && `(${tasks.filter(t => t.status === s).length})`}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>
      : filtered.length === 0
        ? <EmptyState icon={CheckSquare} title="אין משימות" description="הוסף משימה ראשונה" action={<Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4"/>הוסף משימה</Button>} />
        : <div className="space-y-2">
          {filtered.map((task, i) => (
            <motion.div key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className={`p-3.5 transition-all ${task.status === 'בוצע' ? 'opacity-50' : ''} ${isOverdue(task) ? 'border-red-200 dark:border-red-800/50' : ''}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleDone(task)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${task.status === 'בוצע' ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground hover:border-primary'}`}>
                    {task.status === 'בוצע' && <Check className="w-3.5 h-3.5 text-white"/>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${task.status === 'בוצע' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                      <StatusBadge status={task.priority} />
                      {isOverdue(task) && <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium">באיחור!</span>}
                    </div>
                    {task.student_name && <p className="text-xs text-muted-foreground mt-0.5">👤 {task.student_name}</p>}
                    {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                    <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>📅 יעד: {formatDate(task.due_date)}</span>
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(task)}><Edit className="w-3.5 h-3.5"/></Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500" onClick={() => handleDelete(task.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      }

      {showForm && (
        <Dialog open onOpenChange={() => setShowForm(false)}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader><DialogTitle>{editTask ? 'עריכת משימה' : 'משימה חדשה'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1"><Label>כותרת *</Label><Input value={form.title} onChange={e => set('title', e.target.value)}/></div>
              <div className="space-y-1">
                <Label>תלמיד (אופציונלי)</Label>
                <Select value={form.student_id} onValueChange={v => set('student_id', v)}>
                  <SelectTrigger><SelectValue placeholder="בחר תלמיד"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">כיתה – כללי</SelectItem>
                    {students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>תיאור</Label><Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>תאריך יעד</Label><Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}/></div>
                <div className="space-y-1">
                  <Label>עדיפות</Label>
                  <Select value={form.priority} onValueChange={v => set('priority', v)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{['נמוכה', 'בינונית', 'גבוהה', 'דחופה'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>סטטוס</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{['לביצוע', 'בטיפול', 'בוצע'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
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