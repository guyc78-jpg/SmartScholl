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
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3 py-8" dir="rtl">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">אין חריגי נוכחות</p>
            <p className="text-xs text-muted-foreground mt-1">כל התלמידים נוכחים או מוצדקים</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="w-full text-right rounded-2xl border border-border bg-card p-4 hover:shadow-md hover:border-amber-300/60 transition-all cursor-pointer"
      type="button"
      dir="rtl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground/80 leading-tight">חריגי נוכחות</p>
          <p className="text-2xl lg:text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1.5 tabular-nums">
            {exceptionsCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {exceptionsCount === 1 ? 'תלמיד אחד' : `${exceptionsCount} תלמידים`}
          </p>
        </div>
        <div className={cn('w-10 h-10 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center flex-shrink-0', 'bg-amber-500/15 text-amber-700 dark:text-amber-400')}>
          <AlertTriangle className="w-5 h-5" strokeWidth={2} />
        </div>
      </div>
      
      {/* Chevron indicator */}
      <div className="flex justify-start mt-3">
        <span className="text-[11px] font-semibold text-primary flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-lg">
          צפה בחריגים
          <ChevronLeft className="w-3 h-3" />
        </span>
      </div>
    </motion.button>
  );
}