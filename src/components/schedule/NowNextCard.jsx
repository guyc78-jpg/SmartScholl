import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, BookOpen, ChevronLeft, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRemaining, invalidateBellCache } from '@/lib/bellSchedule';
import { loadScheduleNowNextData, resolveScheduleNowNext } from '@/lib/scheduleNowNext';

// Smart "now / next" card driven by real ScheduleSlot lessons for class + day, enriched with the same bell times shown in Schedule.
export default function NowNextCard({ classId, className, showEmpty = false }) {
  const [state, setState] = useState({ loading: true, current: null, next: null, remainingMins: 0 });
  const slotsRef = useRef([]);
  const periodsRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    let tickTimer;

    const updateFromSlots = () => {
      const { current, next, remainingMins } = resolveScheduleNowNext(slotsRef.current, periodsRef.current);
      if (!cancelled) setState({ loading: false, current, next, remainingMins });
    };

    async function refreshSlots() {
      const result = await loadScheduleNowNextData(classId);
      slotsRef.current = result.slots;
      periodsRef.current = result.periods;
      if (!cancelled) {
        setState({ loading: false, current: result.current, next: result.next, remainingMins: result.remainingMins });
      }
    }

    refreshSlots();
    tickTimer = setInterval(updateFromSlots, 30_000);
    const unsubscribeSlots = base44.entities.ScheduleSlot.subscribe((event) => {
      const data = event?.data;
      if (!data || data.class_id === classId) refreshSlots();
    });
    const unsubscribeBells = base44.entities.BellSchedule.subscribe(() => {
      invalidateBellCache();
      refreshSlots();
    });

    return () => {
      cancelled = true;
      clearInterval(tickTimer);
      unsubscribeSlots?.();
      unsubscribeBells?.();
    };
  }, [classId]);

  if (state.loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="h-20 rounded-lg bg-muted/40 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const { current, next, remainingMins } = state;

  if (!current && !next) {
    if (!showEmpty) return null;
    return (
      <Card className={className}>
        <CardContent className="p-3 sm:p-4 text-right" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground/80">מערכת שעות</p>
              <p className="text-xs text-muted-foreground">
                {classId ? 'אין שיעורים מתוכננים להיום' : 'לא שויכת לכיתה — בדוק הגדרות פרופיל'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-3 sm:p-4 text-right" dir="rtl">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-3 sm:gap-4 items-stretch">
          <LessonBlock title="השיעור עכשיו" slot={current} emptyText="אין שיעור כרגע" remainingMins={current ? remainingMins : null} />
          <div className="hidden sm:block w-px bg-border/60 self-stretch" />
          <div className="sm:hidden h-px bg-border/60" />
          <LessonBlock title="השיעור הבא" slot={next} emptyText="אין שיעור נוסף היום" timeToNext={!current ? remainingMins : null} muted />
        </div>
      </CardContent>
    </Card>
  );
}

function LessonBlock({ title, slot, emptyText, remainingMins, timeToNext, muted = false }) {
  if (!slot) {
    return (
      <div className="flex items-center gap-3 text-right" dir="rtl">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
          {muted ? <ChevronLeft className="w-5 h-5 text-muted-foreground" /> : <Clock className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</p>
          <p className="text-sm font-medium text-muted-foreground">{emptyText}</p>
        </div>
      </div>
    );
  }

  const timeRange = slot.end_time ? `${slot.start_time}–${slot.end_time}` : slot.start_time;

  return (
    <div className="flex items-start gap-3 min-w-0 text-right" dir="rtl">
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
        muted ? 'bg-muted text-muted-foreground' : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
      )}>
        <BookOpen className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0 text-right">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</p>
          <span className="text-[10px] text-muted-foreground force-ltr">{timeRange}</span>
        </div>
        <p className="text-base font-bold truncate text-foreground/90">{slot.subject}</p>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground justify-end" dir="rtl">
          {slot.teacher && <span className="inline-flex items-center gap-0.5"><User className="w-3 h-3" />{slot.teacher}</span>}
          {slot.room && <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" />{slot.room}</span>}
        </div>
        {remainingMins != null && (
          <div className="mt-1.5 flex items-baseline gap-1.5 justify-end">
            <span className="text-[10px] text-muted-foreground">נותר:</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-300">{formatRemaining(remainingMins)}</span>
          </div>
        )}
        {timeToNext != null && timeToNext > 0 && (
          <div className="mt-1.5 flex items-baseline gap-1.5 justify-end">
            <span className="text-[10px] text-muted-foreground">בעוד:</span>
            <span className="text-sm font-bold text-foreground">{formatRemaining(timeToNext)}</span>
          </div>
        )}
      </div>
    </div>
  );
}