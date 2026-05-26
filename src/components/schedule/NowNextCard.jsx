import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Coffee, BookOpen, ChevronLeft, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getTodayDayType, getTodayHebrewName, getNowAndNext,
  loadBellSchedule, findSlotForPeriod, formatRemaining
} from '@/lib/bellSchedule';

// Smart "now / next" card driven by bell schedule + class ScheduleSlot enrichment.
export default function NowNextCard({ classId, className }) {
  const [state, setState] = useState({ loading: true, current: null, next: null, remainingMins: 0, currentSlot: null, nextSlot: null });

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function refresh() {
      const dayType = getTodayDayType();
      const periods = await loadBellSchedule(dayType);
      const todayName = getTodayHebrewName();
      const slots = classId
        ? await base44.entities.ScheduleSlot.filter({ class_id: classId, day: todayName }).catch(() => [])
        : [];
      const tick = () => {
        const { current, next, remainingMins } = getNowAndNext(periods);
        const currentSlot = current?.kind === 'lesson' ? findSlotForPeriod(slots, current.period) : null;
        const nextSlot = next?.kind === 'lesson' ? findSlotForPeriod(slots, next.period) : null;
        if (!cancelled) setState({ loading: false, current, next, remainingMins, currentSlot, nextSlot });
      };
      tick();
      timer = setInterval(tick, 30_000);
    }
    refresh();
    return () => { cancelled = true; if (timer) clearInterval(timer); };
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

  const { current, next, remainingMins, currentSlot, nextSlot } = state;

  // Outside school day
  if (!current && !next) {
    return (
      <Card className={className}>
        <CardContent className="p-4 flex items-center gap-3 text-right" dir="rtl">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">אין שיעורים כרגע</p>
            <p className="text-xs text-muted-foreground">יום לימודים הסתיים או טרם החל</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-3 sm:p-4 text-right" dir="rtl">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-3 sm:gap-4 items-stretch">
          {/* NOW block */}
          <NowBlock current={current} currentSlot={currentSlot} remainingMins={remainingMins} hasNext={!!next} />

          {/* Divider */}
          <div className="hidden sm:block w-px bg-border/60 self-stretch" />
          <div className="sm:hidden h-px bg-border/60" />

          {/* NEXT block */}
          <NextBlock next={next} nextSlot={nextSlot} hasCurrent={!!current} timeToNext={!current ? remainingMins : null} />
        </div>
      </CardContent>
    </Card>
  );
}

function NowBlock({ current, currentSlot, remainingMins, hasNext }) {
  if (!current) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">עכשיו</p>
          <p className="text-sm font-medium text-muted-foreground">לפני תחילת היום</p>
        </div>
      </div>
    );
  }

  const isBreak = current.kind === 'break';
  const isLesson = current.kind === 'lesson';
  const isHomeroom = current.kind === 'homeroom';

  const accent = isLesson
    ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    : isBreak
      ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
      : 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';

  const remainColor = isBreak
    ? 'text-amber-600 dark:text-amber-300'
    : isLesson ? 'text-emerald-600 dark:text-emerald-300'
    : 'text-blue-600 dark:text-blue-300';

  const Icon = isBreak ? Coffee : isLesson ? BookOpen : Clock;
  const header = isLesson ? 'השיעור עכשיו' : isBreak ? 'הפסקה עכשיו' : isHomeroom ? 'מחנך עכשיו' : 'עכשיו';
  const mainLine = (isLesson && currentSlot?.subject) ? currentSlot.subject : current.label;
  const remainLabel = isBreak ? 'עד הצלצול' : 'נותר';

  return (
    <div className="flex items-start gap-3 min-w-0">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{header}</p>
          <span className="text-[10px] text-muted-foreground force-ltr">{current.start_time}–{current.end_time}</span>
        </div>
        <p className="text-base font-bold truncate">{mainLine}</p>
        {isLesson && currentSlot && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
            {currentSlot.teacher && <span className="inline-flex items-center gap-0.5"><User className="w-3 h-3" />{currentSlot.teacher}</span>}
            {currentSlot.room && <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" />{currentSlot.room}</span>}
          </div>
        )}
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-[10px] text-muted-foreground">{remainLabel}:</span>
          <span className={cn('text-sm font-bold', remainColor)}>{formatRemaining(remainingMins)}</span>
        </div>
      </div>
    </div>
  );
}

function NextBlock({ next, nextSlot, hasCurrent, timeToNext }) {
  if (!next) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">הבא</p>
          <p className="text-sm font-medium text-muted-foreground">סיום יום הלימודים</p>
        </div>
      </div>
    );
  }

  const isBreak = next.kind === 'break';
  const isLesson = next.kind === 'lesson';
  const mainLine = (isLesson && nextSlot?.subject) ? nextSlot.subject : next.label;
  const Icon = isBreak ? Coffee : isLesson ? BookOpen : Clock;

  return (
    <div className="flex items-start gap-3 min-w-0">
      <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">הבא</p>
          <span className="text-[10px] text-muted-foreground force-ltr">{next.start_time}</span>
        </div>
        <p className="text-base font-bold truncate text-foreground/90">{mainLine}</p>
        {isLesson && nextSlot && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
            {nextSlot.teacher && <span className="inline-flex items-center gap-0.5"><User className="w-3 h-3" />{nextSlot.teacher}</span>}
            {nextSlot.room && <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" />{nextSlot.room}</span>}
          </div>
        )}
        {!hasCurrent && timeToNext != null && timeToNext > 0 && (
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-[10px] text-muted-foreground">בעוד:</span>
            <span className="text-sm font-bold text-foreground">{formatRemaining(timeToNext)}</span>
          </div>
        )}
      </div>
    </div>
  );
}