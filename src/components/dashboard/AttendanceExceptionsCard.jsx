import { CheckCircle2, ChevronLeft, UserX } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_GROUPS = {
  late: ['מאחר', 'מאחר/ת'],
  absent: ['נעדר', 'נעדר/ת'],
  released: ['שוחרר', 'שוחרר/ת'],
};

export default function AttendanceExceptionsCard({
  exceptionsCount,
  totalStudents = 0,
  exceptions = [],
  date = 'היום',
  onClick,
}) {
  const lates = exceptions.filter(item => STATUS_GROUPS.late.includes(item.status)).length;
  const absences = exceptions.filter(item => STATUS_GROUPS.absent.includes(item.status)).length;
  const released = exceptions.filter(item => STATUS_GROUPS.released.includes(item.status)).length;

  if (exceptionsCount === 0) {
    return (
      <div className="w-full rounded-xl border border-border bg-card p-3 text-right" dir="rtl">
        <div className="flex items-center gap-2.5 justify-start">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-primary" strokeWidth={2.2} />
          </div>
          <p className="text-sm font-semibold text-foreground">אין חריגי נוכחות {date}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className="w-full text-right rounded-xl border border-destructive/20 bg-card hover:bg-destructive/[0.03] transition-colors cursor-pointer p-3"
      type="button"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <UserX className="w-5 h-5 text-destructive" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-sm font-bold text-foreground">חריגי נוכחות · {date}</p>
            <div className="mt-1 flex flex-wrap items-center justify-start gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="tabular-nums">מאחרים: <strong className="text-foreground">{lates}</strong></span>
              <span className="tabular-nums">נעדרים: <strong className="text-foreground">{absences}</strong></span>
              <span className="tabular-nums">משוחררים: <strong className="text-foreground">{released}</strong></span>
              <span className="tabular-nums text-destructive font-semibold">סה״כ חריגים: {exceptionsCount}</span>
              <span className="tabular-nums">מתוך {totalStudents}</span>
            </div>
          </div>
        </div>
        <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" strokeWidth={2.5} />
      </div>
    </motion.button>
  );
}
