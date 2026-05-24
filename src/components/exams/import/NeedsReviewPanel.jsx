import { AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NeedsReviewPanel({ items, onPromote, onDismiss }) {
  if (!items?.length) return null;

  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
        <AlertTriangle className="w-4 h-4" />
        <h3 className="font-semibold text-sm">דורש בדיקה ידנית · {items.length} פריטים</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        תאים שלא הצלחנו לקרוא במלואם. אפשר להוסיף אותם כאירוע ידני (עם תאריך שתבחרו) או להתעלם.
      </p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="rounded-lg border bg-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-sm">
              <p className="font-medium break-words">{item.raw_text}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => onPromote(index)}>
                <Plus className="w-3.5 h-3.5" />הוסף כאירוע
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDismiss(index)}>
                התעלם
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}