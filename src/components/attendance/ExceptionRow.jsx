import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Clock, UserX, LogOut, RotateCcw, Pencil } from 'lucide-react';
import { formatStudentName } from '@/lib/studentName';

const STATUS_META = {
  'מאחר/ת':  { icon: Clock,  color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20',  ring: 'ring-amber-200 dark:ring-amber-800/50',  label: 'איחור' },
  'נעדר/ת':  { icon: UserX,  color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-900/20',       ring: 'ring-red-200 dark:ring-red-800/50',       label: 'היעדרות' },
  'שוחרר/ת': { icon: LogOut, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', ring: 'ring-purple-200 dark:ring-purple-800/50', label: 'שחרור' },
};

// Parse note for display details based on status
function parseExceptionDetails(status, note = '') {
  if (status === 'מאחר/ת') {
    const m = note.match(/(\d+)\s*דקות/);
    return m ? `${m[1]} דקות` : (note || 'איחור');
  }
  if (status === 'נעדר/ת') {
    return note || 'ללא סיבה';
  }
  if (status === 'שוחרר/ת') {
    const m = note.match(/שעה\s*(\d{1,2}:\d{2})/);
    if (m) {
      const extra = note.replace(/^שחרור בשעה\s*\d{1,2}:\d{2}\s*·?\s*/, '').trim();
      return extra ? `${m[1]} · ${extra}` : `שחרור בשעה ${m[1]}`;
    }
    return note || 'שחרור';
  }
  return note;
}

export default function ExceptionRow({ student, status, note, disabled, onMarkPresent, onEdit, index = 0 }) {
  const meta = STATUS_META[status] || STATUS_META['נעדר/ת'];
  const Icon = meta.icon;
  const details = parseExceptionDetails(status, note);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.2) }}
    >
      <Card className={`${meta.ring} ring-1`} dir="rtl">
        <div className="p-3 flex items-center gap-3" dir="rtl">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
            ${student.gender === 'נקבה' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
            {student.full_name?.charAt(0)}
          </div>

          {/* Name + details */}
          <div className="flex-1 min-w-0 text-right">
            <p className="font-medium text-sm truncate">{formatStudentName(student)}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md ${meta.bg} ${meta.color}`}>
                <Icon className="w-3 h-3" />
                {meta.label}
              </span>
              <span className="text-[11.5px] text-muted-foreground truncate">{details}</span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onMarkPresent?.(student)}
              disabled={disabled}
              title="החזר לנוכח/ת"
              className="w-8 h-8 rounded-lg border border-border bg-card hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-900/20 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </button>
            <button
              onClick={() => onEdit?.(student, status)}
              disabled={disabled}
              title="ערוך סיבה/דקות"
              className="w-8 h-8 rounded-lg border border-border bg-card hover:bg-accent transition-colors flex items-center justify-center disabled:opacity-50"
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </button>

          </div>
        </div>
      </Card>
    </motion.div>
  );
}