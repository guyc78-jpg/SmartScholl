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
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import { MessageSquare, Plus, Edit, Trash2, Phone, Mail, Video } from 'lucide-react';
import { formatStudentName, compareStudentsByLastName } from '@/lib/studentName';
import { useAuth } from '@/lib/AuthContext';
import { getUserHomeroomClassId, getUserApprovedClassId } from '@/lib/schoolStructure';
import useDeleteConfirm from '@/hooks/useDeleteConfirm';

const typeIcons = { 'שיחה טלפונית': Phone, 'פגישה': MessageSquare, 'מייל': Mail, 'הודעה': MessageSquare, 'שיחת זום': Video };

export default function Communications({ role = 'homeroom_teacher' }) {
  const { user } = useAuth();
  const classId = role === 'coordinator' ? getUserHomeroomClassId(user, CLASS_ID) : getUserApprovedClassId(user, CLASS_ID);
  const [comms, setComms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editComm, setEditComm] = useState(null);
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ student_id: '', date: today, type: 'שיחה טלפונית', with_whom: 'הורה 1', summary: '', follow_up: '', follow_up_date: '' });
  const { confirmDelete, DeleteConfirm } = useDeleteConfirm();

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    setLoading(true);
    const [cms, sts] = await Promise.all([
      base44.entities.Communication.filter({ class_id: classId }),
      base44.entities.Student.filter({ class_id: classId }),
    ]);
    setComms(cms.sort((a,b) => b.date.localeCompare(a.date)));
    setStudents(sts);
    setLoading(false);
  }

  function openAdd() { setForm({ student_id: '', date: today, type: 'שיחה טלפונית', with_whom: 'הורה 1', summary: '', follow_up: '', follow_up_date: '' }); setEditComm(null); setShowForm(true); }
  function openEdit(c) { setForm({ ...c }); setEditComm(c); setShowForm(true); }
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.student_id || !form.summary) { toast.error('יש לבחור תלמיד ולמלא סיכום'); return; }
    const student = students.find(s => s.id === form.student_id);
    const data = { ...form, student_name: student ? formatStudentName(student) : '', class_id: classId };
    try {
      if (editComm) { await base44.entities.Communication.update(editComm.id, data); toast.success('עודכן'); }
      else { await base44.entities.Communication.create(data); toast.success('שיחה תועדה!'); }
      setShowForm(false); loadData();
    } catch { toast.error('שגיאה'); }
  }

  async function handleDelete(id) {
    const approved = await confirmDelete({
      title: 'למחוק את תיעוד התקשורת?',
      description: 'התיעוד יימחק מיומן התקשורת ולא ניתן יהיה לשחזר אותו.',
    });
    if (!approved) return;
    await base44.entities.Communication.delete(id);
    loadData();
  }

  const formatDate = (d) => { if (!d) return ''; const dt = new Date(d); return `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear()}`; };

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader title="תקשורת" subtitle="תיעוד שיחות והתקשרויות"
        actions={['admin','homeroom_teacher','coordinator'].includes(role) ? <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="w-4 h-4"/>תעד שיחה</Button> : null} />

      {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>
      : comms.length === 0
        ? <EmptyState icon={MessageSquare} title="אין תיעוד תקשורת" description="תעד שיחה ראשונה" action={<Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4"/>תעד שיחה</Button>} />
        : <div className="space-y-3">
          {comms.map((c, i) => {
            const TypeIcon = typeIcons[c.type] || MessageSquare;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{formatStudentName(c.student_name)}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{c.type}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{c.with_whom}</span>
                        <span className="text-xs text-muted-foreground mr-auto">{formatDate(c.date)}</span>
                      </div>
                      <p className="text-sm text-foreground mb-1.5">{c.summary}</p>
                      {c.follow_up && (
                        <div className="flex items-start gap-1.5 text-xs">
                          <span className="text-muted-foreground">פעולת המשך:</span>
                          <span className="text-primary">{c.follow_up}</span>
                          {c.follow_up_date && <span className="text-muted-foreground">· {formatDate(c.follow_up_date)}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(c)}><Edit className="w-3.5 h-3.5"/></Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      }

      {showForm && (
        <Dialog open onOpenChange={() => setShowForm(false)}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader><DialogTitle>{editComm ? 'עריכת תיעוד' : 'תיעוד שיחה חדשה'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>תלמיד *</Label>
                <Select value={form.student_id} onValueChange={v => set('student_id', v)}>
                  <SelectTrigger><SelectValue placeholder="בחר תלמיד"/></SelectTrigger>
                  <SelectContent>{[...students].sort(compareStudentsByLastName).map(s => <SelectItem key={s.id} value={s.id}>{formatStudentName(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>תאריך</Label><Input type="date" value={form.date} onChange={e => set('date', e.target.value)}/></div>
                <div className="space-y-1">
                  <Label>סוג</Label>
                  <Select value={form.type} onValueChange={v => set('type', v)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{['שיחה טלפונית', 'פגישה', 'מייל', 'הודעה', 'שיחת זום'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>עם מי</Label>
                <Select value={form.with_whom} onValueChange={v => set('with_whom', v)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{['הורה 1', 'הורה 2', 'תלמיד', 'מורה', 'יועצת', 'אחר'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>סיכום *</Label><Textarea value={form.summary} onChange={e => set('summary', e.target.value)} rows={3} placeholder="סכם את תוכן השיחה..."/></div>
              <div className="space-y-1"><Label>פעולת המשך</Label><Input value={form.follow_up} onChange={e => set('follow_up', e.target.value)} placeholder="מה צריך לעשות?"/></div>
              <div className="space-y-1"><Label>תאריך מעקב</Label><Input type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)}/></div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSave} className="flex-1">שמור</Button>
                <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">ביטול</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <DeleteConfirm />
    </div>
  );
}