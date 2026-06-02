import { AlertTriangle, AlertCircle } from 'lucide-react';

export default function ConflictWarnings({ warnings }) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="space-y-2 text-right" dir="rtl">
      {warnings.map((w, i) => {
        const high = w.severity === 'high';
        const Icon = high ? AlertCircle : AlertTriangle;
        return (
          <div
            key={i}
            className={`flex items-start gap-2 rounded-xl border p-3 text-sm
              ${high
                ? 'bg-destructive/10 border-destructive/30 text-destructive'
                : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-900/50 dark:text-amber-200'}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{w.message}</span>
          </div>
        );
      })}
    </div>
  );
}