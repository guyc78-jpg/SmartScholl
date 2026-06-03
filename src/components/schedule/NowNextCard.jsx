import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
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
        <CardContent className="p-2.5 sm:p-3">
          <div className="h-[112px] rounded-xl bg-muted/40 animate-pulse" />
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
      <CardContent className="p-2.5 sm:p-3 text-right" dir="rtl">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 items-stretch" dir="rtl">
          <LessonBlock title="השיעור עכשיו" slot={current} emptyText="אין שיעור כרגע" remainingMins={current ? remainingMins : null} />
          <LessonBlock title="השיעור הבא" slot={next} emptyText="אין שיעור נוסף היום" timeToNext={!current ? remainingMins : null} muted />
        </div>
      </CardContent>
    </Card>
  );
}

function LessonBlock({ title, slot, emptyText, remainingMins, timeToNext, muted = false }) {
  const timeRange = slot?.start_time
    ? slot.end_time ? `${slot.start_time}–${slot.end_time}` : slot.start_time
    : '—';

  const statusText = slot
    ? remainingMins != null
      ? `נותר ${formatRemaining(remainingMins)}`
      : timeToNext != null && timeToNext > 0
        ? `בעוד ${formatRemaining(timeToNext)}`
        : muted
          ? 'מתחיל בקרוב'
          : 'מתקיים כעת'
    : muted
      ? 'אין שיעור נוסף היום'
      : 'אין שיעור פעיל כרגע';

  const metaText = slot
    ? [slot.teacher, slot.room].filter(Boolean).join(' • ') || 'ללא פרטים נוספים'
    : 'ללא פרטים נוספים';

  return (
    <div
      className={cn(
        'grid h-[112px] min-w-0 grid-rows-[18px_30px_18px_18px] items-start rounded-xl border px-3 py-2.5 text-right',
        muted ? 'border-border/70 bg-muted/20' : 'border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-800/70 dark:bg-emerald-900/15'
      )}
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-2" dir="rtl">
        <span className={cn(
          'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
          muted ? 'bg-muted text-muted-foreground' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
        )}>
          {title}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground force-ltr">{timeRange}</span>
      </div>

      <p className={cn(
        'w-full truncate text-sm font-bold leading-[1.9] sm:text-[15px]',
        slot ? 'text-foreground' : 'text-muted-foreground'
      )}>
        {slot?.subject || emptyText}
      </p>

      <p className={cn(
        'w-full truncate text-[11px] font-medium',
        slot && remainingMins != null ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'
      )}>
        {statusText}
      </p>

      <p className="w-full truncate text-[11px] text-muted-foreground">
        {metaText}
      </p>
    </div>
  );
}