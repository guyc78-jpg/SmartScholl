import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Users, CheckSquare, Megaphone, ChevronLeft, BookOpen, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * "מה חשוב היום" — clean, scannable card.
 * Each insight is a chip-row: icon · title · type · date.
 * Subtle accent dot on the leading edge instead of loud yellow/amber fills.
 * Works in both light & dark mode and aligns with the dashboard's emerald palette.
 */

// Harmonious accent palette — no yellow/brown.
const PRIORITY_ACCENT = {
  urgent: {
    dot:  'bg-destructive',
    icon: 'bg-destructive/10 text-destructive ring-destructive/15',
    ring: 'group-hover:ring-destructive/30',
  },
  high: {
    dot:  'bg-rose-500',
    icon: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 ring-rose-500/15',
    ring: 'group-hover:ring-rose-500/30',
  },
  medium: {
    dot:  'bg-primary',
    icon: 'bg-primary/10 text-primary ring-primary/15',
    ring: 'group-hover:ring-primary/30',
  },
  low: {
    dot:  'bg-emerald-500',
    icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 ring-emerald-500/15',
    ring: 'group-hover:ring-emerald-500/30',
  },
};

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

export default function DailySmartCard({ classId, students, todayAttendance, exams, tasks, discipline, announcements, role, user }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [students, todayAttendance, exams, tasks, discipline, announcements]);

  function loadInsights() {
    setLoading(true);
    const insights = [];
    const today = new Date().toISOString().split('T')[0];

    // 1. נוכחות היום — נעדרים ומאחרים
    const absentNames = todayAttendance.filter(a => ['נעדר', 'נעדר/ת'].includes(a.status)).map(a => a.student_name).slice(0, 3);
    const lateNames = todayAttendance.filter(a => ['מאחר', 'מאחר/ת'].includes(a.status)).map(a => a.student_name).slice(0, 3);
    if (absentNames.length || lateNames.length) {
      insights.push({
        id: 'presence',
        priority: 'urgent',
        type: 'נוכחות',
        title: 'בעיות נוכחות היום',
        icon: AlertTriangle,
        meta: [
          absentNames.length ? `${absentNames.length} נעדרים` : null,
          lateNames.length ? `${lateNames.length} מאחרים` : null,
        ].filter(Boolean).join(' · '),
        names: [...absentNames, ...lateNames].slice(0, 4),
        date: today,
        link: '/class-attendance',
      });
    }

    // 2. מבחנים ואירועים היום בלבד — הפרדה לפי סוג
    const EXAM_TYPES = ['מבחן', 'מתכונת', 'בגרות'];
    const todayAll = exams.filter(e => e.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const todayExams = todayAll.filter(e => EXAM_TYPES.includes(e.type));
    const todayActivities = todayAll.filter(e => !EXAM_TYPES.includes(e.type));

    if (todayExams.length) {
      insights.push({
        id: 'exams',
        priority: 'high',
        type: 'מבחנים',
        title: `${todayExams.length} ${todayExams.length === 1 ? 'מבחן' : 'מבחנים'} היום`,
        icon: BookOpen,
        meta: todayExams[0].title,
        names: todayExams.map(e => e.title),
        date: todayExams[0].date,
        link: '/exams',
      });
    }

    if (todayActivities.length) {
      insights.push({
        id: 'activities',
        priority: 'medium',
        type: 'אירועים',
        title: `${todayActivities.length} ${todayActivities.length === 1 ? 'אירוע' : 'פעילויות'} היום`,
        icon: Calendar,
        meta: todayActivities[0].title,
        names: todayActivities.map(e => e.title),
        date: todayActivities[0].date,
        link: '/exams',
      });
    }

    // 3. משימות דחופות — רק של היום
    const urgentTasks = tasks
      .filter(t => t.status !== 'בוצע' && t.due_date === today && (t.priority === 'דחופה' || t.priority === 'גבוהה'))
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .slice(0, 3);
    if (urgentTasks.length) {
      insights.push({
        id: 'tasks',
        priority: 'high',
        type: 'משימות',
        title: `${urgentTasks.length} משימות דחופות`,
        icon: CheckSquare,
        meta: urgentTasks[0].title,
        names: urgentTasks.map(t => t.title),
        date: urgentTasks[0].due_date,
        link: '/tasks',
      });
    }

    // 4. אירועי משמעת פתוחים
    const openDiscipline = discipline.filter(d => d.status === 'פתוח').slice(0, 3);
    if (openDiscipline.length) {
      insights.push({
        id: 'discipline',
        priority: 'high',
        type: 'משמעת',
        title: `${openDiscipline.length} אירועי משמעת פתוחים`,
        icon: AlertTriangle,
        meta: openDiscipline[0].student_name,
        names: openDiscipline.map(d => d.student_name),
        date: openDiscipline[0].date,
        link: '/discipline',
      });
    }

    // 5. תלמידים דורשי מעקב
    const watchList = students.filter(s => s.status === 'דורש מעקב').slice(0, 3);
    if (watchList.length) {
      insights.push({
        id: 'watch',
        priority: 'medium',
        type: 'מעקב',
        title: `${watchList.length} תלמידים דורשים מעקב`,
        icon: Users,
        meta: watchList[0].full_name,
        names: watchList.map(s => s.full_name),
        link: '/students',
      });
    }

    // 6. הודעות חשובות
    const recentAnn = announcements.filter(a => a.type === 'חשובה' || a.type === 'חזוי').slice(0, 2);
    if (recentAnn.length) {
      insights.push({
        id: 'announcements',
        priority: 'low',
        type: 'הודעות',
        title: `${recentAnn.length} הודעות חשובות`,
        icon: Megaphone,
        meta: recentAnn[0].title,
        names: recentAnn.map(a => a.title),
        link: '/announcements',
      });
    }

    setInsights(insights.sort((a, b) => {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    }));
    setLoading(false);
  }

  if (loading) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 lg:p-5" dir="rtl">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/15">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground leading-tight">מה חשוב היום</h2>
          <p className="text-[11px] text-muted-foreground leading-tight">
            {insights.length} תובנות מהיום
          </p>
        </div>
      </div>

      {insights.length === 0 && (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          אין משהו חשוב היום 🎉
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {insights.map(insight => {
          const accent = PRIORITY_ACCENT[insight.priority] || PRIORITY_ACCENT.medium;
          const Icon = insight.icon;
          return (
            <Link
              key={insight.id}
              to={insight.link}
              className={cn(
                'group relative flex items-start gap-3 p-3 rounded-xl bg-background/60 border border-border/70 ring-1 ring-transparent transition-all',
                'hover:bg-background hover:border-border cursor-pointer',
                accent.ring
              )}
            >
              {/* Accent bar */}
              <span className={cn('absolute top-3 bottom-3 right-0 w-[3px] rounded-l-full', accent.dot)} aria-hidden />

              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ms-1 ring-1', accent.icon)}>
                <Icon className="w-[18px] h-[18px]" strokeWidth={2.1} />
              </div>

              <div className="flex-1 min-w-0">
                {/* Title row */}
                <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
                  {insight.title}
                </p>

                {/* Chips: type + date */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-md bg-muted/80 text-muted-foreground ring-1 ring-border">
                    {insight.type}
                  </span>
                  {insight.date && (
                    <span className="text-[10.5px] text-muted-foreground inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{formatShortDate(insight.date)}
                    </span>
                  )}
                </div>

                {/* Sample names — compact, never list-shaped */}
                {insight.names && insight.names.length > 0 && (
                  <p className="text-[11.5px] text-muted-foreground mt-1.5 truncate">
                    {insight.names.slice(0, 3).join(' · ')}
                    {insight.names.length > 3 ? ` +${insight.names.length - 3}` : ''}
                  </p>
                )}
              </div>

              <ChevronLeft className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground/80 transition-colors flex-shrink-0 mt-1" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}