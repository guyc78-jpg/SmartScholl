import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { getEventTypeClasses } from './EventTypeBadge';

const DAY_NAMES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const formatIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function CalendarMonthView({ exams, monthOffset, onMonthChange, onEventClick, todayIso, completionsByExamId = {} }) {
  const base = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const cells = useMemo(() => {
    const firstDay = new Date(base.getFullYear(), base.getMonth(), 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [base]);

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const exam of exams) (map[exam.date] = map[exam.date] || []).push(exam);
    return map;
  }, [exams]);

  const monthLabel = `${MONTHS_HE[base.getMonth()]} ${base.getFullYear()}`;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <Button variant="ghost" size="sm" onClick={() => onMonthChange(monthOffset - 1)} className="gap-1">
          <ChevronRight className="w-4 h-4" />חודש קודם
        </Button>
        <div className="text-sm font-semibold">{monthLabel}</div>
        <div className="flex gap-1">
          {monthOffset !== 0 && <Button variant="outline" size="sm" onClick={() => onMonthChange(0)}>היום</Button>}
          <Button variant="ghost" size="sm" onClick={() => onMonthChange(monthOffset + 1)} className="gap-1">
            חודש הבא<ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 bg-muted/40 text-[11px] font-medium text-muted-foreground">
        {DAY_NAMES.map(d => <div key={d} className="p-2 text-center">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border">
        {cells.map(day => {
          const iso = formatIso(day);
          const inMonth = day.getMonth() === base.getMonth();
          const isToday = iso === todayIso;
          const dayEvents = eventsByDate[iso] || [];
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;
          return (
            <div
              key={iso}
              className={`bg-card min-h-[90px] p-1.5 ${!inMonth ? 'opacity-40' : ''} ${isToday ? 'ring-1 ring-inset ring-primary/50 bg-primary/5' : ''}`}
            >
              <div className={`text-[11px] text-end font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>{day.getDate()}</div>
              <div className="space-y-0.5 mt-1">
                {visible.map(exam => {
                  const completed = completionsByExamId[exam.id]?.status === 'done';
                  return (
                    <button
                      key={exam.id}
                      onClick={() => onEventClick?.(exam)}
                      title={exam.title}
                      className={`w-full text-right text-[9px] px-1 py-0.5 rounded border ${getEventTypeClasses(exam.type)} ${completed ? 'opacity-50 line-through' : ''} truncate leading-tight hover:shadow-sm`}
                    >
                      {exam.title}
                    </button>
                  );
                })}
                {overflow > 0 && (
                  <div className="text-[9px] text-muted-foreground text-center">+ {overflow}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}