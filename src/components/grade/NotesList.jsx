import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Star, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatStudentName, compareStudentsByLastName } from '@/lib/studentName';
import { formatSchoolDate, getLocalDateString } from '@/lib/dateUtils';

const CATEGORIES = ['כללי', 'אישי', 'אקדמי', 'חברתי', 'רגשי'];
const CAT_COLORS = {
  'כללי': 'bg-slate-100 text-slate-700',
  'אישי': 'bg-purple-100 text-purple-700',
  'אקדמי': 'bg-blue-100 text-blue-700',
  'חברתי': 'bg-green-100 text-green-700',
  'רגשי': 'bg-pink-100 text-pink-700',
};

export default function NotesList({ notes, onRefresh, user, role, classId, students }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ content: '', category: 'כללי', student_id: '' });
  const [saving, setSaving] = useState(false);

  const sorted = [...notes].sort((a, b) => b.date?.localeCompare(a.date));
  const selectedStudent = students.find(s => s.id === form.student_id);

  async function handleSave() {
    if (!form.student_id || !form.content) { toast.error('יש לבחור תלמיד ולהזין הערה'); return; }
    setSaving(true);
    const today = getLocalDateString();
    await base44.entities.TeacherNote.create({
      student_id: form.student_id,
      student_name: selectedStudent?.full_name || '',
      class_id: classId,
      date: today,
      content: `[${user?.full_name || user?.email} · ${formatSchoolDate(new Date(), { dateStyle: 'short', timeStyle: 'short' })}]\n${form.content}`,
      category: form.category,
      is_private: true,
    });
    toast.success('הערה נשמרה');
    setForm({ content: '', category: 'כללי', student_id: '' });
    setShowForm(false);
    setSaving(false);
    onRefresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm(v => !v)}>
          <Plus className="w-4 h-4" /> הערה חדשה
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">הוספת הערת מחנך/רכז</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>תלמיד *</Label>
                <Select value={form.student_id} onValueChange={v => setForm(p => ({ ...p, student_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="בחר תלמיד" /></SelectTrigger>
                  <SelectContent>{[...students].sort(compareStudentsByLastName).map(s => <SelectItem key={s.id} value={s.id}>{formatStudentName(s.full_name)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>קטגוריה</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>תוכן ההערה *</Label>
              <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} className="h-24 text-sm" placeholder="הערה על התלמיד..." />
            </div>
            <div className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              יישמר עם: <span className="font-medium">{user?.full_name || user?.email}</span> · {formatSchoolDate(new Date(), { dateStyle: 'short', timeStyle: 'short' })}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'שומר...' : 'שמור'}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)} className="flex-1">ביטול</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>אין הערות מחנך</p>
        </div>
      ) : sorted.map(n => (
        <Card key={n.id}>
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold flex-shrink-0 mt-0.5">
                {n.student_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{formatStudentName(n.student_name)}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[n.category] || CAT_COLORS['כללי']}`}>
                    {n.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{n.date}</p>
                <p className="text-sm mt-1 whitespace-pre-line">{n.content}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
