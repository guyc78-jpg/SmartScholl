import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { getEventTypeClasses } from './EventTypeBadge';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

// Sunday-based week start, returns YYYY-MM-DD of that Sunday.
const getWeekStart = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDate = (d) => d.toISOString().split('T')[0];
const formatDisplay = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function CalendarWeekView({ exams, weekOffset, onWeekChange, onEventClick, todayIso, completionsByExamId = {} }) {
  const baseSunday = useMemo(() => {
    const today = new Date();
    const sunday = getWeekStart(today);
    sunday.setDate(sunday.getDate() + weekOffset * 7);
    return sunday;
  }, [weekOffset]);

  const days = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(baseSunday);
    d.setDate(d.getDate() + i);
    return d;
  }), [baseSunday]);

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const exam of exams) {
      (map[exam.date] = map[exam.date] || []).push(exam);
    }
    return map;
  }, [exams]);

  const weekLabel = `${formatDisplay(days[0])} – ${formatDisplay(days[5])}`;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <Button variant="ghost" size="sm" onClick={() => onWeekChange(weekOffset - 1)} className="gap-1">
          <ChevronRight className="w-4 h-4" />שבוע קודם
        </Button>
        <div className="text-sm font-semibold">{weekLabel}</div>
        <div className="flex gap-1">
          {weekOffset !== 0 && (
            <Button variant="outline" size="sm" onClick={() => onWeekChange(0)}>היום</Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onWeekChange(weekOffset + 1)} className="gap-1">
            שבוע הבא<ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-px bg-border">
        {days.map((day, i) => {
          const iso = formatDate(day);
          const isToday = iso === todayIso;
          const dayEvents = eventsByDate[iso] || [];
          return (
            <div key={iso} className={`bg-card min-h-[140px] p-2 ${isToday ? 'bg-primary/5 ring-1 ring-inset ring-primary/40' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground">{DAYS[i]}</span>
                <span className={`text-xs font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>{day.getDate()}/{day.getMonth() + 1}</span>
              </div>
              <div className="space-y-1">
                {dayEvents.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/60 text-center pt-3">—</p>
                ) : dayEvents.map(exam => {
                  const completed = completionsByExamId[exam.id]?.status === 'done';
                  return (
                    <button
                      key={exam.id}
                      onClick={() => onEventClick?.(exam)}
                      className={`w-full text-right text-[10px] px-1.5 py-1 rounded border ${getEventTypeClasses(exam.type)} ${completed ? 'opacity-50 line-through' : ''} hover:shadow-sm transition-all leading-tight`}
                      title={exam.title}
                    >
                      <div className="font-medium truncate">{exam.title}</div>
                      {exam.time && <div className="text-[9px] opacity-80">{exam.time}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}