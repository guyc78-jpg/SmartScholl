import { Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { colorToSubjectStyle } from '@/lib/scheduleSubjects';
import { getUnitLabel, groupSlotsByBaseSubject, stripUnitFromRoom } from '@/lib/scheduleLessonGrouping';

// Weekly schedule grid — Sun → Fri, periods 1..N as rows.
// Slim, professional, mobile-friendly. Highlights today + current period.
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'];

export default function WeeklyScheduleGrid({ periods, slotsByKey, todayDayName, currentPeriod, canEdit, onCellClick = null, subjectsById = {} }) {
  // todayDayName might be 'שישי' or 'שבת' — only highlight if it's in DAYS list
  const highlightDay = DAYS.includes(todayDayName) ? todayDayName : null;

  return (
    <div className="liquid-sheet rounded-3xl border border-border/60 overflow-hidden shadow-[0_18px_44px_rgba(28,45,37,0.08)]" dir="rtl">
      <div>
        <table className="w-full table-fixed border-collapse text-center">
          <colgroup>
            <col className="w-10 sm:w-16" />
            {DAYS.map(day => <col key={day} style={{ width: `${80 / DAYS.length}%` }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="bg-muted/55 text-foreground p-0 border-b border-l border-border/55 align-middle">
                <CornerHeader />
              </th>
              {DAYS.map(day => (
                <th
                  key={day}
                  className={cn(
                    'text-[11px] font-bold py-1.5 px-0.5 border-b border-l border-primary/30 last:border-l-0 relative',
                    day === highlightDay
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted/45 text-foreground/80'
                  )}
                >
                  {day}
                  {day === highlightDay && (
                    <span className="block text-[8px] font-normal opacity-90 mt-0.5">היום</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p, rowIdx) => {
              const isBreakRow = p.kind === 'break';
              const isCurrentRow = highlightDay && Number(currentPeriod) === Number(p.period);
              if (isBreakRow) {
                return (
                  <tr key={p.row_key || `break-${p.start_time}-${rowIdx}`}>
                    <td className="border-b border-l border-border bg-secondary/10 p-1 align-middle text-center">
                      <div className="flex min-h-[34px] flex-col items-center justify-center gap-0.5 px-0.5 sm:px-1">
                        <div className="text-[10px] sm:text-xs font-extrabold text-secondary-foreground">הפסקה</div>
                        {p.start_time && <div className="force-ltr text-[9px] sm:text-[10px] font-bold text-foreground/80">{p.start_time}</div>}
                      </div>
                    </td>
                    <td colSpan={DAYS.length} className="border-b border-border bg-secondary/10 px-2 py-1 text-center align-middle">
                      <div className="flex min-h-[34px] items-center justify-center gap-2 rounded-lg border border-secondary/20 bg-secondary/10 text-center text-xs font-bold text-secondary-foreground" dir="rtl">
                        <span>{p.label || 'הפסקה'}</span>
                        {p.start_time && p.end_time && <span className="force-ltr text-[11px] font-semibold text-muted-foreground">{p.start_time}–{p.end_time}</span>}
                      </div>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={p.row_key || p.period}>
                  <td
                    className={cn(
                      'font-bold border-b border-l border-border align-middle p-0',
                      rowIdx % 2 === 0 ? 'bg-muted/40' : 'bg-card',
                      isCurrentRow && 'bg-primary/10 text-primary',
                    )}
                  >
                    <div className="flex flex-col items-center justify-center gap-1 px-0.5 sm:px-1 min-h-[56px] sm:min-h-[64px]">
                      <div className={cn('text-xs sm:text-sm leading-none', isCurrentRow ? 'text-primary' : 'text-foreground')}>
                        {p.period}
                      </div>
                      {p.start_time && (
                        <div className="force-ltr text-[10px] sm:text-xs font-bold leading-none text-foreground/85 dark:text-foreground/90">
                          {p.start_time}
                        </div>
                      )}
                    </div>
                  </td>
                  {DAYS.map(day => {
                    const slot = slotsByKey[`${day}|${p.period}`];
                    const cellSlots = Array.isArray(slot) ? slot : (slot ? [slot] : []);
                    const isToday = day === highlightDay;
                    const isNow = isToday && isCurrentRow;
                    const isInteractive = canEdit || (cellSlots.length > 0 && typeof onCellClick === 'function');
                    return (
                      <Cell
                        key={day + p.period}
                        slots={cellSlots}
                        day={day}
                        period={p.period}
                        isToday={isToday}
                        isNow={isNow}
                        canEdit={canEdit}
                        interactive={isInteractive}
                        onClick={isInteractive ? () => onCellClick?.(day, p.period, cellSlots[0], p) : undefined}
                        subjectsById={subjectsById}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CornerHeader() {
  // Diagonal-split corner: "יום" top-left, "שעה" bottom-right.
  // Triangles use primary + a slightly lighter shade, separated by a clean diagonal line.
  return (
    <div className="relative w-full h-10 sm:h-11 overflow-hidden select-none bg-muted/55" aria-label="יום / שעה">
      <span className="absolute inset-x-2 top-1/2 h-px -rotate-45 bg-border/80" aria-hidden />
      {/* "יום" — top-left triangle area */}
      <span className="absolute top-0.5 left-0.5 sm:left-1 text-[8px] sm:text-[9px] font-bold text-muted-foreground leading-none">
        יום
      </span>
      {/* "שעה" — bottom-right triangle area */}
      <span className="absolute bottom-0.5 right-0.5 sm:right-1 text-[8px] sm:text-[9px] font-bold text-muted-foreground leading-none">
        שעה
      </span>
    </div>
  );
}

function Cell({ slots = [], day, period, isToday, isNow, canEdit, interactive, onClick, subjectsById }) {
  const hasSlots = slots.length > 0;
  const primarySlot = slots[0];
  const primarySubject = primarySlot?.subject_id ? subjectsById[primarySlot.subject_id] : null;
  const primaryStyle = hasSlots ? colorToSubjectStyle(primarySubject?.color) : null;
  const subjectNames = groupSlotsByBaseSubject(slots).map(group => group.subject).filter(Boolean).join(', ');
  const accessibleLabel = hasSlots
    ? `${day}, שיעור ${period}: ${subjectNames || 'שיעור קיים'}`
    : `${day}, שיעור ${period}: הוספת שיעור`;

  return (
    <td
      className={cn(
        'border-b border-l last:border-l-0 border-border align-top p-0 transition-colors relative',
        isNow && 'ring-1 ring-inset ring-primary/40',
        !hasSlots && (isNow ? 'bg-primary/15 dark:bg-primary/20' : isToday ? 'bg-primary/[0.05]' : ''),
        interactive ? (canEdit ? 'cursor-pointer hover:bg-accent/60' : 'cursor-pointer hover:bg-accent/40') : 'cursor-default',
      )}
      style={hasSlots ? { backgroundColor: primaryStyle.backgroundColor } : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? accessibleLabel : undefined}
      aria-current={isNow ? 'time' : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? (event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      {hasSlots ? (
        <div className="px-0.5 sm:px-1 py-1 min-h-[56px] sm:min-h-[64px] flex flex-col items-stretch justify-center gap-1 text-center">
          {groupSlotsByBaseSubject(slots).map((lessonGroup, index) => {
            const firstSlot = lessonGroup.slots[0];
            const subjectDefinition = firstSlot?.subject_id ? subjectsById[firstSlot.subject_id] : null;
            const subjectStyle = colorToSubjectStyle(subjectDefinition?.color);
            return (
              <div key={`${lessonGroup.subject}-${index}`} className={cn('min-w-0 text-right', index > 0 && 'border-t border-border/50 pt-1')} dir="rtl">
                <div className="text-[10px] sm:text-sm font-extrabold leading-tight w-full line-clamp-1" style={{ color: subjectStyle.color }}>
                  {lessonGroup.subject}
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {lessonGroup.slots.map((slot, unitIndex) => {
                    const unitLabel = getUnitLabel(slot);
                    const room = stripUnitFromRoom(slot.room, unitLabel);
                    const group = slot?.notes?.match(/^\[קבוצה: ([^\]]+)\]/)?.[1];
                    return (
                      <div key={slot.id || unitIndex} className="flex items-center justify-start gap-1 text-[8px] sm:text-[9px] text-muted-foreground leading-tight min-w-0">
                        <User className="w-2 h-2 shrink-0" />
                        <span className="truncate">
                          {unitLabel && <span className="font-semibold text-foreground/80">{unitLabel} – </span>}
                          {slot.teacher || 'ללא מורה'}
                          {(room || group) && <span className="text-muted-foreground/80"> · {room || group}</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-1 py-1.5 min-h-[46px] sm:min-h-[54px] flex flex-col items-center justify-center gap-1">
          {canEdit ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/10 hover:text-primary flex items-center justify-center text-muted-foreground/50 transition-all cursor-pointer">
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>הוסף שיעור</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      )}
    </td>
  );
}