import { useEffect, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, List, Columns3, Grid3X3, Clock, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { getDisplayEventType } from './eventConstants';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const DAYS_SHORT = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dateLabel = date => `‎${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}‎`;

const VIEW_META = {
  day: { label: 'יום', icon: List },
  week: { label: 'שבוע', icon: Columns3 },
  month: { label: 'חודש', icon: Grid3X3 },
};

const TYPE_STYLES = {
  'מבחן': 'bg-violet-500 text-white border-violet-600 dark:bg-violet-500/85 dark:border-violet-400/40',
  'בחן': 'bg-purple-500 text-white border-purple-600 dark:bg-purple-500/85 dark:border-purple-400/40',
  'בגרות': 'bg-sky-600 text-white border-sky-700 dark:bg-sky-500/85 dark:border-sky-400/40',
  'מתכונת': 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-500/85 dark:border-indigo-400/40',
  'מועד ב׳': 'bg-blue-600 text-white border-blue-700 dark:bg-blue-500/85 dark:border-blue-400/40',
  'עבודה': 'bg-blue-500 text-white border-blue-600 dark:bg-blue-500/85 dark:border-blue-400/40',
  'פרויקט': 'bg-cyan-600 text-white border-cyan-700 dark:bg-cyan-500/85 dark:border-cyan-400/40',
  'הגשה': 'bg-pink-500 text-white border-pink-600 dark:bg-pink-500/85 dark:border-pink-400/40',
  'חזרה': 'bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-500/85 dark:border-emerald-400/40',
  'חזרות למסיבת סיום': 'bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-500/85 dark:border-emerald-400/40',
  'חג': 'bg-amber-500 text-white border-amber-600 dark:bg-amber-500/85 dark:border-amber-400/40',
  'טקס': 'bg-teal-600 text-white border-teal-700 dark:bg-teal-500/85 dark:border-teal-400/40',
  'צילומים': 'bg-teal-600 text-white border-teal-700 dark:bg-teal-500/85 dark:border-teal-400/40',
  'אחר': 'bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-500/85 dark:border-emerald-400/40',
};

function groupByDate(events) {
  return events.reduce((map, event) => {
    (map[event.date] = map[event.date] || []).push(event);
    return map;
  }, {});
}

function sortEvents(list = []) {
  return [...list].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || (a.title || '').localeCompare(b.title || ''));
}

function getEventStyle(event) {
  const displayType = getDisplayEventType(event);
  return TYPE_STYLES[displayType] || TYPE_STYLES[event.type] || TYPE_STYLES['אחר'];
}

function CalendarShell({ view, onViewChange = null, title, subtitle = '', prevLabel, nextLabel, offset, onOffsetChange, children }) {
  return (
    <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm" dir="rtl">
      <div className="border-b bg-muted/20 p-3 sm:p-4 space-y-3 text-right">
        <div className="relative flex items-center justify-between h-10" dir="rtl">
          <Button variant="ghost" size="sm" onClick={() => onOffsetChange(offset - 1)} className="absolute right-0 top-1/2 -translate-y-1/2 justify-start h-9 px-2 text-primary font-bold text-xs sm:text-sm whitespace-nowrap">
            <ChevronRight className="w-4 h-4" />
            <span>{prevLabel}</span>
          </Button>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center px-1 w-max max-w-[calc(100%-9rem)]" dir="rtl">
            <h2 className="font-extrabold text-[13px] sm:text-lg text-foreground whitespace-nowrap leading-snug">{title}</h2>
            {subtitle && <p className="text-xs sm:text-sm text-muted-foreground font-semibold whitespace-nowrap leading-snug mt-0.5">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOffsetChange(offset + 1)} className="absolute left-0 top-1/2 -translate-y-1/2 justify-end h-9 px-2 text-primary font-bold text-xs sm:text-sm whitespace-nowrap">
            <span>{nextLabel}</span>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 rounded-xl border bg-card overflow-hidden h-12 sm:h-14">
          {['day', 'week', 'month'].map(key => {
            const Icon = VIEW_META[key].icon;
            const active = view === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onViewChange?.(key)}
                className={cn(
                  'flex items-center justify-center gap-2 border-s first:border-s-0 text-sm font-bold transition-colors text-center',
                  active ? 'bg-primary/12 text-primary ring-2 ring-inset ring-primary border-primary/40' : 'text-muted-foreground hover:bg-muted/50'
                )}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{VIEW_META[key].label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {children}
    </Card>
  );
}

function EventActionsMenu({ event, onEdit, onDelete, canEdit, compact = false }) {
  if (!canEdit || (!onEdit && !onDelete)) return null;
  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className={cn('shrink-0 rounded-full text-current hover:bg-white/20 hover:text-current', compact ? 'h-5 w-5' : 'h-8 w-8')} aria-label="פעולות אירוע">
          <MoreVertical className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} collisionPadding={16} className="w-32 text-right z-[10000]" dir="rtl">
        {onEdit && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(event); }} className="justify-start gap-2 cursor-pointer">
            <Pencil className="w-4 h-4" /> ערוך
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(event.id); }} className="justify-start gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
            <Trash2 className="w-4 h-4" /> מחק
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MiniEvent({ event, onClick, onEdit, onDelete, canEdit }) {
  const time = event.time ? (event.end_time ? `${event.time}–${event.end_time}` : event.time) : '';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(event)}
      className={cn('group flex items-center gap-1 rounded-md border px-1.5 py-1 text-right text-[10px] leading-none cursor-pointer min-w-0 shadow-sm hover:brightness-95', getEventStyle(event))}
      dir="rtl"
      title={`${event.title}${time ? ` · ${time}` : ''}`}
    >
      <span className="truncate flex-1 min-w-0 font-bold text-right">{time ? `${time} ` : ''}{event.title}</span>
      <EventActionsMenu event={event} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} compact />
    </div>
  );
}

function DayEventsList({ events, onEventClick, onEdit, onDelete, canEdit }) {
  const timed = sortEvents(events.filter(event => event.time));
  const untimed = sortEvents(events.filter(event => !event.time));
  if (!events.length) return <p className="text-center text-sm text-muted-foreground py-16">אין אירועים ביום זה</p>;
  return (
    <div className="p-3 sm:p-4 space-y-4 min-h-[260px] pb-24 sm:pb-4" dir="rtl">
      {timed.length > 0 && <div className="space-y-2">{timed.map(event => <EventRow key={event.id} event={event} onClick={onEventClick} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} />)}</div>}
      {untimed.length > 0 && (
        <div className="space-y-2">
          {timed.length > 0 && <p className="text-xs font-bold text-muted-foreground px-1">ללא שעה מוגדרת</p>}
          {untimed.map(event => <EventRow key={event.id} event={event} onClick={onEventClick} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} />)}
        </div>
      )}
    </div>
  );
}

function EventRow({ event, onClick, onEdit, onDelete, canEdit }) {
  const displayType = getDisplayEventType(event);
  const timeRange = event.time ? (event.end_time ? `${event.time}–${event.end_time}` : event.time) : 'ללא שעה';
  const audience = [event.class_or_grade, event.audience_group_label, event.subject].filter(Boolean).join(' · ');
  return (
    <div role="button" tabIndex={0} onClick={() => onClick(event)} className="w-full text-right rounded-xl border bg-card hover:bg-muted/30 transition-colors group flex overflow-hidden cursor-pointer min-w-0" dir="rtl">
      <div className={cn('w-1 shrink-0', getEventStyle(event))} />
      <div className="flex-1 min-w-0 p-3">
        <div className="flex items-start gap-2 justify-start min-w-0">
          <div className="flex-1 min-w-0 text-right">
            <h3 className="font-extrabold text-sm text-foreground truncate">{event.title}</h3>
            <div className="flex flex-wrap items-center gap-1.5 justify-start mt-1 text-xs text-muted-foreground min-w-0">
              <span className="inline-flex items-center gap-1 font-semibold"><Clock className="w-3.5 h-3.5" />{timeRange}</span>
              {audience && <span className="truncate max-w-full">· {audience}</span>}
            </div>
          </div>
          <span className={cn('rounded-full border px-2 py-1 text-[11px] font-bold shrink-0', getEventStyle(event))}>{displayType}</span>
          <EventActionsMenu event={event} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} />
        </div>
      </div>
    </div>
  );
}

export function MonthView({ events, offset, onOffsetChange, onEventClick, onEdit = null, onDelete = null, canEdit = true, todayIso, view = 'month', onViewChange = null }) {
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
    <CalendarShell view={view} onViewChange={onViewChange} title={`${MONTHS[base.getMonth()]} ${base.getFullYear()}`} prevLabel="חודש קודם" nextLabel="חודש הבא" offset={offset} onOffsetChange={onOffsetChange}>
      <div className="overflow-x-hidden" dir="rtl">
        <div className="grid grid-cols-7 bg-muted/40 text-xs text-foreground border-b min-w-0">{DAYS_SHORT.map(d => <div key={d} className="p-2 text-center font-extrabold truncate border-s first:border-s-0">{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-px bg-border">
          {cells.map(day => {
            const dayIso = iso(day);
            const dayEvents = sortEvents(byDate[dayIso] || []);
            const isToday = dayIso === todayIso;
            const isOtherMonth = day.getMonth() !== base.getMonth();
            return (
              <div key={dayIso} className={cn('relative bg-card p-1 min-h-[94px] sm:min-h-[118px] overflow-hidden', isToday && 'ring-2 ring-inset ring-primary/60 bg-primary/[0.04]', isOtherMonth && 'opacity-60 bg-[repeating-linear-gradient(135deg,hsl(var(--muted))_0px,hsl(var(--muted))_6px,hsl(var(--card))_6px,hsl(var(--card))_12px)]')}>
                <div className="flex items-center justify-between gap-1 mb-1 text-right">
                  <span className={cn('text-[11px] sm:text-xs font-extrabold', isToday ? 'text-primary' : 'text-foreground')}>{day.getDate()}</span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground font-semibold whitespace-normal leading-tight">{dateLabel(day)}</span>
                </div>
                <div className="space-y-1 overflow-hidden max-h-[68px] sm:max-h-[88px]">
                  {dayEvents.slice(0, 4).map(event => <MiniEvent key={event.id} event={event} onClick={onEventClick} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} />)}
                </div>
                {dayEvents.length > 4 && <div className="mt-1 text-[10px] text-primary font-bold text-center truncate">עוד {dayEvents.length - 4}…</div>}
              </div>
            );
          })}
        </div>
      </div>
    </CalendarShell>
  );
}

export function WeekView({ events, offset, onOffsetChange, onEventClick, onEdit = null, onDelete = null, canEdit = true, todayIso, view = 'week', onViewChange = null }) {
  const scrollRef = useRef(null);
  const todayColumnRef = useRef(null);

  const start = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + offset * 7);
    return d;
  }, [offset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  }), [start]);
  const byDate = useMemo(() => groupByDate(events), [events]);
  const end = days[days.length - 1];

  useEffect(() => {
    if (offset !== 0) return;
    const timer = window.setTimeout(() => {
      todayColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [offset, todayIso]);
  return (
    <CalendarShell view={view} onViewChange={onViewChange} title={`${dateLabel(start)} - ${dateLabel(end)}`} prevLabel="שבוע קודם" nextLabel="שבוע הבא" offset={offset} onOffsetChange={onOffsetChange}>
      <div ref={scrollRef} className="overflow-x-auto scroll-smooth overscroll-x-contain" dir="rtl">
        <div className="grid gap-px bg-border min-w-[840px] lg:min-w-0" style={{ gridTemplateColumns: `repeat(7, minmax(120px, 1fr))` }}>
          {days.map((day, index) => {
            const dayIso = iso(day);
            const dayEvents = sortEvents(byDate[dayIso] || []);
            const isToday = dayIso === todayIso;
            return (
              <div key={dayIso} ref={isToday ? todayColumnRef : null} className={cn('bg-card min-h-[360px] flex flex-col min-w-0 scroll-m-2', isToday && 'ring-2 ring-inset ring-primary bg-primary/[0.03]')}>
                <div className={cn('p-2 border-b bg-muted/35 text-center', isToday && 'bg-primary/10 text-primary')}>
                  <p className={cn('font-extrabold text-sm truncate', isToday ? 'text-primary' : 'text-foreground')}>{DAYS_SHORT[day.getDay()]}</p>
                  <p className="text-xs text-muted-foreground font-semibold whitespace-normal leading-tight">{dateLabel(day)}</p>
                </div>
                <div className="p-1.5 space-y-1 overflow-y-auto max-h-[310px] text-right">
                  {dayEvents.length ? dayEvents.map(event => <MiniEvent key={event.id} event={event} onClick={onEventClick} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} />) : <div className="text-[11px] text-muted-foreground/60 text-center pt-8">אין אירועים</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CalendarShell>
  );
}

export function DayView({ events, offset, onOffsetChange, onEventClick, onEdit = null, onDelete = null, canEdit = true, todayIso, view = 'day', onViewChange = null }) {
  const day = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  }, [offset]);
  const dayIso = iso(day);
  const dayEvents = sortEvents(events.filter(event => event.date === dayIso));
  return (
    <CalendarShell view={view} onViewChange={onViewChange} title={`${DAYS_SHORT[day.getDay()]}, ${dateLabel(day)}`} prevLabel="יום קודם" nextLabel="יום הבא" offset={offset} onOffsetChange={onOffsetChange}>
      <DayEventsList events={dayEvents} onEventClick={onEventClick} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} />
    </CalendarShell>
  );
}
