import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CheckSquare, Plus, Check } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from 'sonner';

const PRIORITIES = ['נמוכה', 'בינונית', 'גבוהה', 'דחופה'];
const CATEGORIES = ['נוכחות', 'משמעת', 'תפקוד', 'הורים', 'כללי'];

export default function TasksList({ tasks, onRefresh, user, role, classId, students }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', priority: 'בינונית', category: 'כללי', student_id: '' });
  const [saving, setSaving] = useState(false);

  const open = tasks.filter(t => t.status !== 'בוצע').sort((a, b) => a.due_date?.localeCompare(b.due_date));
  const done = tasks.filter(t => t.status === 'בוצע');
  const selectedStudent = students.find(s => s.id === form.student_id);

  async function handleSave() {
    if (!form.title || !form.due_date) { toast.error('יש להזין כותרת ותאריך יעד'); return; }
    setSaving(true);
    await base44.entities.Task.create({
      class_id: classId,
      student_id: form.student_id || null,
      student_name: selectedStudent?.full_name || '',
      title: form.title,
      description: `[נוצר ע"י ${user?.full_name || user?.email} · ${new Date().toLocaleString('he-IL')}]\n${form.description}`,
      due_date: form.due_date,
      priority: form.priority,
      category: form.category,
      status: 'לביצוע',
    });
    toast.success('משימה נוצרה');
    setForm({ title: '', description: '', due_date: '', priority: 'בינונית', category: 'כללי', student_id: '' });
    setShowForm(false);
    setSaving(false);
    onRefresh();
  }

  async function handleMarkDone(task) {
    await base44.entities.Task.update(task.id, { status: 'בוצע' });
    toast.success('משימה הושלמה');
    onRefresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm(v => !v)}>
          <Plus className="w-4 h-4" /> משימה חדשה
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">הוספת משימה טיפול</p>
            <div className="space-y-1">
              <Label>כותרת *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="למשל: שיחה עם הורי יונתן" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>תלמיד (אופציונלי)</Label>
                <Select value={form.student_id} onValueChange={v => setForm(p => ({ ...p, student_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="כיתתי" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>כיתתי</SelectItem>
                    {students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>עדיפות</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>קטגוריה</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>תאריך יעד *</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>תיאור</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="h-16 text-sm" placeholder="פרטים נוספים..." />
            </div>
            <div className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              יישמר עם: <span className="font-medium">{user?.full_name || user?.email}</span> · {new Date().toLocaleString('he-IL')}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'שומר...' : 'שמור'}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)} className="flex-1">ביטול</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {open.length === 0 && done.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <CheckSquare className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
          <p className="font-medium text-emerald-600">אין משימות פתוחות 🎉</p>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">פתוחות ({open.length})</p>
              {open.map(t => (
                <Card key={t.id}>
                  <CardContent className="p-3 flex items-start gap-3">
                    <button
                      onClick={() => handleMarkDone(t)}
                      className="w-5 h-5 rounded border-2 border-muted-foreground/40 hover:border-emerald-500 hover:bg-emerald-50 transition-colors flex-shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{t.title}</p>
                        <StatusBadge status={t.priority} />
                      </div>
                      {t.student_name && <p className="text-xs text-muted-foreground">{t.student_name}</p>}
                      {t.description && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line line-clamp-2">{t.description}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">יעד: {t.due_date}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">הושלמו ({done.length})</p>
              {done.slice(0, 3).map(t => (
                <Card key={t.id} className="opacity-60">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <p className="text-sm line-through text-muted-foreground">{t.title}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}