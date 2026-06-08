import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AttendanceExceptionsCard({
  exceptionsCount,
  exceptions,
  onClick,
  date,
}) {
  if (exceptionsCount === 0) {
    return null;
  }

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="w-full text-right rounded-xl border border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-950/20 p-3 hover:shadow-sm hover:border-amber-300 dark:hover:border-amber-700/50 transition-all cursor-pointer"
      type="button"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300 tabular-nums">{exceptionsCount}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 leading-tight truncate">
              {exceptionsCount === 1 ? 'חריגת נוכחות' : 'חריגי נוכחות'}
            </p>
          </div>
          <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">
            {exceptionsCount} {exceptionsCount === 1 ? 'תלמיד' : 'תלמידים'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-amber-200/40 dark:bg-amber-900/40 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-300" strokeWidth={2.2} />
          </div>
          <ChevronLeft className="w-4 h-4 text-amber-700 dark:text-amber-300" strokeWidth={2.5} />
        </div>
      </div>
    </motion.button>
  );
}