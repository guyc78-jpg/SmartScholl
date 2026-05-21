import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Coffee, BookOpen, ArrowLeft } from 'lucide-react';
import {
  getTodayDayType, getTodayHebrewName, getNowAndNext,
  loadBellSchedule, findSlotForPeriod, formatRemaining
} from '@/lib/bellSchedule';

// Smart "now / next" card driven by bell schedule + class ScheduleSlot enrichment.
// Lightweight, single card, RTL-friendly, dark-mode aware.
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
      <Card>
        <CardContent className="p-4">
          <div className="h-12 rounded-lg bg-muted/40 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const { current, next, remainingMins, currentSlot, nextSlot } = state;

  // Outside school day
  if (!current && !next) {
    return (
      <Card>
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

  const isBreak = current?.kind === 'break';
  const isLesson = current?.kind === 'lesson';
  const isHomeroom = current?.kind === 'homeroom';
  const isPreBell = current?.kind === 'pre_bell';

  const accent = isLesson
    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
    : isBreak
      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';

  const Icon = isBreak ? Coffee : isLesson ? BookOpen : Clock;
  const headerText = !current
    ? 'מתחיל בקרוב'
    : isLesson ? 'השיעור עכשיו'
    : isBreak ? 'הפסקה'
    : isHomeroom ? 'בוקר טוב מחנך'
    : isPreBell ? 'צלצול מקדים'
    : 'עכשיו';

  const mainLine = current
    ? (isLesson && currentSlot?.subject ? currentSlot.subject : current.label)
    : (next?.kind === 'lesson' && nextSlot?.subject ? nextSlot.subject : next?.label);
  const subBits = [];
  if (current?.kind === 'lesson' && currentSlot?.teacher) subBits.push(currentSlot.teacher);
  if (current?.kind === 'lesson' && currentSlot?.room) subBits.push(`חדר ${currentSlot.room}`);
  if (!current && next?.kind === 'lesson' && nextSlot?.teacher) subBits.push(nextSlot.teacher);
  if (!current && next?.kind === 'lesson' && nextSlot?.room) subBits.push(`חדר ${nextSlot.room}`);

  const range = current
    ? `${current.start_time}–${current.end_time}`
    : next ? `${next.start_time}` : '';

  return (
    <Card className={className}>
      <CardContent className="p-4 text-right" dir="rtl">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{headerText}</p>
              <span className="text-xs text-muted-foreground">{range}</span>
            </div>
            <p className="text-base font-bold truncate">{mainLine}</p>
            {subBits.length > 0 && (
              <p className="text-xs text-muted-foreground truncate">{subBits.join(' · ')}</p>
            )}
          </div>
          <div className="text-left flex-shrink-0">
            <p className="text-[10px] text-muted-foreground">{current ? 'נותר' : 'בעוד'}</p>
            <p className={`text-sm font-bold ${isBreak ? 'text-amber-600 dark:text-amber-400' : isLesson ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
              {formatRemaining(remainingMins)}
            </p>
          </div>
        </div>

        {/* Next item line — only if we currently have something AND next exists */}
        {current && next && (
          <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>הבא:</span>
            <span className="font-medium text-foreground truncate">
              {next.kind === 'lesson' && nextSlot?.subject ? nextSlot.subject : next.label}
            </span>
            <span className="ms-auto">{next.start_time}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}