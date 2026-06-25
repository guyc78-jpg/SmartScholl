import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { getStudentClassId } from '@/lib/studentProfile';
import { getUserApprovedClassId } from '@/lib/schoolStructure';
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
import { Megaphone, Plus, Edit, Trash2, Eye, Check } from 'lucide-react';
import useDeleteConfirm from '@/hooks/useDeleteConfirm';

export default function Announcements({ role = 'homeroom_teacher', user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editAnn, setEditAnn] = useState(null);
  const [typeFilter, setTypeFilter] = useState('הכל');
  const today = new Date().toISOString().split('T')[0];
  const classId = role === 'student' ? getStudentClassId(user, CLASS_ID) : getUserApprovedClassId(user, CLASS_ID);
  const [form, setForm] = useState({ title: '', content: '', type: 'כיתתית', requires_confirmation: false });
  const [readCounts, setReadCounts] = useState({});
  const { confirmDelete, DeleteConfirm } = useDeleteConfirm();

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    setLoading(true);
    const data = await base44.entities.Announcement.filter({ class_id: classId });
    const sorted = data.sort((a,b) => (b.published_at || '').localeCompare(a.published_at || ''));
    setAnnouncements(sorted);
    // Load read counts for important announcements
    const confirmsNeeded = sorted.filter(a => a.requires_confirmation);
    const counts = {};
    for (const ann of confirmsNeeded) {
      const reads = await base44.entities.AnnouncementRead.filter({ announcement_id: ann.id });
      counts[ann.id] = reads.length;
    }
    setReadCounts(counts);
    setLoading(false);
  }

  function openAdd() { setForm({ title: '', content: '', type: 'כיתתית', requires_confirmation: false }); setEditAnn(null); setShowForm(true); }
  function openEdit(a) { setForm({ title: a.title, content: a.content, type: a.type, requires_confirmation: a.requires_confirmation }); setEditAnn(a); setShowForm(true); }
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.title || !form.content) { toast.error('כותרת ותוכן הם שדות חובה'); return; }
    const data = { ...form, class_id: classId, published_at: today, is_published: true };
    try {
      if (editAnn) { await base44.entities.Announcement.update(editAnn.id, data); toast.success('עודכן'); }
      else { await base44.entities.Announcement.create(data); toast.success('הודעה פורסמה!'); }
      setShowForm(false); loadData();
    } catch { toast.error('שגיאה'); }
  }

  async function handleDelete(id) {
    const approved = await confirmDelete({
      title: 'למחוק את ההודעה?',
      description: 'ההודעה תימחק מהרשימה ולא ניתן יהיה לשחזר אותה.',
    });
    if (!approved) return;
    await base44.entities.Announcement.delete(id);
    toast.success('נמחק'); loadData();
  }

  const filtered = typeFilter === 'הכל' ? announcements : announcements.filter(a => a.type === typeFilter);
  const formatDate = (d) => { if (!d) return ''; const dt = new Date(d); return `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear()}`; };

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader title="הודעות" subtitle="הודעות לכיתה ולהורים"
        actions={role === 'homeroom_teacher' ? <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="w-4 h-4"/>הודעה חדשה</Button> : null} />

      <div className="flex gap-2 flex-wrap">
        {['הכל', 'חשובה', 'כיתתית', 'אישית', 'להורים'].map(s => (
          <button key={s} onClick={() => setTypeFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${typeFilter === s ? 'bg-primary text-white border-primary' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>
      : filtered.length === 0
        ? <EmptyState icon={Megaphone} title="אין הודעות" description="פרסם הודעה ראשונה לכיתה"
            action={role === 'homeroom_teacher' ? <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4"/>הודעה חדשה</Button> : null} />
        : <div className="space-y-3">
          {filtered.map((ann, i) => (
            <motion.div key={ann.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className={`p-4 ${ann.type === 'חשובה' ? 'border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <StatusBadge status={ann.type} />
                      {ann.requires_confirmation && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                          דרוש אישור קריאה
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground mr-auto">{formatDate(ann.published_at)}</span>
                    </div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">{ann.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{ann.content}</p>
                    {ann.requires_confirmation && readCounts[ann.id] !== undefined && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <Eye className="w-3.5 h-3.5"/>
                        <span>{readCounts[ann.id]} תלמידים קראו</span>
                      </div>
                    )}
                  </div>
                  {role === 'homeroom_teacher' && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(ann)}><Edit className="w-3.5 h-3.5"/></Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500" onClick={() => handleDelete(ann.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      }

      {showForm && (
        <Dialog open onOpenChange={() => setShowForm(false)}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader><DialogTitle>{editAnn ? 'עריכת הודעה' : 'הודעה חדשה'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1"><Label>כותרת *</Label><Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="כותרת ההודעה"/></div>
              <div className="space-y-1">
                <Label>סוג הודעה</Label>
                <Select value={form.type} onValueChange={v => set('type', v)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{['כיתתית', 'חשובה', 'אישית', 'להורים'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>תוכן *</Label><Textarea value={form.content} onChange={e => set('content', e.target.value)} rows={5} placeholder="תוכן ההודעה..."/></div>
              <div className="flex items-center gap-2">
                <Checkbox id="confirm" checked={form.requires_confirmation} onCheckedChange={v => set('requires_confirmation', v)}/>
                <Label htmlFor="confirm">דרוש אישור קריאה מתלמידים</Label>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSave} className="flex-1">פרסם</Button>
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