import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Users, Clock, CheckSquare, Megaphone, ChevronLeft, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DailySmartCard({ classId, students, todayAttendance, exams, tasks, discipline, announcements, role, user }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [students, todayAttendance, exams, tasks, discipline, announcements]);

  async function loadInsights() {
    setLoading(true);
    const insights = [];
    const today = new Date().toISOString().split('T')[0];

    // 1. נעדרים וחסרים היום (עם שמות)
    const absentDetails = todayAttendance
      .filter(a => ['נעדר', 'נעדר/ת'].includes(a.status))
      .map(a => a.student_name)
      .slice(0, 3);
    const lateDetails = todayAttendance
      .filter(a => ['מאחר', 'מאחר/ת'].includes(a.status))
      .map(a => a.student_name)
      .slice(0, 3);

    if (absentDetails.length > 0 || lateDetails.length > 0) {
      insights.push({
        id: 'presence',
        priority: 'urgent',
        title: 'בעיות נוכחות היום',
        icon: AlertTriangle,
        items: [
          ...(absentDetails.length > 0 ? [`${absentDetails.length} נעדרים: ${absentDetails.join(', ')}`] : []),
          ...(lateDetails.length > 0 ? [`${lateDetails.length} מאחרים: ${lateDetails.join(', ')}`] : []),
        ],
        link: '/class-attendance',
      });
    }

    // 2. מבחנים קרובים (השבוע)
    const sevenDaysLater = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0];
    const upcomingExams = exams
      .filter(e => e.date >= today && e.date <= sevenDaysLater)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);
    if (upcomingExams.length > 0) {
      insights.push({
        id: 'exams',
        priority: 'high',
        title: `${upcomingExams.length} מבחנים השבוע`,
        icon: BookOpen,
        items: upcomingExams.map(e => `${e.title} ב-${new Date(e.date).toLocaleDateString('he-IL')}`),
        link: '/exams',
      });
    }

    // 3. משימות דחופות שהקרובות לעברות
    const urgentTasks = tasks
      .filter(t => t.status !== 'בוצע' && (t.priority === 'דחופה' || t.priority === 'גבוהה'))
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .slice(0, 3);
    if (urgentTasks.length > 0) {
      insights.push({
        id: 'tasks',
        priority: 'high',
        title: `${urgentTasks.length} משימות דחופות`,
        icon: CheckSquare,
        items: urgentTasks.map(t => `${t.title} (עד ${t.due_date ? new Date(t.due_date).toLocaleDateString('he-IL') : 'בקרוב'})`),
        link: '/tasks',
      });
    }

    // 4. אירועים חריגים פתוחים (משמעת)
    const openDiscipline = discipline.filter(d => d.status === 'פתוח').slice(0, 3);
    if (openDiscipline.length > 0) {
      insights.push({
        id: 'discipline',
        priority: 'high',
        title: `${openDiscipline.length} אירועי משמעת פתוחים`,
        icon: AlertTriangle,
        items: openDiscipline.map(d => `${d.student_name}: ${d.description.substring(0, 30)}...`),
        link: '/discipline',
      });
    }

    // 5. תלמידים דורשי תשומת לב (מתוך students)
    const watchList = students
      .filter(s => s.status === 'דורש מעקב')
      .slice(0, 3);
    if (watchList.length > 0) {
      insights.push({
        id: 'watch',
        priority: 'medium',
        title: `${watchList.length} תלמידים דורשים מעקב`,
        icon: Users,
        items: watchList.map(s => s.full_name),
        link: '/students',
      });
    }

    // 6. הודעות חשובות
    const recentAnn = announcements
      .filter(a => a.type === 'חשובה' || a.type === 'חזוי')
      .slice(0, 2);
    if (recentAnn.length > 0) {
      insights.push({
        id: 'announcements',
        priority: 'low',
        title: `${recentAnn.length} הודעה/ות`,
        icon: Megaphone,
        items: recentAnn.map(a => a.title),
        link: '/announcements',
      });
    }

    setInsights(insights.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }));
    setLoading(false);
  }

  if (loading || insights.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        מה חשוב היום
      </h2>
      <div className="space-y-2">
        {insights.map(insight => {
          const Icon = insight.icon;
          const bgColor = insight.priority === 'urgent' ? 'bg-destructive/10' :
                         insight.priority === 'high' ? 'bg-amber-50 dark:bg-amber-950/20' :
                         'bg-muted/50';
          const borderColor = insight.priority === 'urgent' ? 'border-destructive/30' :
                             insight.priority === 'high' ? 'border-amber-200 dark:border-amber-800/40' :
                             'border-border';
          const textColor = insight.priority === 'urgent' ? 'text-destructive' :
                           insight.priority === 'high' ? 'text-amber-700 dark:text-amber-300' :
                           'text-foreground';

          return (
            <Link
              key={insight.id}
              to={insight.link}
              className={cn(
                'block p-3 rounded-xl border transition-all hover:shadow-sm',
                bgColor, borderColor
              )}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${textColor}`}>
                  <Icon className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${textColor}`}>{insight.title}</p>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {insight.items.map((item, i) => (
                      <p key={i} className="truncate">{item}</p>
                    ))}
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}