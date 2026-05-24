import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import EventTypeBadge from './EventTypeBadge';

const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function groupByDate(events) {
  return events.reduce((map, event) => {
    (map[event.date] = map[event.date] || []).push(event);
    return map;
  }, {});
}

export function MonthView({ events, offset, onOffsetChange, onEventClick, todayIso }) {
  const base = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + offset, 1);
  }, [offset]);
  const cells = useMemo(() => {
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  }, [base]);
  const byDate = useMemo(() => groupByDate(events), [events]);

  return (
    <Card className="overflow-hidden">
      <CalendarHeader title={`${MONTHS[base.getMonth()]} ${base.getFullYear()}`} prev="חודש קודם" next="חודש הבא" offset={offset} onOffsetChange={onOffsetChange} />
      <div className="grid grid-cols-7 bg-muted/40 text-xs text-muted-foreground">{DAYS.map(d => <div key={d} className="p-2 text-center font-medium">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-px bg-border">
        {cells.map(day => {
          const dayIso = iso(day);
          const dayEvents = byDate[dayIso] || [];
          return (
            <div key={dayIso} className={`min-h-[92px] bg-card p-1.5 ${day.getMonth() !== base.getMonth() ? 'opacity-40' : ''} ${dayIso === todayIso ? 'ring-1 ring-inset ring-primary bg-primary/5' : ''}`}>
              <div className="text-xs font-semibold mb-1">{day.getDate()}</div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => <MiniEvent key={event.id} event={event} onClick={onEventClick} />)}
                {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground text-center">+{dayEvents.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function WeekView({ events, offset, onOffsetChange, onEventClick, todayIso }) {
  const start = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + offset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [offset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  }), [start]);
  const byDate = useMemo(() => groupByDate(events), [events]);

  return (
    <Card className="overflow-hidden">
      <CalendarHeader title={`${days[0].getDate()}/${days[0].getMonth() + 1} – ${days[6].getDate()}/${days[6].getMonth() + 1}`} prev="שבוע קודם" next="שבוע הבא" offset={offset} onOffsetChange={onOffsetChange} />
      <div className="grid grid-cols-1 md:grid-cols-7 gap-px bg-border">
        {days.map((day, index) => {
          const dayIso = iso(day);
          const dayEvents = byDate[dayIso] || [];
          return (
            <div key={dayIso} className={`bg-card min-h-[150px] p-2 ${dayIso === todayIso ? 'bg-primary/5 ring-1 ring-inset ring-primary/40' : ''}`}>
              <div className="flex justify-between items-center mb-2 text-sm"><span className="text-muted-foreground">{DAYS[index]}</span><b>{day.getDate()}/{day.getMonth() + 1}</b></div>
              <div className="space-y-1">{dayEvents.length ? dayEvents.map(event => <MiniEvent key={event.id} event={event} onClick={onEventClick} />) : <p className="text-xs text-muted-foreground text-center pt-8">—</p>}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function DayView({ events, offset, onOffsetChange, onEventClick }) {
  const day = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  }, [offset]);
  const dayIso = iso(day);
  const dayEvents = events.filter(event => event.date === dayIso).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

  return (
    <Card className="overflow-hidden">
      <CalendarHeader title={`${day.getDate()} ${MONTHS[day.getMonth()]} ${day.getFullYear()}`} prev="יום קודם" next="יום הבא" offset={offset} onOffsetChange={onOffsetChange} />
      <div className="p-4 space-y-2 min-h-[240px]">
        {dayEvents.length ? dayEvents.map(event => <EventRow key={event.id} event={event} onClick={onEventClick} />) : <p className="text-center text-sm text-muted-foreground py-16">אין אירועים ביום זה</p>}
      </div>
    </Card>
  );
}

function CalendarHeader({ title, prev, next, offset, onOffsetChange }) {
  return (
    <div className="flex items-center justify-between p-3 border-b bg-muted/30">
      <Button variant="ghost" size="sm" onClick={() => onOffsetChange(offset - 1)}><ChevronRight className="w-4 h-4" />{prev}</Button>
      <div className="font-semibold text-sm">{title}</div>
      <div className="flex gap-1">{offset !== 0 && <Button variant="outline" size="sm" onClick={() => onOffsetChange(0)}>היום</Button>}<Button variant="ghost" size="sm" onClick={() => onOffsetChange(offset + 1)}>{next}<ChevronLeft className="w-4 h-4" /></Button></div>
    </div>
  );
}

function MiniEvent({ event, onClick }) {
  return <button onClick={() => onClick(event)} className="w-full text-right text-[10px] px-1.5 py-1 rounded border bg-card hover:shadow-sm"><span className="font-medium truncate block">{event.title}</span>{event.time && <span className="opacity-70 flex items-center gap-1"><Clock className="w-3 h-3" />{event.time}</span>}</button>;
}

function EventRow({ event, onClick }) {
  return (
    <button onClick={() => onClick(event)} className="w-full text-right rounded-xl border bg-card p-3 hover:shadow-sm">
      <div className="flex items-center gap-2 flex-wrap justify-end flex-row-reverse"><h3 className="font-semibold">{event.title}</h3><EventTypeBadge type={event.type} /></div>
      <div className="text-xs text-muted-foreground mt-1">{event.date}{event.time ? ` · ${event.time}` : ''}{event.class_or_grade ? ` · ${event.class_or_grade}` : ''}</div>
    </button>
  );
}