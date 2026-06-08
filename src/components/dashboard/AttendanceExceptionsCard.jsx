import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserX, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AttendanceExceptionsCard({
  exceptionsCount,
  totalStudents = 0,
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
      className="w-full text-right rounded-xl border border-border bg-card hover:bg-muted/40 transition-all cursor-pointer p-3"
      type="button"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <UserX className="w-5 h-5 text-destructive" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground leading-tight">חריגי נוכחות</p>
            <p className="text-sm font-bold text-foreground mt-0.5 tabular-nums">
              {exceptionsCount} <span className="text-muted-foreground font-normal">מתוך {totalStudents}</span>
            </p>
          </div>
        </div>
        <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" strokeWidth={2.5} />
      </div>
    </motion.button>
  );
}