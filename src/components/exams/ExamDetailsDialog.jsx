import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookOpen, Calendar, Clock, User, MapPin, Users } from 'lucide-react';
import EventTypeBadge from './EventTypeBadge';

const STATUS_OPTIONS = [
  { value: 'not_started',  label: 'צריך להתכונן', emoji: '⚪', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
  { value: 'in_progress',  label: 'בלמידה',       emoji: '🟡', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'ready',        label: 'מוכן/רלוונטי',  emoji: '🟢', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'done',         label: 'בוצע',          emoji: '✅', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'not_relevant', label: 'לא רלוונטי',    emoji: '🚫', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' }
];

const SCOPE_LABEL = {
  school: 'כלל בית-ספרי',
  grade: 'שכבה',
  class: 'כיתה',
  track: 'מגמה',
  subject: 'מקצוע',
  group: 'קבוצה'
};

function audienceLine(exam) {
  if (!exam) return '';
  const scope = exam.audience_scope || 'grade';
  const list =
    scope === 'class' ? exam.audience_classes :
    scope === 'track' ? exam.audience_tracks :
    scope === 'subject' ? exam.audience_subjects :
    scope === 'grade' ? exam.audience_grades :
    scope === 'group' ? [exam.audience_group_label].filter(Boolean) :
    [];
  const tail = (list || []).filter(Boolean).join(', ');
  return tail ? `${SCOPE_LABEL[scope]}: ${tail}` : SCOPE_LABEL[scope];
}

export default function ExamDetailsDialog({ exam, open, onClose, isStudentView, currentCompletion, onStatusChange }) {
  const [status, setStatus] = useState('not_started');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setStatus(currentCompletion?.status || 'not_started');
      setNote(currentCompletion?.personal_note || '');
    }
  }, [open, currentCompletion]);

  if (!exam) return null;

  const handleSave = async (newStatus) => {
    setStatus(newStatus);
    await onStatusChange?.({ status: newStatus, personal_note: note });
  };

  const handleNoteBlur = async () => {
    if (note !== (currentCompletion?.personal_note || '')) {
      await onStatusChange?.({ status, personal_note: note });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="max-w-md text-right">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-row-reverse">
            <EventTypeBadge type={exam.type} />
            <span>{exam.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{exam.date}{exam.end_date && exam.end_date !== exam.date ? ` – ${exam.end_date}` : ''}</span>
            {exam.time && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{exam.time}{exam.end_time ? `–${exam.end_time}` : ''}</span>}
            {exam.subject && <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{exam.subject}</span>}
            {exam.teacher && <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{exam.teacher}</span>}
            {exam.class_or_grade && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{exam.class_or_grade}</span>}
            <span className="flex items-center gap-1.5 col-span-2"><Users className="w-4 h-4" />{audienceLine(exam)}</span>
          </div>

          {exam.material && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium mb-1">📚 חומר</p>
              <p className="text-muted-foreground">{exam.material}</p>
            </div>
          )}
          {exam.notes && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium mb-1">💬 הערות</p>
              <p className="text-muted-foreground">{exam.notes}</p>
            </div>
          )}

          {isStudentView && (
            <div className="space-y-3 pt-2 border-t">
              <div>
                <Label className="text-xs">איך זה רלוונטי אליך?</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleSave(opt.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${status === opt.value ? opt.color + ' border-current' : 'bg-card hover:bg-muted border-border'}`}
                    >
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs">הערה אישית (פרטית)</Label>
                <Textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  onBlur={handleNoteBlur}
                  rows={2}
                  placeholder="לדוגמה: לחזור על פרק 4..."
                  className="mt-1.5"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>סגור</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}