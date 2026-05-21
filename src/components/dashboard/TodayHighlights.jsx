import { Link } from 'react-router-dom';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * "מה חשוב היום" — focused list of today's most important items.
 * items: [{ id, icon, label, value, hint, to, tone: 'urgent'|'warn'|'info'|'ok' }]
 */
export default function TodayHighlights({ items = [] }) {
  const tones = {
    urgent: 'border-r-[3px] border-destructive bg-destructive/[0.06]',
    warn:   'border-r-[3px] border-amber-500 bg-amber-500/[0.07]',
    info:   'border-r-[3px] border-primary bg-primary/[0.06]',
    ok:     'border-r-[3px] border-emerald-500 bg-emerald-500/[0.06]',
  };
  const iconTones = {
    urgent: 'bg-destructive/15 text-destructive',
    warn:   'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    info:   'bg-primary/15 text-primary',
    ok:     'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 lg:p-5" dir="rtl">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-base font-bold text-foreground">מה חשוב היום</h2>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">אין מה לטפל היום — יום שקט 👌</p>
      ) : (
        <ul className="space-y-2">
          {items.map(item => {
            const Wrapper = item.to ? Link : 'div';
            const wrapperProps = item.to ? { to: item.to } : {};
            return (
              <Wrapper
                key={item.id}
                {...wrapperProps}
                className={cn(
                  'flex items-center gap-3 py-2.5 pe-3 ps-2 rounded-xl transition-colors',
                  tones[item.tone] || tones.info,
                  item.to && 'hover:brightness-95 cursor-pointer'
                )}
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', iconTones[item.tone] || iconTones.info)}>
                  <item.icon className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">{item.label}</p>
                  {item.hint && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.hint}</p>}
                </div>
                {item.value != null && (
                  <span className="text-lg font-bold text-foreground tabular-nums">{item.value}</span>
                )}
                {item.to && <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </Wrapper>
            );
          })}
        </ul>
      )}
    </section>
  );
}