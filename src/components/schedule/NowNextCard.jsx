import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRemaining, invalidateBellCache } from '@/lib/bellSchedule';
import { colorToSubjectStyle, subjectMapById } from '@/lib/scheduleSubjects';
import { loadScheduleNowNextData, resolveScheduleNowNext } from '@/lib/scheduleNowNext';

// Smart "now / next" card driven by real ScheduleSlot lessons for class + day, enriched with the same bell times shown in Schedule.
export default function NowNextCard({ classId, className = '', showEmpty = false }) {
  const [state, setState] = useState({ loading: true, current: null, next: null, remainingMins: 0 });
  const [subjectsById, setSubjectsById] = useState({});
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
      const subjects = await base44.entities.SchoolSubject.list('-updated_date', 500);
      if (!cancelled) setSubjectsById(subjectMapById(subjects || []));
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
        <CardContent className="p-2 sm:p-2.5">
          <div className="h-[90px] rounded-xl bg-muted/40 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const { current, next, remainingMins } = state;

  if (!current && !next) {
    if (!showEmpty) return null;
    return (
      <Card className={className}>
        <CardContent className="p-2 sm:p-2.5 text-right" dir="rtl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-muted-foreground" />
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
      <CardContent className="p-2 sm:p-2.5 text-right" dir="rtl">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 items-stretch" dir="rtl">
          <LessonBlock title="השיעור עכשיו" slot={current} emptyText="אין שיעור כרגע" remainingMins={current ? remainingMins : null} subjectDefinition={current?.subject_id ? subjectsById[current.subject_id] : null} />
          <LessonBlock title="השיעור הבא" slot={next} emptyText="אין שיעור נוסף היום" timeToNext={!current ? remainingMins : null} subjectDefinition={next?.subject_id ? subjectsById[next.subject_id] : null} muted />
        </div>
      </CardContent>
    </Card>
  );
}

function LessonBlock({ title, slot, emptyText, remainingMins = null, timeToNext = null, subjectDefinition, muted = false }) {
  const subjectStyle = slot && subjectDefinition ? colorToSubjectStyle(subjectDefinition.color) : null;
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
          : slot.kind === 'break' ? 'הפסקה פעילה עכשיו' : 'מתקיים כעת'
    : muted
      ? 'אין שיעור נוסף היום'
      : 'אין שיעור פעיל כרגע';

  const metaText = slot
    ? [slot.teacher, slot.room].filter(Boolean).join(' • ') || 'ללא פרטים נוספים'
    : 'ללא פרטים נוספים';

  return (
    <div
      className={cn(
        'grid h-[90px] min-w-0 grid-rows-[14px_24px_14px_14px] items-start rounded-xl border px-2.5 py-2 text-right',
        muted ? 'border-border/70 bg-muted/20' : slot?.kind === 'break' ? 'border-amber-200/70 bg-amber-50/40 dark:border-amber-800/70 dark:bg-amber-900/15' : 'border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-800/70 dark:bg-emerald-900/15'
      )}
      style={subjectStyle ? { backgroundColor: subjectStyle.backgroundColor, borderColor: `${subjectStyle.color}55` } : undefined}
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-1.5" dir="rtl">
        <span className={cn(
          'rounded-full px-1 py-0.5 text-[8px] font-semibold leading-none',
          muted ? 'bg-muted text-muted-foreground' : slot?.kind === 'break' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
        )}>
          {title}
        </span>
        <span className="text-[9px] font-medium text-muted-foreground force-ltr">{timeRange}</span>
      </div>

      <p className={cn(
        'w-full truncate text-sm font-extrabold leading-[1.6]',
        !slot && 'text-muted-foreground'
      )} style={subjectStyle ? { color: subjectStyle.color } : undefined}>
        {subjectDefinition?.name || slot?.subject || emptyText}
      </p>

      <p className={cn(
        'w-full truncate text-[9px] font-medium',
        slot && remainingMins != null ? slot.kind === 'break' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'
      )}>
        {statusText}
      </p>

      <p className="w-full truncate text-[9px] text-muted-foreground">
        {metaText}
      </p>
    </div>
  );
}