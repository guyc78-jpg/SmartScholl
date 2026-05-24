import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Clock, MapPin, User } from 'lucide-react';
import EventTypeBadge from './EventTypeBadge';

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const formatIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function CalendarDayView({ exams, dayOffset, onDayChange, onEventClick, completionsByExamId = {} }) {
  const day = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [dayOffset]);

  const iso = formatIso(day);
  const dayEvents = useMemo(
    () => exams.filter(e => e.date === iso).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')),
    [exams, iso]
  );

  const label = `יום ${DAYS_HE[day.getDay()]}, ${day.getDate()} ${MONTHS_HE[day.getMonth()]} ${day.getFullYear()}`;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <Button variant="ghost" size="sm" onClick={() => onDayChange(dayOffset - 1)} className="gap-1">
          <ChevronRight className="w-4 h-4" />יום קודם
        </Button>
        <div className="text-sm font-semibold">{label}</div>
        <div className="flex gap-1">
          {dayOffset !== 0 && <Button variant="outline" size="sm" onClick={() => onDayChange(0)}>היום</Button>}
          <Button variant="ghost" size="sm" onClick={() => onDayChange(dayOffset + 1)} className="gap-1">
            יום הבא<ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-2 min-h-[220px]">
        {dayEvents.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">אין אירועים ביום זה</p>
        ) : dayEvents.map(exam => {
          const completed = completionsByExamId[exam.id]?.status === 'done';
          return (
            <button
              key={exam.id}
              onClick={() => onEventClick?.(exam)}
              className={`w-full text-right p-3 rounded-xl border bg-card hover:shadow-sm transition-all ${completed ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap flex-row-reverse justify-end">
                    <h3 className={`font-semibold text-sm ${completed ? 'line-through' : ''}`}>{exam.title}</h3>
                    <EventTypeBadge type={exam.type} />
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground flex-row-reverse justify-end">
                    {exam.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{exam.time}{exam.end_time ? `–${exam.end_time}` : ''}</span>}
                    {exam.class_or_grade && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{exam.class_or_grade}</span>}
                    {exam.teacher && <span className="flex items-center gap-1"><User className="w-3 h-3" />{exam.teacher}</span>}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}