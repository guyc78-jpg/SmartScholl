import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AudienceEditor from './AudienceEditor';
import { EVENT_TYPES } from './eventConstants';

const empty = { title: '', subject: '', type: 'אירוע שכבתי', custom_event_type: '', date: '', time: '', end_time: '', class_or_grade: '', teacher: '', material: '', notes: '', audience_scope: 'grade', audience_grades: ['יב'], audience_classes: [], audience_subjects: [], audience_tracks: [], audience_group_label: '' };

export default function EventFormDialog({ open, onOpenChange, event, onSave }) {
  const [form, setForm] = useState(empty);
  useEffect(() => {
    const nextForm = event ? { ...empty, ...event } : empty;
    setForm(['school', 'grade', 'class'].includes(nextForm.audience_scope) ? nextForm : { ...nextForm, audience_scope: 'grade' });
  }, [event, open]);
  const update = patch => setForm(prev => ({ ...prev, ...patch }));
  const isOtherType = form.type === 'אחר';
  const canSave = form.title && form.date && (!isOtherType || form.custom_event_type?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-lg overflow-x-hidden p-4 sm:p-5" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">{event ? 'עריכת אירוע' : 'הוספת אירוע'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-right" dir="rtl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="כותרת *" className="sm:col-span-2"><Input value={form.title} onChange={e => update({ title: e.target.value })} className="text-right" /></Field>
            <Field label="סוג"><Select value={form.type} onValueChange={type => update({ type, custom_event_type: type === 'אחר' ? form.custom_event_type : '' })}><SelectTrigger className="text-right"><SelectValue /></SelectTrigger><SelectContent dir="rtl" align="end" collisionPadding={16} className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] overflow-x-hidden text-right">{EVENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="תאריך *"><Input type="date" value={form.date} onChange={e => update({ date: e.target.value })} className="text-right" /></Field>
            {isOtherType && <Field label="סוג אירוע חופשי *" className="sm:col-span-2"><Input value={form.custom_event_type || ''} onChange={e => update({ custom_event_type: e.target.value })} placeholder="לדוגמה: ערב מגמה" required className="text-right" /></Field>}
            <Field label="שעת התחלה"><Input type="time" value={form.time} onChange={e => update({ time: e.target.value })} className="text-right" /></Field>
            <Field label="שעת סיום"><Input type="time" value={form.end_time} onChange={e => update({ end_time: e.target.value })} className="text-right" /></Field>
            <Field label="מורה/אחראי" className="sm:col-span-2"><Input value={form.teacher} onChange={e => update({ teacher: e.target.value })} className="text-right" /></Field>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3"><AudienceEditor value={form} onChange={setForm} allowedScopes={['school', 'grade', 'class']} /></div>
          <Field label="הערות"><Textarea value={form.notes} onChange={e => update({ notes: e.target.value })} rows={2} className="text-right resize-none" /></Field>
          <div className="flex justify-start gap-2 pt-1" dir="rtl">
            <Button onClick={() => onSave({ ...form, custom_event_type: form.custom_event_type?.trim() || '' })} disabled={!canSave}>שמור</Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className = '' }) {
  return <div className={`space-y-1 text-right ${className}`} dir="rtl"><Label className="text-xs text-right block">{label}</Label>{children}</div>;
}