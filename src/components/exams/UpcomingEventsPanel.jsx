import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock } from 'lucide-react';
import EventTypeBadge from './EventTypeBadge';

const addDays = (iso, days) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export default function UpcomingEventsPanel({ events, todayIso, onEventClick }) {
  const tomorrowIso = addDays(todayIso, 1);
  const weekEndIso = addDays(todayIso, 7);
  const buckets = [
    { key: 'today', label: 'היום', events: events.filter(e => e.date === todayIso) },
    { key: 'tomorrow', label: 'מחר', events: events.filter(e => e.date === tomorrowIso) },
    { key: 'week', label: 'השבוע', events: events.filter(e => e.date > tomorrowIso && e.date <= weekEndIso).slice(0, 6) }
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-primary" />
        <h2 className="font-semibold">מה קרוב?</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {buckets.map(bucket => (
          <div key={bucket.key} className="rounded-xl bg-muted/30 p-3 min-h-[110px]">
            <p className="text-xs font-bold text-muted-foreground mb-2">{bucket.label}</p>
            {bucket.events.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">אין אירועים</p>
            ) : (
              <div className="space-y-2">
                {bucket.events.map(event => (
                  <Button key={event.id} variant="ghost" onClick={() => onEventClick(event)} className="w-full h-auto justify-start p-2 text-right rounded-lg bg-card/70">
                    <div className="w-full min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-row-reverse">
                        <span className="font-medium text-xs truncate">{event.title}</span>
                        <EventTypeBadge type={event.type} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{event.date}{event.time ? ` · ${event.time}` : ''}</p>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}