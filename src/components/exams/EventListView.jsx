import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Clock, CalendarDays, Sun } from 'lucide-react';
import EventTypeBadge from './EventTypeBadge';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const SIDE_COLORS = {
  'מבחן': 'bg-purple-400/60',
  'בחן': 'bg-purple-400/60',
  'מבחן מתכונת': 'bg-purple-400/60',
  'בגרות': 'bg-purple-500/70',
  'מועד ב׳': 'bg-purple-400/60',
  'עבודה': 'bg-blue-400/60',
  'פרויקט': 'bg-blue-400/60',
  'הגשה': 'bg-pink-400/60',
  'חזרה': 'bg-emerald-400/60',
  'טקס': 'bg-amber-400/60',
  'צילומים': 'bg-pink-400/60',
  'טיול': 'bg-emerald-400/60',
  'אירוע שכבתי': 'bg-amber-400/60',
  'חג': 'bg-emerald-500/60',
  'ריקודים': 'bg-pink-400/60',
  'אחר': 'bg-gray-400/40'
};

function formatDateHeader(iso) {
  const d = new Date(iso);
  const dayName = DAY_NAMES[d.getDay()];
  return `יום ${dayName}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function EventListView({ events, onEventClick, todayIso }) {
  const grouped = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      const dateCmp = (a.date || '').localeCompare(b.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.time || '99:99').localeCompare(b.time || '99:99');
    });
    const map = new Map();
    sorted.forEach(e => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    });
    return Array.from(map.entries());
  }, [events]);

  if (!grouped.length) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">אין אירועים להצגה</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([date, dayEvents]) => {
        const isToday = date === todayIso;
        const isPast = date < todayIso;
        return (
          <div key={date} className="space-y-2">
            <div className={`flex items-center gap-2 px-1 ${isToday ? 'text-primary font-bold' : isPast ? 'text-muted-foreground/70' : 'text-foreground/80'}`}>
              <div className={`h-px flex-1 ${isToday ? 'bg-primary/30' : 'bg-border'}`} />
              <span className="text-sm font-semibold whitespace-nowrap">
                {isToday && '● '}{formatDateHeader(date)}
              </span>
              <span className="text-xs text-muted-foreground">({dayEvents.length})</span>
              <div className={`h-px flex-1 ${isToday ? 'bg-primary/30' : 'bg-border'}`} />
            </div>
            <div className="space-y-2">
              {dayEvents.map(event => {
                const sideColor = SIDE_COLORS[event.type] || SIDE_COLORS['אחר'];
                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={`w-full text-right rounded-lg border bg-card hover:shadow-sm transition-all flex overflow-hidden ${isPast ? 'opacity-70' : ''}`}
                  >
                    <div className={`w-1 shrink-0 ${sideColor}`} />
                    <div className="flex-1 min-w-0 p-3">
                      <div className="flex items-center gap-2 flex-wrap justify-end flex-row-reverse">
                        <h3 className="font-semibold text-foreground">{event.title}</h3>
                        <EventTypeBadge type={event.type} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        {event.time ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                            <Clock className="w-3 h-3" />{event.end_time ? `${event.time}–${event.end_time}` : event.time}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                            <Sun className="w-3 h-3" />יום שלם
                          </span>
                        )}
                        {event.subject && <span>· {event.subject}</span>}
                        {event.class_or_grade && <span>· {event.class_or_grade}</span>}
                        {event.audience_group_label && <span>· {event.audience_group_label}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}