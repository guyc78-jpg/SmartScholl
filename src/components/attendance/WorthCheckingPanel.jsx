import { AlertTriangle, ChevronLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function WorthCheckingPanel({ students, onSelectStudent }) {
  if (!students || students.length === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-900/10" dir="rtl">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2 text-right">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-200">שווה לבדוק</h3>
          <span className="text-xs text-amber-700/70 dark:text-amber-300/70">{students.length} תלמידים</span>
        </div>
        <div className="space-y-1.5">
          {students.slice(0, 5).map(s => (
            <button key={s.id} onClick={() => onSelectStudent?.(s)}
              className="w-full flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-amber-900/20 hover:bg-white dark:hover:bg-amber-900/30 transition-colors text-right" dir="rtl">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0
                ${s.gender === 'נקבה' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                {s.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm font-medium truncate">{s.full_name.split(' ').length > 1 ? `${s.full_name.split(' ').pop()} ${s.full_name.split(' ').slice(0, -1).join(' ')}` : s.full_name}</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">{s.flagReason}</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}