import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, MapPin, Pencil, User, Users, X } from 'lucide-react';
import EventTypeBadge from './EventTypeBadge';
import { getDisplayEventType } from './eventConstants';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'לא התחלתי' },
  { value: 'in_progress', label: 'בלמידה' },
  { value: 'ready', label: 'מוכן/רלוונטי' },
  { value: 'done', label: 'בוצע' },
  { value: 'not_relevant', label: 'לא רלוונטי' }
];

const SCOPE_LABEL = { school: 'כל בית הספר', grade: 'שכבה', class: 'כיתה', subject: 'מקצוע', track: 'מגמה', group: 'קבוצה' };

export default function EventDetailsDialog({ event, open, onClose, canEdit, isStudent, completion = null, onStudentUpdate = null, onEdit, extraContent = null }) {
  const [status, setStatus] = useState('not_started');
  const [note, setNote] = useState('');

  useEffect(() => {
    setStatus(completion?.status || 'not_started');
    setNote(completion?.personal_note || '');
  }, [completion, event?.id]);

  if (!event) return null;

  const audience = SCOPE_LABEL[event.audience_scope || 'grade'] || 'שכבה';
  const displayType = getDisplayEventType(event);
  const timeRange = event.time ? (event.end_time ? `${event.time}–${event.end_time}` : event.time) : '';
  const saveStudent = async (nextStatus = status) => onStudentUpdate?.({ status: nextStatus, personal_note: note });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="w-auto max-w-[calc(100vw-2rem)] sm:max-w-md gap-3 rounded-2xl p-4 pb-4 overflow-x-hidden">
        <DialogHeader className="space-y-2 pe-8">
          <div className="flex items-center gap-2 flex-wrap justify-start">
            <DialogTitle className="text-xl font-bold leading-snug text-right text-foreground break-words">
              {event.title}
            </DialogTitle>
            <EventTypeBadge type={displayType} />
          </div>
        </DialogHeader>

        <div className="space-y-3 text-right">
          <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
            <DetailRow icon={Calendar} label="תאריך" value={event.date} />
            {timeRange && <DetailRow icon={Clock} label="שעה" value={timeRange} />}
            {event.class_or_grade && <DetailRow icon={MapPin} label="שכבה" value={event.class_or_grade} />}
            {event.teacher && <DetailRow icon={User} label="אחראי" value={event.teacher} />}
            <DetailRow icon={Users} label="רלוונטיות" value={audience} />
          </div>

          {event.material && <Info title="חומר / הכנה" text={event.material} />}
          {event.notes && <Info title="הערות" text={event.notes} />}
          {extraContent}

          {isStudent && (
            <div className="border-t pt-3 space-y-3">
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

          <div className={canEdit && onEdit ? "grid grid-cols-2 gap-2 pt-1" : "grid grid-cols-1 gap-2 pt-1"}>
            {canEdit && onEdit ? (
                <Button variant="outline" onClick={() => onEdit(event)} className="h-10 rounded-xl gap-1.5">
                  <Pencil className="w-4 h-4" />
                  ערוך
                </Button>
            ) : null}
            <Button variant="outline" onClick={onClose} className="h-10 rounded-xl gap-1.5">
              <X className="w-4 h-4" />
              סגור
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm text-right min-w-0" dir="rtl">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-foreground truncate">{value}</span>
    </div>
  );
}

function Info({ title, text }) {
  return <div className="rounded-xl bg-muted/40 p-3"><p className="font-medium text-sm mb-1">{title}</p><p className="text-sm text-muted-foreground whitespace-pre-wrap">{text}</p></div>;
}
