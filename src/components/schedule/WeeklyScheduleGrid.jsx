import { Plus, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// Weekly schedule grid — Sun → Thu only (no Friday), periods 1..N as rows.
// Slim, professional, mobile-friendly. Highlights today + current period.
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'];

const subjectColors = {
  'מתמטיקה': 'text-blue-700 dark:text-blue-300',
  'עברית': 'text-emerald-700 dark:text-emerald-300',
  'ספרות': 'text-purple-700 dark:text-purple-300',
  'אנגלית': 'text-amber-700 dark:text-amber-300',
  'היסטוריה': 'text-orange-700 dark:text-orange-300',
  'פיזיקה': 'text-cyan-700 dark:text-cyan-300',
  'כימיה': 'text-pink-700 dark:text-pink-300',
  'ביולוגיה': 'text-green-700 dark:text-green-300',
  'שעת חינוך': 'text-indigo-700 dark:text-indigo-300',
  'תנ"ך': 'text-rose-700 dark:text-rose-300',
};

export default function WeeklyScheduleGrid({ periods, slotsByKey, todayDayName, currentPeriod, canEdit, onCellClick }) {
  // todayDayName might be 'שישי' or 'שבת' — only highlight if it's in DAYS list
  const highlightDay = DAYS.includes(todayDayName) ? todayDayName : null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden" dir="rtl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-center">
          <thead>
            <tr>
              <th className="bg-primary text-primary-foreground w-16 sm:w-20 p-0 border-b border-l border-primary/30 align-middle">
                <CornerHeader />
              </th>
              {DAYS.map(day => (
                <th
                  key={day}
                  className={cn(
                    'text-[12px] font-bold py-2 px-1 border-b border-l border-primary/30 last:border-l-0 relative',
                    day === highlightDay
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/85 text-primary-foreground/95'
                  )}
                >
                  {day}
                  {day === highlightDay && (
                    <span className="block text-[9px] font-normal opacity-90 mt-0.5">היום</span>
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
                      'w-16 sm:w-20 align-middle text-center font-bold text-xs sm:text-sm py-2 px-1 border-b border-l border-border',
                      rowIdx % 2 === 0 ? 'bg-muted/40' : 'bg-card',
                      isCurrentRow && 'bg-primary/10 text-primary',
                    )}
                  >
                    <div className={cn(isCurrentRow ? 'text-primary' : 'text-foreground')}>{p.period}</div>
                    {p.start_time && (
                      <div className="force-ltr text-[9px] text-muted-foreground mt-0.5">
                        {p.start_time}
                      </div>
                    )}
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
    <div className="relative w-full h-12 sm:h-14 overflow-hidden select-none" aria-label="יום / שעה">
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
      <span className="absolute top-0.5 left-1 sm:left-1.5 text-[10px] sm:text-[11px] font-bold text-primary-foreground leading-none">
        יום
      </span>
      {/* "שעה" — bottom-right triangle area */}
      <span className="absolute bottom-0.5 right-1 sm:right-1.5 text-[10px] sm:text-[11px] font-bold text-primary-foreground leading-none">
        שעה
      </span>
    </div>
  );
}

function Cell({ slot, isToday, isNow, canEdit, onClick }) {
  const color = slot ? (subjectColors[slot.subject] || 'text-foreground') : '';
  const group = slot?.notes?.match(/^\[קבוצה: ([^\]]+)\]/)?.[1];

  return (
    <td
      className={cn(
        'border-b border-l last:border-l-0 border-border align-middle p-0 transition-colors relative',
        isNow ? 'bg-primary/15 dark:bg-primary/20 ring-1 ring-inset ring-primary/40'
              : isToday ? 'bg-primary/[0.05]' : '',
        canEdit ? 'cursor-pointer hover:bg-accent/60' : (slot ? 'cursor-pointer hover:bg-accent/40' : 'cursor-default'),
      )}
      onClick={canEdit || slot ? onClick : undefined}
    >
      {slot ? (
        <div className="px-1.5 py-2 min-h-[58px] sm:min-h-[68px] flex flex-col items-center justify-center gap-0.5 text-center">
          <div className={cn('text-[12px] sm:text-sm font-bold leading-tight truncate w-full', color)}>
            {slot.subject}
          </div>
          {slot.teacher && (
            <div className="text-[10px] text-muted-foreground leading-tight truncate w-full inline-flex items-center justify-center gap-0.5">
              <User className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{slot.teacher}</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground/90 leading-tight">
            {slot.room && <span className="inline-flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{slot.room}</span>}
            {group && <span className="inline-flex items-center gap-0.5">· {group}</span>}
          </div>
        </div>
      ) : (
        <div className="px-1 py-2 min-h-[58px] sm:min-h-[68px] flex items-center justify-center">
          {canEdit ? (
            <div className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/10 hover:text-primary flex items-center justify-center text-muted-foreground/50 transition-all">
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground/30">—</span>
          )}
        </div>
      )}
    </td>
  );
}