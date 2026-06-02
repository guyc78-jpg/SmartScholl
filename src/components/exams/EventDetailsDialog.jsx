import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, MapPin, User, Users } from 'lucide-react';
import EventTypeBadge from './EventTypeBadge';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'לא התחלתי' },
  { value: 'in_progress', label: 'בלמידה' },
  { value: 'ready', label: 'מוכן/רלוונטי' },
  { value: 'done', label: 'בוצע' },
  { value: 'not_relevant', label: 'לא רלוונטי' }
];

const SCOPE_LABEL = { school: 'כל בית הספר', grade: 'שכבה', class: 'כיתה', subject: 'מקצוע', track: 'מגמה', group: 'קבוצה' };

export default function EventDetailsDialog({ event, open, onClose, canEdit, isStudent, completion, onStudentUpdate, onEdit, onDelete, extraContent }) {
  const [status, setStatus] = useState('not_started');
  const [note, setNote] = useState('');

  useEffect(() => {
    setStatus(completion?.status || 'not_started');
    setNote(completion?.personal_note || '');
  }, [completion, event?.id]);

  if (!event) return null;

  const audience = SCOPE_LABEL[event.audience_scope || 'grade'] || 'שכבה';
  const saveStudent = async (nextStatus = status) => onStudentUpdate?.({ status: nextStatus, personal_note: note });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-row-reverse justify-end"><span>{event.title}</span><EventTypeBadge type={event.type} /></DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-right">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Calendar className="w-4 h-4" />{event.date}</span>
            {event.time && <span className="flex items-center gap-2"><Clock className="w-4 h-4" />{event.time}{event.end_time ? `–${event.end_time}` : ''}</span>}
            {event.class_or_grade && <span className="flex items-center gap-2"><MapPin className="w-4 h-4" />{event.class_or_grade}</span>}
            {event.teacher && <span className="flex items-center gap-2"><User className="w-4 h-4" />{event.teacher}</span>}
            <span className="flex items-center gap-2 sm:col-span-2"><Users className="w-4 h-4" />{audience}</span>
          </div>

          {event.material && <Info title="חומר / הכנה" text={event.material} />}
          {event.notes && <Info title="הערות" text={event.notes} />}
          {extraContent}

          {isStudent && (
            <div className="border-t pt-4 space-y-3">
              <Label>הסטטוס שלי</Label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(option => (
                  <Button key={option.value} variant={status === option.value ? 'default' : 'outline'} size="sm" onClick={() => { setStatus(option.value); saveStudent(option.value); }}>
                    {option.label}
                  </Button>
                ))}
              </div>
              <Textarea value={note} onChange={e => setNote(e.target.value)} onBlur={() => saveStudent()} placeholder="הערה אישית..." rows={2} />
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2">
            {canEdit ? <div className="flex gap-2"><Button variant="outline" onClick={() => onEdit(event)}>ערוך</Button><Button variant="destructive" onClick={() => onDelete(event.id)}>מחק</Button></div> : <span />}
            <Button variant="outline" onClick={onClose}>סגור</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ title, text }) {
  return <div className="rounded-xl bg-muted/40 p-3"><p className="font-medium text-sm mb-1">{title}</p><p className="text-sm text-muted-foreground whitespace-pre-wrap">{text}</p></div>;
}