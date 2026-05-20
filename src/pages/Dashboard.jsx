import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import StatCard from '@/components/ui/StatCard';
import {
  Users, Clock, AlertTriangle, BookOpen, CheckSquare,
  Shield, Heart, UserCheck, Plus, Calendar, MessageSquare,
  Megaphone, Star, ChevronLeft, TrendingUp, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/StatusBadge';
import QuickActionModal from '@/components/dashboard/QuickActionModal';

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
function hebrewDate() {
  const d = new Date();
  return `יום ${HEBREW_DAYS[d.getDay()]}, ${d.getDate()} ב${HEBREW_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function Dashboard({ user }) {
  const [students, setStudents] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [exams, setExams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [discipline, setDiscipline] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickAction, setQuickAction] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [sts, att, exs, tks, dis, ann] = await Promise.all([
      base44.entities.Student.filter({ class_id: CLASS_ID }),
      base44.entities.AttendanceRecord.filter({ class_id: CLASS_ID, date: today }),
      base44.entities.Exam.filter({ class_id: CLASS_ID }),
      base44.entities.Task.filter({ class_id: CLASS_ID }),
      base44.entities.DisciplineEvent.filter({ class_id: CLASS_ID }),
      base44.entities.Announcement.filter({ class_id: CLASS_ID }),
    ]);
    setStudents(sts);
    setTodayAttendance(att);
    setExams(exs);
    setTasks(tks);
    setDiscipline(dis);
    setAnnouncements(ann);
    setLoading(false);
  }

  const presentToday = todayAttendance.filter(a => a.status === 'נוכח').length;
  const absentToday = todayAttendance.filter(a => a.status === 'נעדר').length;
  const lateToday = todayAttendance.filter(a => a.status === 'מאחר').length;
  const openTasks = tasks.filter(t => t.status !== 'בוצע').length;
  const openDiscipline = discipline.filter(d => d.status === 'פתוח').length;
  const pendingTasks = tasks.filter(t => t.status !== 'בוצע').length;

  const nextExams = exams
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const urgentTasks = tasks
    .filter(t => t.status !== 'בוצע' && (t.priority === 'גבוהה' || t.priority === 'דחופה'))
    .slice(0, 3);

  const watchStudents = students.filter(s => s.status === 'דורש מעקב');

  const communityBehind = students.filter(s => {
    const pct = s.community_service_goal > 0 ? (s.community_service_done / s.community_service_goal) * 100 : 0;
    return pct < 50 && s.status === 'פעיל';
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">שלום, {user?.full_name?.split(' ')[0] || 'מחנך'} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{hebrewDate()} · כיתה י׳1</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Bell className="w-4 h-4" />
          <span className="hidden sm:inline">התראות</span>
          {(openDiscipline + openTasks) > 0 && (
            <span className="w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
              {openDiscipline + openTasks}
            </span>
          )}
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} title="תלמידים" value={students.length} subtitle="בכיתה" color="blue" />
        <StatCard icon={UserCheck} title="נוכחים היום" value={presentToday} subtitle={`מתוך ${todayAttendance.length}`} color="green" />
        <StatCard
          icon={AlertTriangle}
          title="נעדרים/מאחרים"
          value={absentToday + lateToday}
          subtitle={`${absentToday} נעדר · ${lateToday} מאחר`}
          color={absentToday + lateToday > 2 ? 'red' : 'amber'}
          urgent={absentToday + lateToday > 3}
        />
        <StatCard icon={Shield} title="משמעת פתוחה" value={openDiscipline} subtitle="אירועים" color={openDiscipline > 0 ? 'red' : 'slate'} urgent={openDiscipline > 0} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} title="מבחנים קרובים" value={nextExams.length} subtitle="השבוע הקרוב" color="purple" />
        <StatCard icon={CheckSquare} title="משימות פתוחות" value={openTasks} subtitle="לטיפול" color={openTasks > 3 ? 'amber' : 'slate'} />
        <StatCard icon={Heart} title="מעורבות נמוכה" value={communityBehind.length} subtitle="תלמידים בפיגור" color={communityBehind.length > 0 ? 'amber' : 'green'} />
        <StatCard icon={AlertTriangle} title="דורשים מעקב" value={watchStudents.length} subtitle="תלמידים" color={watchStudents.length > 0 ? 'amber' : 'green'} />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">פעולות מהירות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: Clock, label: 'סימון נוכחות', action: 'attendance', color: 'bg-blue-500' },
              { icon: Shield, label: 'אירוע משמעת', action: 'discipline', color: 'bg-red-500' },
              { icon: BookOpen, label: 'הוספת מבחן', action: 'exam', color: 'bg-purple-500' },
              { icon: Megaphone, label: 'הודעה לכיתה', action: 'announcement', color: 'bg-amber-500' },
              { icon: Star, label: 'הערת מחנך', action: 'note', color: 'bg-emerald-500' },
              { icon: MessageSquare, label: 'שיחה עם הורים', action: 'communication', color: 'bg-cyan-500' },
              { icon: CheckSquare, label: 'משימה חדשה', action: 'task', color: 'bg-indigo-500' },
              { icon: Heart, label: 'עדכון מעורבות', action: 'community', color: 'bg-pink-500' },
            ].map(btn => (
              <motion.button
                key={btn.action}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setQuickAction(btn.action)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted hover:bg-accent transition-colors"
              >
                <div className={`w-10 h-10 ${btn.color} rounded-xl flex items-center justify-center shadow-sm`}>
                  <btn.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-foreground text-center">{btn.label}</span>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Upcoming Exams */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">מבחנים קרובים</CardTitle>
            <Link to="/exams" className="text-xs text-primary flex items-center gap-1 hover:underline">
              הכל <ChevronLeft className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {nextExams.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">אין מבחנים קרובים</p>
            ) : nextExams.map(exam => (
              <div key={exam.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex flex-col items-center justify-center text-purple-600 dark:text-purple-400">
                  <span className="text-[10px] font-bold">{new Date(exam.date).getDate()}</span>
                  <span className="text-[8px]">{['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'][new Date(exam.date).getMonth()]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{exam.title}</p>
                  <p className="text-xs text-muted-foreground">{exam.subject} · {exam.teacher}</p>
                </div>
                <StatusBadge status={exam.type} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Open Tasks */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">משימות דחופות</CardTitle>
            <Link to="/tasks" className="text-xs text-primary flex items-center gap-1 hover:underline">
              הכל <ChevronLeft className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {urgentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">אין משימות דחופות 🎉</p>
            ) : urgentTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
                <div className={`w-2 h-10 rounded-full ${task.priority === 'דחופה' ? 'bg-red-500' : 'bg-orange-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  {task.student_name && <p className="text-xs text-muted-foreground">{task.student_name}</p>}
                </div>
                <StatusBadge status={task.priority} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Watch Students */}
        {watchStudents.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                תלמידים למעקב
              </CardTitle>
              <Link to="/students" className="text-xs text-primary flex items-center gap-1 hover:underline">
                הכל <ChevronLeft className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {watchStudents.slice(0, 3).map(s => (
                <Link key={s.id} to={`/students/${s.id}`} className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                  <div className="w-9 h-9 bg-amber-200 dark:bg-amber-800 rounded-full flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-sm">
                    {s.full_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.full_name}</p>
                    <div className="flex gap-1 flex-wrap mt-0.5">
                      {s.tags?.map(tag => (
                        <span key={tag} className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent Announcements */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">הודעות אחרונות</CardTitle>
            <Link to="/announcements" className="text-xs text-primary flex items-center gap-1 hover:underline">
              הכל <ChevronLeft className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {announcements.slice(0, 3).map(ann => (
              <div key={ann.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50">
                <div className="mt-0.5"><StatusBadge status={ann.type} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ann.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{ann.content}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {quickAction && (
        <QuickActionModal
          action={quickAction}
          students={students}
          classId={CLASS_ID}
          onClose={() => setQuickAction(null)}
          onSuccess={() => { setQuickAction(null); loadData(); }}
        />
      )}
    </div>
  );
}