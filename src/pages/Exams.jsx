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
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import { BookOpen, Plus, Edit, Trash2, Calendar, Clock, User, AlertTriangle, FileUp } from 'lucide-react';
import ImportExamsDialog from '@/components/exams/ImportExamsDialog';

const SUBJECTS = ['מתמטיקה', 'עברית', 'ספרות', 'אנגלית', 'היסטוריה', 'גיאוגרפיה', 'פיזיקה', 'כימיה', 'ביולוגיה', 'חינוך גופני', 'אמנות', 'אחר'];
const TYPES = ['מבחן', 'בחן', 'עבודה', 'פרויקט', 'הגשה'];

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editExam, setEditExam] = useState(null);
  const [form, setForm] = useState({ title: '', subject: '', type: 'מבחן', date: '', time: '', teacher: '', material: '', notes: '' });

  useEffect(() => { loadExams(); }, []);

  async function loadExams() {
    setLoading(true);
    const data = await base44.entities.Exam.filter({ class_id: CLASS_ID });
    setExams(data.sort((a,b) => a.date.localeCompare(b.date)));
    setLoading(false);
  }

  const today = new Date().toISOString().split('T')[0];

  function openAdd() { setForm({ title: '', subject: '', type: 'מבחן', date: '', time: '', teacher: '', material: '', notes: '' }); setEditExam(null); setShowForm(true); }
  function openEdit(exam) { setForm({ ...exam }); setEditExam(exam); setShowForm(true); }

  async function handleSave() {
    if (!form.title || !form.subject || !form.date) { toast.error('כותרת, מקצוע ותאריך הם שדות חובה'); return; }
    try {
      if (editExam) { await base44.entities.Exam.update(editExam.id, { ...form, class_id: CLASS_ID }); toast.success('מבחן עודכן'); }
      else { await base44.entities.Exam.create({ ...form, class_id: CLASS_ID }); toast.success('מבחן נוסף!'); }
      setShowForm(false);
      loadExams();
    } catch { toast.error('שגיאה בשמירה'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('למחוק את המבחן?')) return;
    await base44.entities.DisciplineEvent.delete && base44.entities.Exam.delete(id);
    toast.success('נמחק');
    loadExams();
  }

  // Check for exam overload (more than 3 in a week)
  const getWeekKey = (date) => { const d = new Date(date); const day = d.getDay(); const mon = new Date(d); mon.setDate(d.getDate() - day); return mon.toISOString().split('T')[0]; };
  const weekCounts = {};
  exams.filter(e => e.date >= today).forEach(e => { const k = getWeekKey(e.date); weekCounts[k] = (weekCounts[k] || 0) + 1; });
  const overloadWeeks = Object.entries(weekCounts).filter(([, v]) => v >= 3).map(([k]) => k);

  const upcoming = exams.filter(e => e.date >= today);
  const past = exams.filter(e => e.date < today);

  const formatDate = (d) => {
    const date = new Date(d);
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return `${days[date.getDay()]}, ${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}`;
  };

  const ExamCard = ({ exam }) => {
    const weekKey = getWeekKey(exam.date);
    const isOverloaded = overloadWeeks.includes(weekKey);
    const isPast = exam.date < today;
    return (
      <Card className={`p-4 hover:shadow-sm transition-all ${isOverloaded && !isPast ? 'border-amber-300 dark:border-amber-700' : ''} ${isPast ? 'opacity-60' : ''}`}>
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isPast ? 'bg-slate-100 text-slate-500' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'}`}>
            <span className="text-sm font-bold">{new Date(exam.date).getDate()}</span>
            <span className="text-[9px]">{['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'][new Date(exam.date).getMonth()]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{exam.title}</h3>
              {isOverloaded && !isPast && <AlertTriangle className="w-4 h-4 text-amber-500" title="עומס מבחנים בשבוע זה!" />}
            </div>
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{exam.subject}</span>
              {exam.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{exam.time}</span>}
              {exam.teacher && <span className="flex items-center gap-1"><User className="w-3 h-3" />{exam.teacher}</span>}
            </div>
            {exam.material && <p className="text-xs text-muted-foreground mt-1.5 bg-muted/50 rounded px-2 py-1">📚 {exam.material}</p>}
            {exam.notes && <p className="text-xs text-muted-foreground mt-1">💬 {exam.notes}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={exam.type} />
            {!isPast && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(exam)}><Edit className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500" onClick={() => handleDelete(exam.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader
        title="לוח מבחנים"
        subtitle="מבחנים, בחנים, עבודות ופרויקטים"
        actions={
          <>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowImport(true)}>
              <FileUp className="w-4 h-4" />ייבוא קובץ
            </Button>
            <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="w-4 h-4" />הוסף</Button>
          </>
        }
      />

      {overloadWeeks.length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">עומס מבחנים!</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">יש שבוע עם 3 מבחנים או יותר. שקול פיזור מחדש.</p>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>
      : upcoming.length === 0 && past.length === 0
        ? <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/20 rounded-3xl flex items-center justify-center mb-5">
              <BookOpen className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">אין מבחנים עדיין</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">הוסף מבחנים, בחנים, עבודות ופרויקטים לכיתה, כך שהתלמידים יוכלו להתכונן בזמן.</p>
            <Button onClick={openAdd} size="lg" className="gap-2 px-8">
              <Plus className="w-5 h-5"/>הוסף מבחן ראשון
            </Button>
          </div>
        : <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />קרובים ({upcoming.length})
              </h2>
              <div className="space-y-2">
                {upcoming.map(exam => <motion.div key={exam.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}><ExamCard exam={exam} /></motion.div>)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">עבר ({past.length})</h2>
              <div className="space-y-2">
                {past.slice(0, 5).map(exam => <ExamCard key={exam.id} exam={exam} />)}
              </div>
            </div>
          )}
        </>
      }

      {showImport && (
        <ImportExamsDialog
          open={showImport}
          onOpenChange={setShowImport}
          onImported={loadExams}
          classId={CLASS_ID}
        />
      )}

      {showForm && (
        <Dialog open onOpenChange={() => setShowForm(false)}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader><DialogTitle>{editExam ? 'עריכת מבחן' : 'הוספת מבחן חדש'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1"><Label>כותרת *</Label><Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>מקצוע *</Label>
                  <Select value={form.subject} onValueChange={v => setForm(p => ({...p, subject: v}))}>
                    <SelectTrigger><SelectValue placeholder="בחר"/></SelectTrigger>
                    <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>סוג</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({...p, type: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>תאריך *</Label><Input type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
                <div className="space-y-1"><Label>שעה</Label><Input type="time" value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} /></div>
              </div>
              <div className="space-y-1"><Label>מורה</Label><Input value={form.teacher} onChange={e => setForm(p => ({...p, teacher: e.target.value}))} /></div>
              <div className="space-y-1"><Label>חומר למבחן</Label><Textarea value={form.material} onChange={e => setForm(p => ({...p, material: e.target.value}))} rows={2} /></div>
              <div className="space-y-1"><Label>הערות</Label><Textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} rows={2} /></div>
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