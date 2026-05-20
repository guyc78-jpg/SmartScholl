import { cn } from '@/lib/utils';

const statusConfig = {
  // Attendance
  'נוכח': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'נעדר': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'מאחר': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'מוצדק': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'שוחרר': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  // Discipline
  'פתוח': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'בטיפול': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'סגור': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  // Severity
  'קלה': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'בינונית': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'חמורה': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  // Tasks
  'לביצוע': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  'בוצע': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  // Priority
  'נמוכה': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  'גבוהה': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'דחופה': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  // Student status
  'פעיל': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'דורש מעקב': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'מועבר': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  // Community service
  'לא התחיל': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'בתהליך': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'הושלם': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  // Announcement types
  'חשובה': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'כיתתית': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'אישית': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'להורים': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  // General
  'בינונית': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function StatusBadge({ status, className }) {
  const style = statusConfig[status] || 'bg-slate-100 text-slate-600';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', style, className)}>
      {status}
    </span>
  );
}