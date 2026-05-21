import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

const SUBJECTS = [
  'מתמטיקה','עברית','ספרות','אנגלית','היסטוריה','גיאוגרפיה',
  'פיזיקה','כימיה','ביולוגיה','חינוך גופני','אמנות','שעת חינוך',
  'תנ"ך','מחשבים','מדעים','אזרחות','אחר'
];

// Cell editor — add / edit / delete a single ScheduleSlot
export default function CellEditorDialog({ open, onOpenChange, slot, day, period, periodTime, onSave, onDelete }) {
  const isEdit = !!slot?.id;
  const [form, setForm] = useState({ subject: '', teacher: '', room: '', group: '', notes: '' });

  useEffect(() => {
    if (open) {
      setForm({
        subject: slot?.subject || '',
        teacher: slot?.teacher || '',
        room: slot?.room || '',
        // "group" stored in notes prefix to avoid schema change: "[קבוצה: X] ..."
        group: extractGroup(slot?.notes),
        notes: stripGroup(slot?.notes),
      });
    }
  }, [open, slot]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function handleSubmit() {
    const combinedNotes = form.group
      ? `[קבוצה: ${form.group}]${form.notes ? ' ' + form.notes : ''}`
      : (form.notes || '');
    onSave({
      subject: form.subject,
      teacher: form.teacher,
      room: form.room,
      notes: combinedNotes,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">
            {isEdit ? 'עריכת שיעור' : 'הוספת שיעור'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground text-right">
            יום {day} · שיעור {period}{periodTime ? ` · ${periodTime}` : ''}
          </p>
        </DialogHeader>

        <div className="space-y-3 text-right">
          <div className="space-y-1">
            <Label className="text-xs">מקצוע *</Label>
            <Select value={form.subject} onValueChange={v => set('subject', v)}>
              <SelectTrigger><SelectValue placeholder="בחר מקצוע" /></SelectTrigger>
              <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">מורה</Label>
              <Input value={form.teacher} onChange={e => set('teacher', e.target.value)} placeholder="שם המורה" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">חדר</Label>
              <Input value={form.room} onChange={e => set('room', e.target.value)} placeholder="מספר חדר" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">קבוצה</Label>
            <Input value={form.group} onChange={e => set('group', e.target.value)} placeholder="לדוגמה: קבוצה א׳ / 5 יח׳" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">הערות</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="חופשי" />
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          {isEdit ? (
            <Button variant="ghost" className="text-destructive hover:text-destructive gap-2" onClick={() => onDelete(slot.id)}>
              <Trash2 className="w-4 h-4" /> מחק
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
            <Button onClick={handleSubmit} disabled={!form.subject}>{isEdit ? 'עדכן' : 'הוסף'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function extractGroup(notes = '') {
  if (!notes) return '';
  const m = notes.match(/^\[קבוצה: ([^\]]+)\]/);
  return m ? m[1] : '';
}
function stripGroup(notes = '') {
  if (!notes) return '';
  return notes.replace(/^\[קבוצה: [^\]]+\]\s*/, '');
}