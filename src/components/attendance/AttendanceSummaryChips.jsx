import { CheckCircle2, Clock, UserX, LogOut, ListChecks } from 'lucide-react';

export default function AttendanceSummaryChips({ present, late, absent, released, marked, total }) {
  const chips = [
    { label: 'נוכחים', count: present, icon: CheckCircle2, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
    { label: 'מאחרים', count: late, icon: Clock, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
    { label: 'נעדרים', count: absent, icon: UserX, color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
    { label: 'שוחררו', count: released, icon: LogOut, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' },
    { label: 'סומנו', count: `${marked}/${total}`, icon: ListChecks, color: 'bg-muted text-muted-foreground' },
  ];

  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-right" dir="rtl">
      {chips.map(({ label, count, icon: Icon, color }) => (
        <div key={label} className={`px-1.5 sm:px-3 py-2 rounded-xl font-medium text-center ${color}`}>
          <div className="flex items-center justify-center gap-1 sm:gap-1.5">
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-sm sm:text-base font-bold">{count}</span>
          </div>
          <p className="text-[10px] sm:text-xs mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}