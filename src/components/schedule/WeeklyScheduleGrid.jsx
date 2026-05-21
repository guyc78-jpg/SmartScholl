import { Plus, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// Weekly schedule grid — Sun → Thu (RTL: Sunday rightmost), periods 1..N as rows.
// Slim, professional, mobile-friendly. Inspired by the reference design.
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

export default function WeeklyScheduleGrid({ periods, slotsByKey, todayDayName, canEdit, onCellClick }) {
  // periods: [{ period, start_time, end_time, label }]
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden" dir="rtl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-center">
          <thead>
            <tr>
              {/* Right header cell: "יום / שעה" */}
              <th className="bg-primary text-primary-foreground text-[11px] font-bold w-16 sm:w-20 py-2 px-1 border-b border-l border-primary/30">
                <div className="leading-tight">
                  <div>יום</div>
                  <div className="opacity-80">שעה</div>
                </div>
              </th>
              {DAYS.map(day => (
                <th
                  key={day}
                  className={cn(
                    'text-[12px] font-bold py-2 px-1 border-b border-l border-primary/30 last:border-l-0',
                    day === todayDayName
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/85 text-primary-foreground/95'
                  )}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p, rowIdx) => (
              <tr key={p.period}>
                <td
                  className={cn(
                    'w-16 sm:w-20 align-middle text-center font-bold text-xs sm:text-sm py-2 px-1 border-b border-l border-border',
                    rowIdx % 2 === 0 ? 'bg-muted/40' : 'bg-card',
                  )}
                >
                  <div className="text-foreground">{p.period}</div>
                  {p.start_time && (
                    <div className="force-ltr text-[9px] text-muted-foreground mt-0.5">
                      {p.start_time}
                    </div>
                  )}
                </td>
                {DAYS.map(day => {
                  const slot = slotsByKey[`${day}|${p.period}`];
                  const isToday = day === todayDayName;
                  return (
                    <Cell
                      key={day + p.period}
                      slot={slot}
                      day={day}
                      period={p.period}
                      isToday={isToday}
                      canEdit={canEdit}
                      onClick={() => onCellClick(day, p.period, slot, p)}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ slot, isToday, canEdit, onClick }) {
  const color = slot ? (subjectColors[slot.subject] || 'text-foreground') : '';
  const group = slot?.notes?.match(/^\[קבוצה: ([^\]]+)\]/)?.[1];

  return (
    <td
      className={cn(
        'border-b border-l last:border-l-0 border-border align-middle p-0 transition-colors',
        isToday ? 'bg-primary/[0.06]' : '',
        canEdit ? 'cursor-pointer hover:bg-accent/60' : 'cursor-default',
      )}
      onClick={canEdit || slot ? onClick : undefined}
    >
      {slot ? (
        <div className="px-1.5 py-2 min-h-[58px] sm:min-h-[68px] flex flex-col items-center justify-center gap-0.5 text-center">
          <div className={cn('text-[12px] sm:text-sm font-bold leading-tight truncate w-full', color)}>
            {slot.subject}
          </div>
          {(slot.teacher || group) && (
            <div className="text-[10px] text-muted-foreground leading-tight truncate w-full flex items-center justify-center gap-1">
              {slot.teacher && <span className="truncate"><User className="w-2.5 h-2.5 inline ms-0.5 -mt-0.5" />{slot.teacher}</span>}
            </div>
          )}
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground/90 leading-tight">
            {slot.room && <span className="inline-flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{slot.room}</span>}
            {group && <span className="inline-flex items-center gap-0.5">· {group}</span>}
          </div>
        </div>
      ) : (
        <div className="px-1 py-2 min-h-[58px] sm:min-h-[68px] flex items-center justify-center text-muted-foreground/40">
          {canEdit ? <Plus className="w-4 h-4" /> : <span className="text-[10px]">—</span>}
        </div>
      )}
    </td>
  );
}