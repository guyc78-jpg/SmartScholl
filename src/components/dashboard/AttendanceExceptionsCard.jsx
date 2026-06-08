import { CheckCircle2, ChevronLeft, UserX } from 'lucide-react';
import { motion } from 'framer-motion';

const ABSENCE_STATUSES = ['נעדר', 'נעדר/ת'];
const LATE_STATUSES = ['מאחר', 'מאחר/ת'];

export default function AttendanceExceptionsCard({
  exceptionsCount,
  totalStudents = 0,
  exceptions = [],
  onClick,
  date,
}) {
  const absences = exceptions.filter(item => ABSENCE_STATUSES.includes(item.status));
  const lates = exceptions.filter(item => LATE_STATUSES.includes(item.status));
  const previewStudents = exceptions.slice(0, 3).map(item => item.student_name).filter(Boolean);

  if (exceptionsCount === 0) {
    return (
      <div className="w-full rounded-xl border border-border bg-card p-3 text-right" dir="rtl">
        <div className="flex items-center gap-2.5 justify-start">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-primary" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">אין חריגי נוכחות לטיפול</p>
            <p className="text-xs text-muted-foreground">{date || 'היום'} · כל התלמידים ללא איחור או היעדרות חריגה</p>
          </div>
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
            <div className="flex flex-wrap items-center justify-start gap-x-2 gap-y-1">
              <p className="text-sm font-bold text-foreground">חריגי נוכחות</p>
              <span className="text-xs font-semibold text-destructive tabular-nums">{exceptionsCount} לטיפול</span>
              <span className="text-xs text-muted-foreground tabular-nums">מתוך {totalStudents}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {absences.length > 0 && `${absences.length} היעדרויות`}
              {absences.length > 0 && lates.length > 0 && ' · '}
              {lates.length > 0 && `${lates.length} איחורים`}
              {previewStudents.length > 0 && ` · ${previewStudents.join(', ')}`}
            </p>
          </div>
        </div>
        <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" strokeWidth={2.5} />
      </div>
    </motion.button>
  );
}