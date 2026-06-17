import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatStudentName, compareStudentsByLastName } from '@/lib/studentName';

const CONVERSATION_TYPES = [
  'שיחה אישית עם תלמיד',
  'שיחת הורים',
  'פגישה טיפולית',
  'תזכורת טיפולית',
];

export default function ScheduledConversationForm({ open, onOpenChange, students, initial, onSave }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState(
    initial || { title: '', conversation_type: 'שיחת הורים', date: today, time: '', student_id: '', participants: '', notes: '' }
  );
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.title.trim() || !form.date || !form.time) return;
    setSaving(true);
    try {
      await onSave(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">{initial ? 'עריכת שיחה מתוכננת' : 'שיחה מתוכננת חדשה'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-right" dir="rtl">
          <div className="space-y-1">
            <Label>כותרת *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="לדוגמה: שיחה עם הורי דניאל" />
          </div>

          <div className="space-y-1">
            <Label>סוג שיחה *</Label>
            <Select value={form.conversation_type} onValueChange={v => set('conversation_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONVERSATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>תאריך *</Label><Input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
            <div className="space-y-1"><Label>שעה *</Label><Input type="time" value={form.time} onChange={e => set('time', e.target.value)} /></div>
          </div>

          <div className="space-y-1">
            <Label>תלמיד/ה</Label>
            <Select value={form.student_id || 'none'} onValueChange={v => set('student_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="ללא שיוך לתלמיד/ה" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא שיוך</SelectItem>
                {[...(students || [])].sort(compareStudentsByLastName).map(s => (
                  <SelectItem key={s.id} value={s.id}>{formatStudentName(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>משתתפים</Label>
            <Input value={form.participants} onChange={e => set('participants', e.target.value)} placeholder="מי משתתף בשיחה?" />
          </div>

          <div className="space-y-1">
            <Label>הערות</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="פרטים נוספים..." className="resize-none" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.date || !form.time} className="flex-1">
              {saving ? 'שומר...' : 'שמור'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">ביטול</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}