import { Plus, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { colorToSubjectStyle } from '@/lib/scheduleSubjects';

// Weekly schedule grid — Sun → Thu only (no Friday), periods 1..N as rows.
// Slim, professional, mobile-friendly. Highlights today + current period.
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'];

export default function WeeklyScheduleGrid({ periods, slotsByKey, todayDayName, currentPeriod, canEdit, onCellClick, subjectsById = {} }) {
  // todayDayName might be 'שישי' or 'שבת' — only highlight if it's in DAYS list
  const highlightDay = DAYS.includes(todayDayName) ? todayDayName : null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden" dir="rtl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-center">
          <thead>
            <tr>
              <th className="bg-primary text-primary-foreground w-14 sm:w-16 p-0 border-b border-l border-primary/30 align-middle">
                <CornerHeader />
              </th>
              {DAYS.map(day => (
                <th
                  key={day}
                  className={cn(
                    'text-[11px] font-bold py-1.5 px-0.5 border-b border-l border-primary/30 last:border-l-0 relative',
                    day === highlightDay
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/85 text-primary-foreground/95'
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
              const isCurrentRow = highlightDay && Number(currentPeriod) === Number(p.period);
              return (
                <tr key={p.period}>
                  <td
                    className={cn(
                      'w-14 sm:w-16 font-bold border-b border-l border-border align-middle p-0',
                      rowIdx % 2 === 0 ? 'bg-muted/40' : 'bg-card',
                      isCurrentRow && 'bg-primary/10 text-primary',
                    )}
                  >
                    <div className="flex flex-col items-center justify-center gap-1 px-1 min-h-[46px] sm:min-h-[54px]">
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
                    const isToday = day === highlightDay;
                    const isNow = isToday && isCurrentRow;
                    return (
                      <Cell
                        key={day + p.period}
                        slot={slot}
                        isToday={isToday}
                        isNow={isNow}
                        canEdit={canEdit}
                        onClick={() => onCellClick(day, p.period, slot, p)}
                        subjectDefinition={slot?.subject_id ? subjectsById[slot.subject_id] : null}
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
    <div className="relative w-full h-10 sm:h-11 overflow-hidden select-none" aria-label="יום / שעה">
      {/* Top-left triangle (darker primary) */}
      <div
        className="absolute inset-0 bg-primary"
        style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
      />
      {/* Bottom-right triangle (lighter shade for contrast) */}
      <div
        className="absolute inset-0 bg-primary/75 dark:bg-primary/55"
        style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
      />
      {/* Diagonal divider line */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
        <line x1="100" y1="0" x2="0" y2="100" stroke="hsl(var(--primary-foreground))" strokeOpacity="0.45" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* "יום" — top-left triangle area */}
      <span className="absolute top-0.5 left-0.5 sm:left-1 text-[8px] sm:text-[9px] font-bold text-primary-foreground leading-none">
        יום
      </span>
      {/* "שעה" — bottom-right triangle area */}
      <span className="absolute bottom-0.5 right-0.5 sm:right-1 text-[8px] sm:text-[9px] font-bold text-primary-foreground leading-none">
        שעה
      </span>
    </div>
  );
}

function Cell({ slot, isToday, isNow, canEdit, onClick, subjectDefinition }) {
  const subjectStyle = slot ? colorToSubjectStyle(subjectDefinition?.color) : null;
  const group = slot?.notes?.match(/^\[קבוצה: ([^\]]+)\]/)?.[1];

  return (
    <td
      className={cn(
        'border-b border-l last:border-l-0 border-border align-middle p-0 transition-colors relative',
        isNow && 'ring-1 ring-inset ring-primary/40',
        !slot && (isNow ? 'bg-primary/15 dark:bg-primary/20' : isToday ? 'bg-primary/[0.05]' : ''),
        canEdit ? 'cursor-pointer hover:bg-accent/60' : (slot ? 'cursor-pointer hover:bg-accent/40' : 'cursor-default'),
      )}
      style={slot ? { backgroundColor: subjectStyle.backgroundColor } : undefined}
      onClick={canEdit || slot ? onClick : undefined}
    >
      {slot ? (
        <div className="px-1 py-1.5 min-h-[46px] sm:min-h-[54px] flex flex-col items-center justify-center gap-0.5 text-center">
          <div className="text-sm sm:text-base font-extrabold leading-tight truncate w-full" style={{ color: subjectStyle.color }}>
            {subjectDefinition?.name || slot.subject}
          </div>
          {slot.teacher && (
            <div className="text-[9px] text-muted-foreground leading-tight truncate w-full inline-flex items-center justify-center gap-0.5">
              <User className="w-2 h-2 flex-shrink-0" />
              <span className="truncate">{slot.teacher}</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-0.5 text-[9px] text-muted-foreground/90 leading-tight">
            {slot.room && <span className="inline-flex items-center gap-0.5"><MapPin className="w-2 h-2" />{slot.room}</span>}
            {group && <span className="inline-flex items-center gap-0.5">· {group}</span>}
          </div>
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
          ) : (
            <span className="text-[10px] text-muted-foreground/30">—</span>
          )}
        </div>
      )}
    </td>
  );
}