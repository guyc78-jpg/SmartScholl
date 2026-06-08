import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import EventTypeBadge from './EventTypeBadge';
import { getDisplayEventType } from './eventConstants';

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
     <Card className="overflow-hidden rounded-xl border">
       <CalendarHeader title={`${MONTHS[base.getMonth()]} ${base.getFullYear()}`} prev="חודש קודם" next="חודש הבא" offset={offset} onOffsetChange={onOffsetChange} />
       <div className="grid grid-cols-7 bg-muted/40 text-xs text-muted-foreground border-b">{DAYS.map(d => <div key={d} className="p-2.5 text-center font-medium">{d}</div>)}</div>
       <div className="grid grid-cols-7 gap-px bg-border">
         {cells.map(day => {
           const dayIso = iso(day);
           const dayEvents = byDate[dayIso] || [];
           const isToday = dayIso === todayIso;
           const isOtherMonth = day.getMonth() !== base.getMonth();
           return (
             <div key={dayIso} className={`min-h-[92px] bg-card p-1.5 transition-all ${isOtherMonth ? 'opacity-35' : ''} ${isToday ? 'ring-1 ring-inset ring-primary/40 bg-primary/4' : ''}`}>
               <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-primary' : ''}`}>{day.getDate()}</div>
               <div className="space-y-1">
                 {dayEvents.slice(0, 3).map(event => <MiniEvent key={event.id} event={event} onClick={onEventClick} />)}
                 {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground/70 text-center">+{dayEvents.length - 3}</div>}
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
       <div className="flex flex-col md:grid md:grid-cols-7 gap-px bg-border">
         {days.map((day, index) => {
           const dayIso = iso(day);
           const dayEvents = byDate[dayIso] || [];
           const isToday = dayIso === todayIso;
           const isEmpty = dayEvents.length === 0 && !isToday;
           return (
             <div
               key={dayIso}
               className={`bg-card transition-all ${
                 isToday
                   ? 'p-2 min-h-[150px] ring-1 ring-inset ring-primary/30 bg-primary/[0.03]'
                   : isEmpty
                     ? 'px-2 flex items-center h-10 md:h-10'
                     : 'p-2 min-h-[150px]'
               }`}
             >
               <div className={`flex justify-between items-center w-full ${isEmpty ? 'opacity-40' : 'mb-2'}`}>
                 <span className="text-muted-foreground/60 text-xs">{DAYS[index]}</span>
                 <b className={`text-xs ${isToday ? 'text-primary font-bold' : 'text-muted-foreground/70'}`}>{day.getDate()}/{day.getMonth() + 1}</b>
               </div>
               {!isEmpty && (
                 <div className="space-y-1">
                   {dayEvents.map(event => <MiniEvent key={event.id} event={event} onClick={onEventClick} />)}
                 </div>
               )}
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
     <Card className="overflow-hidden rounded-xl border">
       <CalendarHeader title={`${day.getDate()} ${MONTHS[day.getMonth()]} ${day.getFullYear()}`} prev="יום קודם" next="יום הבא" offset={offset} onOffsetChange={onOffsetChange} />
       <div className="p-4 space-y-2 min-h-[240px] pb-24 sm:pb-4">
         {dayEvents.length ? dayEvents.map(event => <EventRow key={event.id} event={event} onClick={onEventClick} />) : <p className="text-center text-sm text-muted-foreground py-16">אין אירועים ביום זה</p>}
       </div>
     </Card>
   );
 }

function CalendarHeader({ title, prev, next, offset, onOffsetChange }) {
   return (
     <div className="flex items-center justify-between p-3 border-b bg-muted/30 rounded-t-xl">
       <Button variant="ghost" size="sm" onClick={() => onOffsetChange(offset - 1)} className="h-8"><ChevronRight className="w-4 h-4" />{prev}</Button>
       <div className="font-semibold text-sm">{title}</div>
       <div className="flex gap-1">{offset !== 0 && <Button variant="outline" size="sm" onClick={() => onOffsetChange(0)} className="h-8">היום</Button>}<Button variant="ghost" size="sm" onClick={() => onOffsetChange(offset + 1)} className="h-8">{next}<ChevronLeft className="w-4 h-4" /></Button></div>
     </div>
   );
 }

function MiniEvent({ event, onClick }) {
   const typeColors = {
     'מבחן': 'bg-purple-200 dark:bg-purple-900/40',
     'בחן': 'bg-purple-200 dark:bg-purple-900/40',
     'עבודה': 'bg-blue-200 dark:bg-blue-900/40',
     'פרויקט': 'bg-blue-200 dark:bg-blue-900/40',
     'הגשה': 'bg-pink-200 dark:bg-pink-900/40',
     'חזרה': 'bg-emerald-200 dark:bg-emerald-900/40',
      'חזרות למסיבת סיום': 'bg-rose-200 dark:bg-rose-900/40',
     'אחר': 'bg-gray-200 dark:bg-gray-900/40'
   };
   const color = typeColors[event.type] || typeColors['אחר'];
   return (
     <button onClick={() => onClick(event)} className={`w-full text-right text-[10px] px-1.5 py-1 rounded-md border border-border/50 ${color} hover:shadow-sm transition-shadow group flex items-start gap-1.5`}>
       <div className="w-1 h-4 rounded-full shrink-0 opacity-70" style={{ backgroundColor: 'currentColor' }} />
       <div className="flex-1 min-w-0">
         <span className="font-medium truncate block text-foreground/90">{event.title}</span>
         {event.time && <span className="opacity-70 flex items-center gap-0.5 text-[9px]"><Clock className="w-2.5 h-2.5" />{event.end_time ? `${event.time}–${event.end_time}` : event.time}</span>}
       </div>
     </button>
   );
 }

function EventRow({ event, onClick }) {
   const displayType = getDisplayEventType(event);
   const sideColors = {
     'מבחן': 'bg-purple-400/60',
     'בחן': 'bg-purple-400/60',
     'עבודה': 'bg-blue-400/60',
     'פרויקט': 'bg-blue-400/60',
     'הגשה': 'bg-pink-400/60',
     'חזרה': 'bg-emerald-400/60',
     'חזרות למסיבת סיום': 'bg-rose-400/60',
     'אחר': 'bg-gray-400/40'
   };
   const sideColor = sideColors[event.type] || sideColors['אחר'];
   return (
     <button onClick={() => onClick(event)} className="w-full text-right rounded-lg border border-border bg-card p-3 hover:shadow-sm transition-all group flex overflow-hidden">
       <div className={`w-0.5 shrink-0 ${sideColor}`} />
       <div className="flex-1 min-w-0 px-3">
         <div className="flex items-center gap-2 flex-wrap justify-start"><h3 className="font-semibold text-foreground">{event.title}</h3><EventTypeBadge type={displayType} /></div>
         <div className="text-xs text-muted-foreground mt-1">{event.date}{event.time ? ` · ${event.end_time ? `${event.time}–${event.end_time}` : event.time}` : ''}{event.class_or_grade ? ` · ${event.class_or_grade}` : ''}</div>
       </div>
     </button>
   );
 }