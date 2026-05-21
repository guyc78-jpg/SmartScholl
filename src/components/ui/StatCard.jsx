import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function StatCard({ icon: Icon, title, value, subtitle, color = 'green', onClick, urgent }) {
  // Unified design-tokens palette — works in both light & dark
  const chips = {
    green:  'bg-primary/10 text-primary',
    amber:  'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    red:    'bg-destructive/10 text-destructive',
    blue:   'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    purple: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    slate:  'bg-muted text-muted-foreground',
  };
  const chip = chips[color] || chips.green;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-border bg-card p-4 transition-shadow',
        onClick && 'cursor-pointer hover:shadow-md',
        urgent && 'ring-2 ring-destructive/50'
      )}
    >
      <div className="flex items-start justify-between gap-3 text-right" dir="rtl">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground/80 leading-tight">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold text-foreground mt-1.5 tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn('w-10 h-10 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center flex-shrink-0', chip)}>
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
        )}
      </div>
    </motion.div>
  );
}