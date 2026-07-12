import { Link } from 'react-router-dom';
import { BookOpen, CalendarCheck, Heart } from 'lucide-react';
import { addDaysToDateString, differenceInDateStrings, getLocalDateString } from '@/lib/dateUtils';

function examCountdown(exam) {
  if (!exam?.date) return { value: '—', hint: 'אין מבחנים קרובים' };
  const diff = differenceInDateStrings(exam.date, getLocalDateString());
  if (!Number.isFinite(diff)) return { value: '—', hint: 'תאריך המבחן אינו תקין' };
  const value = diff <= 0 ? 'היום' : diff === 1 ? 'מחר' : `בעוד ${diff} ימים`;
  return { value, hint: `מבחן קרוב · ${exam.subject || exam.title}` };
}

export default function StudentQuickStats({ nextExam, attendanceRecords, communityApproved, communityGoal }) {
  const cutoff = addDaysToDateString(getLocalDateString(), -30);
  const recent = (attendanceRecords || []).filter(r => (r.date || '') >= cutoff);
  const present = recent.filter(r => r.status === 'נוכח').length;
  const attendancePct = recent.length ? `${Math.round((present / recent.length) * 100)}%` : '—';
  const exam = examCountdown(nextExam);

  const stats = [
    { to: '/student-exams', icon: BookOpen, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20', value: exam.value, label: exam.hint },
    { to: '/student-attendance', icon: CalendarCheck, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20', value: attendancePct, label: 'נוכחות בחודש האחרון' },
    { to: '/student-more', icon: Heart, color: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20', value: `${communityApproved}/${communityGoal}`, label: 'שעות מעורבות מאושרות' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2" dir="rtl">
      {stats.map(s => (
        <Link key={s.to} to={s.to} className="bg-card border rounded-xl p-3 text-right hover:border-primary/40 transition-colors min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
            <s.icon className="w-4 h-4" />
          </div>
          <p className="text-base font-bold leading-tight truncate">{s.value}</p>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">{s.label}</p>
        </Link>
      ))}
    </div>
  );
}
