import { Link } from 'react-router-dom';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * "מה חשוב היום" — elegant card grid of today's most important items.
 * items: [{ id, icon, label, value, hint, to, tone: 'urgent'|'warn'|'info'|'ok' }]
 *
 * Design: subtle accent dot + tinted icon chip. No loud background fills,
 * works harmoniously in light & dark mode, no yellow/brown.
 */
export default function TodayHighlights({ items = [] }) {
  // Harmonious accent palette — uses theme tokens + restrained tints.
  // The "warn" tone is now a soft rose/coral (no yellow) to align with the
  // app's emerald-primary palette.
  const accents = {
    urgent: {
      dot:  'bg-destructive',
      icon: 'bg-destructive/10 text-destructive ring-1 ring-destructive/15',
      ring: 'group-hover:ring-destructive/30',
    },
    warn: {
      dot:  'bg-rose-500',
      icon: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 ring-1 ring-rose-500/15',
      ring: 'group-hover:ring-rose-500/30',
    },
    info: {
      dot:  'bg-primary',
      icon: 'bg-primary/10 text-primary ring-1 ring-primary/15',
      ring: 'group-hover:ring-primary/30',
    },
    ok: {
      dot:  'bg-emerald-500',
      icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/15',
      ring: 'group-hover:ring-emerald-500/30',
    },
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 lg:p-5" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/15">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground leading-tight">מה חשוב היום</h2>
            {items.length > 0 && (
              <p className="text-[11px] text-muted-foreground leading-tight">
                {items.length} פריטים דורשים את תשומת הלב שלך
              </p>
            )}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-10 px-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/15 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-300" />
          </div>
          <p className="text-sm font-semibold text-foreground">הכול מסודר להיום 👌</p>
          <p className="text-xs text-muted-foreground mt-1">אין משימות, התראות או אירועים שדורשים טיפול עכשיו.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {items.map(item => {
            const accent = accents[item.tone] || accents.info;
            const Wrapper = item.to ? Link : 'div';
            const wrapperProps = item.to ? { to: item.to } : {};
            return (
              <Wrapper
                key={item.id}
                {...wrapperProps}
                className={cn(
                  'group relative flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/70 ring-1 ring-transparent transition-all',
                  item.to && 'hover:bg-background hover:border-border cursor-pointer',
                  item.to && accent.ring
                )}
              >
                {/* Subtle accent dot on the leading edge */}
                <span className={cn('absolute top-3 bottom-3 right-0 w-[3px] rounded-l-full', accent.dot)} aria-hidden />

                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ms-1', accent.icon)}>
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={2.1} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
                      {item.label}
                    </p>
                    {item.value != null && (
                      <span className="text-sm font-bold text-foreground tabular-nums shrink-0">
                        {item.value}
                      </span>
                    )}
                  </div>
                  {item.hint && (
                    <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">
                      {item.hint}
                    </p>
                  )}
                </div>

                {item.to && (
                  <ChevronLeft className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground/80 transition-colors flex-shrink-0" />
                )}
              </Wrapper>
            );
          })}
        </div>
      )}
    </section>
  );
}