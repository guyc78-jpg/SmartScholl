import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageSquare, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatStudentName, compareStudentsByLastName } from '@/lib/studentName';
import { formatSchoolDate, getLocalDateString } from '@/lib/dateUtils';

const TYPES = ['שיחה טלפונית', 'פגישה', 'מייל', 'הודעה', 'שיחת זום'];
const WITH_WHOM = ['הורה 1', 'הורה 2', 'תלמיד', 'מורה', 'יועצת', 'אחר'];

export default function CommunicationsList({ comms, onRefresh, user, role, classId, students }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: '', with_whom: '', summary: '', follow_up: '', student_id: '' });
  const [saving, setSaving] = useState(false);

  const sorted = [...comms].sort((a, b) => b.date?.localeCompare(a.date));
  const selectedStudent = students.find(s => s.id === form.student_id);

  async function handleSave() {
    if (!form.student_id || !form.type || !form.with_whom || !form.summary) {
      toast.error('יש למלא שם תלמיד, סוג, עם מי וסיכום'); return;
    }
    setSaving(true);
    const today = getLocalDateString();
    await base44.entities.Communication.create({
      student_id: form.student_id,
      student_name: selectedStudent?.full_name || '',
      class_id: classId,
      date: today,
      type: form.type,
      with_whom: form.with_whom,
      summary: `[${user?.full_name || user?.email} · ${formatSchoolDate(new Date(), { dateStyle: 'short', timeStyle: 'short' })}]\n${form.summary}`,
      follow_up: form.follow_up,
    });
    toast.success('שיחה נשמרה');
    setForm({ type: '', with_whom: '', summary: '', follow_up: '', student_id: '' });
    setShowForm(false);
    setSaving(false);
    onRefresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm(v => !v)}>
          <Plus className="w-4 h-4" /> תיעוד שיחה
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">תיעוד שיחה חדשה</p>
            <div className="space-y-1">
              <Label>תלמיד *</Label>
              <Select value={form.student_id} onValueChange={v => setForm(p => ({ ...p, student_id: v }))}>
                <SelectTrigger><SelectValue placeholder="בחר תלמיד" /></SelectTrigger>
                <SelectContent>
                  {[...students].sort(compareStudentsByLastName).map(s => <SelectItem key={s.id} value={s.id}>{formatStudentName(s.full_name)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>סוג תקשורת *</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>עם מי *</Label>
                <Select value={form.with_whom} onValueChange={v => setForm(p => ({ ...p, with_whom: v }))}>
                  <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                  <SelectContent>{WITH_WHOM.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>סיכום *</Label>
              <Textarea value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} className="h-20 text-sm" placeholder="תוכן השיחה..." />
            </div>
            <div className="space-y-1">
              <Label>פעולת המשך</Label>
              <Input value={form.follow_up} onChange={e => setForm(p => ({ ...p, follow_up: e.target.value }))} placeholder="למשל: לבדוק שוב בעוד שבוע" />
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
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>אין שיחות מתועדות</p>
        </div>
      ) : sorted.map(c => (
        <Card key={c.id}>
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold flex-shrink-0 mt-0.5">
                {c.student_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{formatStudentName(c.student_name)}</p>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{c.type}</span>
                  <span className="text-xs text-muted-foreground">{c.with_whom}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{c.date}</p>
                <p className="text-sm mt-1 whitespace-pre-line">{c.summary}</p>
                {c.follow_up && <p className="text-xs text-blue-600 mt-1">→ {c.follow_up}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
