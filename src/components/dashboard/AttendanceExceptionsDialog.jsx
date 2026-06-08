import { useEffect } from 'react';
import { X, UserX } from 'lucide-react';

const STATUS_LABELS = {
  'נעדר': 'היעדר',
  'נעדר/ת': 'היעדר',
  'מאחר': 'איחור',
  'מאחר/ת': 'איחור',
  'שוחרר': 'שחרור',
  'שוחרר/ת': 'שחרור',
};

const STATUS_CARD_STYLES = {
  'היעדר': 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30',
  'איחור': 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30',
  'שחרור': 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/30',
};

const STATUS_BADGE_STYLES = {
  'היעדר': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  'איחור': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  'שחרור': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
};

export default function AttendanceExceptionsDialog({ open, onOpenChange, records = [], dateLabel }) {
  useEffect(() => {
    if (!open) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'contain';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, [open]);

  if (!open) return null;

  const sortedRecords = [...records].sort((a, b) => (a.student_name || '').localeCompare(b.student_name || '', 'he'));

  return (
    <div className="fixed inset-0 z-50" dir="rtl" role="dialog" aria-modal="true">
      <button
        className="absolute inset-0 bg-black/50 cursor-default"
        onClick={() => onOpenChange(false)}
        aria-label="סגור חלון חריגי נוכחות"
        type="button"
      />

      <div className="absolute inset-x-0 bottom-0 flex justify-center px-0 sm:px-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full sm:max-w-2xl flex flex-col rounded-t-3xl sm:rounded-3xl bg-card border border-border shadow-2xl text-right overflow-hidden"
          dir="rtl"
          style={{
            height: 'min(85dvh, 720px)',
            maxHeight: 'calc(100dvh - env(safe-area-inset-top) - 16px)',
            overscrollBehavior: 'contain',
          }}
        >
          <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-4 border-b border-border bg-card flex-shrink-0">
            <div className="min-w-0 text-right">
              <h2 className="text-lg font-bold text-foreground">חריגי נוכחות - {dateLabel}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">רשימת החריגים המלאה לטיפול</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-muted rounded-lg transition flex-shrink-0"
              type="button"
              aria-label="סגור"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            className="flex-1 min-h-0 px-4 lg:px-6 py-4 space-y-2"
            style={{
              overflowY: 'auto',
              overscrollBehaviorY: 'contain',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              maxHeight: 'calc(min(85dvh, 720px) - 73px)',
            }}
          >
            {sortedRecords.map(record => {
              const statusLabel = STATUS_LABELS[record.status] || record.status;
              const colorClass = STATUS_CARD_STYLES[statusLabel] || 'bg-muted/40 border-border';
              const bgColorClass = STATUS_BADGE_STYLES[statusLabel] || 'bg-muted text-muted-foreground';
              return (
                <div key={record.id} className={`p-3 rounded-lg border ${colorClass}`} dir="rtl">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-sm font-semibold text-foreground truncate">{record.student_name}</p>
                      {record.note && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{record.note}</p>}
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${bgColorClass} flex-shrink-0`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}

            {sortedRecords.length === 0 && (
              <div className="text-center py-10" dir="rtl">
                <UserX className="w-9 h-9 text-muted-foreground/60 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">אין חריגי נוכחות היום</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}