import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AudienceEditor from './AudienceEditor';
import { EVENT_TYPES } from './eventConstants';

const empty = { title: '', subject: '', type: 'אירוע שכבתי', date: '', time: '', end_time: '', class_or_grade: '', teacher: '', material: '', notes: '', audience_scope: 'grade', audience_grades: ['יב'], audience_classes: [], audience_subjects: [], audience_tracks: [], audience_group_label: '' };

export default function EventFormDialog({ open, onOpenChange, event, onSave }) {
  const [form, setForm] = useState(empty);
  useEffect(() => setForm(event ? { ...empty, ...event } : empty), [event, open]);
  const update = patch => setForm(prev => ({ ...prev, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-auto max-w-[calc(100vw-2rem)] sm:max-w-2xl overflow-x-hidden" dir="rtl">
        <DialogHeader><DialogTitle>{event ? 'עריכת אירוע' : 'הוספת אירוע'}</DialogTitle></DialogHeader>
        <div className="space-y-4 text-right">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="כותרת *"><Input value={form.title} onChange={e => update({ title: e.target.value })} /></Field>
            <Field label="סוג"><Select value={form.type} onValueChange={type => update({ type })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent collisionPadding={16} className="max-w-[calc(100vw-2rem)]">{EVENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="תאריך *"><Input type="date" value={form.date} onChange={e => update({ date: e.target.value })} /></Field>
            <Field label="שעת התחלה"><Input type="time" value={form.time} onChange={e => update({ time: e.target.value })} /></Field>
            <Field label="שעת סיום"><Input type="time" value={form.end_time} onChange={e => update({ end_time: e.target.value })} /></Field>
            <Field label="מקצוע/תחום"><Input value={form.subject} onChange={e => update({ subject: e.target.value })} /></Field>
            <Field label="מורה/אחראי"><Input value={form.teacher} onChange={e => update({ teacher: e.target.value })} /></Field>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3"><AudienceEditor value={form} onChange={setForm} /></div>
          <Field label="חומר / הכנה"><Textarea value={form.material} onChange={e => update({ material: e.target.value })} rows={3} /></Field>
          <Field label="הערות"><Textarea value={form.notes} onChange={e => update({ notes: e.target.value })} rows={3} /></Field>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button><Button onClick={() => onSave(form)} disabled={!form.title || !form.date}>שמור</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}