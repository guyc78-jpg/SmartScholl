import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function StatCard({ icon: Icon, title, value, subtitle, color = 'blue', onClick, urgent }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800',
    green: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800',
    slate: 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700',
  };

  const iconColors = {
    blue: 'text-blue-500',
    green: 'text-emerald-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
    purple: 'text-purple-500',
    slate: 'text-slate-500',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'rounded-2xl border p-5 transition-shadow',
        colors[color],
        onClick && 'cursor-pointer hover:shadow-md',
        urgent && 'ring-2 ring-red-400'
      )}
    >
      <div className="flex items-start justify-between text-right" dir="rtl">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn('p-2 rounded-xl bg-white/60 dark:bg-white/10', iconColors[color])}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </motion.div>
  );
}