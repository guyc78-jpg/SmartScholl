import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { TYPE_STYLES, getDisplayEventType } from './eventConstants';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const HEB_DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

const addDays = (iso, days) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const formatHebDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${format(d, 'd.M.yy')} · יום ${HEB_DAYS[d.getDay()]}`;
  } catch {
    return iso;
  }
};

// מיפוי קטגוריה לפס צד עדין
const SIDE_COLORS = {
  'מבחן': 'bg-purple-400', 'בחן': 'bg-violet-400',
  'עבודה': 'bg-blue-400', 'פרויקט': 'bg-sky-400', 'הגשה': 'bg-cyan-400',
  'בגרות': 'bg-red-400', 'מתכונת': 'bg-orange-400', 'מועד ב׳': 'bg-amber-400',
  'חזרה': 'bg-pink-400', 'חזרות למסיבת סיום': 'bg-rose-400', 'ריקודים': 'bg-fuchsia-400', 'משחק': 'bg-lime-400',
  'טקס': 'bg-indigo-400', 'צילומים': 'bg-teal-400', 'ועדה': 'bg-stone-400',
  'חג': 'bg-emerald-400', 'אירוע שכבתי': 'bg-primary', 'אחר': 'bg-slate-400'
};

function EventCard({ event, onClick, onEdit, onDelete, canEdit }) {
  const sideColor = SIDE_COLORS[event.type] || SIDE_COLORS['אחר'];
  const displayType = getDisplayEventType(event);
  const tagStyle = TYPE_STYLES[event.type] || TYPE_STYLES['אחר'];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(event)}
      className="group w-full text-right rounded-lg bg-card hover:bg-accent/40 border border-border/60 hover:border-border transition-colors overflow-hidden flex h-[56px] cursor-pointer"
    >
      <div className={`w-1 shrink-0 ${sideColor}`} />
      <div className="flex-1 min-w-0 px-2 py-1.5 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-start">
            <h4 className="font-semibold text-[13px] text-foreground truncate leading-tight">{event.title}</h4>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 leading-none ${tagStyle}`}>{displayType}</span>
          </div>
          <EventActionsMenu event={event} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
            <span>{formatHebDate(event.date)}</span>
            {event.time && <><span className="opacity-50">·</span><Clock className="w-2.5 h-2.5" />{event.end_time ? `${event.time}–${event.end_time}` : event.time}</>}
          </p>

        </div>
      </div>
    </div>
  );
}

export default function UpcomingEventsPanel({ events, todayIso, onEventClick, onEdit, onDelete, canEdit = true }) {
  const tomorrowIso = addDays(todayIso, 1);
  const weekEndIso = addDays(todayIso, 7);

  const today = events.filter(e => e.date === todayIso);
  const tomorrow = events.filter(e => e.date === tomorrowIso);
  const week = events.filter(e => e.date > tomorrowIso && e.date <= weekEndIso);

  const eventsWord = (n) => n === 1 ? 'אירוע' : 'אירועים';
  const buckets = [
    { key: 'today', label: 'היום', events: today, accent: 'text-primary', dot: 'bg-primary' },
    { key: 'tomorrow', label: 'מחר', events: tomorrow, accent: 'text-foreground', dot: 'bg-secondary' },
    { key: 'week', label: 'השבוע', events: week.slice(0, 8), accent: 'text-muted-foreground', dot: 'bg-muted-foreground/60' }
  ];

  const totalThisWeek = today.length + tomorrow.length + week.length;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-primary" />
          </div>
          <h2 className="font-semibold">מה קרוב?</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">היום {today.length}</span>
          <span className="px-2 py-0.5 rounded-full bg-secondary/40 text-secondary-foreground font-medium">מחר {tomorrow.length}</span>
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">השבוע {week.length}</span>
          <span className="text-muted-foreground hidden sm:inline">· סה״כ {totalThisWeek}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {buckets.map(bucket => (
          <div key={bucket.key} className="rounded-xl bg-muted/30 p-2">
            <div className="flex items-center gap-2 px-1.5 mb-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${bucket.dot}`} />
              <p className={`text-xs font-bold ${bucket.accent}`}>{bucket.label}</p>
              <span className="text-[11px] text-muted-foreground">·</span>
              <span className="text-[11px] text-muted-foreground">{bucket.events.length} {eventsWord(bucket.events.length)}</span>
            </div>
            {bucket.events.length === 0 ? (
              <div className="h-[56px] flex items-center justify-center">
                <p className="text-xs text-muted-foreground">אין אירועים</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto pe-1 -me-1 scroll-smooth">
                {bucket.events.map(event => (
                  <EventCard key={event.id} event={event} onClick={onEventClick} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function EventActionsMenu({ event, onEdit, onDelete, canEdit }) {
  if (!canEdit) return <span className="w-8 shrink-0" />;

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" aria-label="פעולות אירוע">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} collisionPadding={16} className="w-32 text-right z-[10000]">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(event); }} className="justify-start gap-2 cursor-pointer">
          <Pencil className="w-4 h-4" />
          ערוך
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete?.(event.id); }} className="justify-start gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
          <Trash2 className="w-4 h-4" />
          מחק
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}