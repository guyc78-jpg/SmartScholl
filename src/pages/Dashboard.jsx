import { useState, useEffect } from 'react';
import { THRESHOLDS } from '@/pages/ClassAttendance';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import StatCard from '@/components/ui/StatCard';
import {
  Users, Clock, AlertTriangle, BookOpen, CheckSquare,
  Shield, Heart, UserCheck, Plus, Calendar, MessageSquare,
  Megaphone, Star, ChevronLeft, TrendingUp, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/StatusBadge';
import QuickActionModal from '@/components/dashboard/QuickActionModal';
import NotificationsDropdown from '@/components/dashboard/NotificationsDropdown';
import { isStudentInApprovedScope, getUserApprovedClass, getUserApprovedGrade } from '@/lib/schoolStructure';
import { getAvailableRoles, getUserFirstName, hasApprovedRole } from '@/lib/roleUtils';

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
function hebrewDate() {
  const d = new Date();
  return `יום ${HEBREW_DAYS[d.getDay()]}, ${d.getDate()} ב${HEBREW_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function Dashboard({ user, role }) {
  const [students, setStudents] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [exams, setExams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [discipline, setDiscipline] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickAction, setQuickAction] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const approvedRoles = getAvailableRoles(user);
  const isAdmin = approvedRoles.includes('admin');
  const hasClassRole = approvedRoles.includes('homeroom_teacher');
  const hasCoordinatorRole = approvedRoles.includes('coordinator');
  const dashboardTitle = isAdmin ? 'ניהול מערכת' : hasClassRole ? 'הכיתה שלי' : hasCoordinatorRole ? 'השכבה שלי' : 'דשבורד';
  const scopeLabels = [
    isAdmin ? 'ניהול מערכת' : null,
    hasClassRole ? `הכיתה שלי${getUserApprovedClass(user) ? ` · ${getUserApprovedClass(user)}` : ''}` : null,
    hasCoordinatorRole ? `השכבה שלי${getUserApprovedGrade(user) ? ` · ${getUserApprovedGrade(user)}` : ''}` : null,
  ].filter(Boolean).join(' | ') || 'מערכת כללית';

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
    const scopeRole = hasApprovedRole(user, 'homeroom_teacher') ? 'homeroom_teacher' : hasApprovedRole(user, 'coordinator') ? 'coordinator' : role;
    const scopedStudents = isAdmin && !hasClassRole && !hasCoordinatorRole ? sts : sts.filter(student => isStudentInApprovedScope(student, user, scopeRole));
    const scopedIds = new Set(scopedStudents.map(student => student.id));
    setStudents(scopedStudents);
    setTodayAttendance(att.filter(record => scopedIds.has(record.student_id)));
    setDiscipline(dis.filter(record => scopedIds.has(record.student_id)));
    setTasks(tks.filter(task => !task.student_id || scopedIds.has(task.student_id)));
    setExams(exs);
    setAnnouncements(ann);
    setLoading(false);
    return;
    setTodayAttendance(att);
    setExams(exs);
    setTasks(tks);
    setDiscipline(dis);
    setAnnouncements(ann);
    setLoading(false);
  }

  const presentToday = todayAttendance.filter(a => ['נוכח', 'נוכח/ת'].includes(a.status)).length;
  const absentToday  = todayAttendance.filter(a => ['נעדר', 'נעדר/ת'].includes(a.status)).length;
  const lateToday    = todayAttendance.filter(a => ['מאחר', 'מאחר/ת'].includes(a.status)).length;
  const openTasks = tasks.filter(t => t.status !== 'בוצע').length;
  const openDiscipline = discipline.filter(d => d.status === 'פתוח').length;
  const pendingTasks = tasks.filter(t => t.status !== 'בוצע').length;

  const nextExams = exams
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const urgentTasks = tasks
    .filter(t => t.status !== 'בוצע' && ((t.priority === 'גבוהה' || t.priority === 'דחופה') || t.category === 'הורים'))
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
    .slice(0, 3);

  const watchStudents = students.filter(s => s.status === 'דורש מעקב');

  // Class attendance pattern alerts
  const [allAttRecords, setAllAttRecords] = useState([]);
  useEffect(() => {
    base44.entities.AttendanceRecord.filter({ class_id: CLASS_ID }).then(setAllAttRecords);
  }, []);
  const attendanceAlertStudents = students.filter(s => {
    const absences = allAttRecords.filter(r => r.student_id === s.id && ['נעדר/ת'].includes(r.status)).length;
    const lates    = allAttRecords.filter(r => r.student_id === s.id && ['מאחר/ת'].includes(r.status)).length;
    return absences >= THRESHOLDS.absences || lates >= THRESHOLDS.lates;
  });

  const communityBehind = students.filter(s => {
    const pct = s.community_service_goal > 0 ? (s.community_service_done / s.community_service_goal) * 100 : 0;
    return pct < 50 && s.status === 'פעיל';
  });

  const canSeeClassAlerts = hasClassRole;
  const canSeeCoordinatorAlerts = isAdmin || hasCoordinatorRole;
  const notifications = [
    ...(canSeeClassAlerts && openDiscipline > 0 ? [{
      id: 'discipline',
      title: `${openDiscipline} אירועי משמעת פתוחים`,
      description: 'דורש טיפול ומעקב',
      to: '/discipline'
    }] : []),
    ...(openTasks > 0 ? [{
      id: 'tasks',
      title: `${openTasks} משימות פתוחות`,
      description: 'משימות שממתינות לטיפול',
      to: '/tasks'
    }] : []),
    ...(canSeeClassAlerts && attendanceAlertStudents.length > 0 ? [{
      id: 'attendance',
      title: `${attendanceAlertStudents.length} התראות נוכחות`,
      description: 'תלמידים שחצו סף היעדרויות או איחורים',
      to: '/class-attendance'
    }] : []),
    ...(canSeeClassAlerts && watchStudents.length > 0 ? [{
      id: 'watch-students',
      title: `${watchStudents.length} תלמידים למעקב`,
      description: 'תלמידים שסומנו כדורשים מעקב',
      to: '/students'
    }] : []),
    ...(canSeeCoordinatorAlerts && nextExams.length > 0 ? [{
      id: 'exams',
      title: `${nextExams.length} מבחנים קרובים`,
      description: 'מבחנים מתוכננים להמשך',
      to: '/exams'
    }] : []),
  ];

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
          <h1 className="text-2xl font-bold text-foreground">{dashboardTitle} · שלום, {getUserFirstName(user)} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{hebrewDate()} · {scopeLabels}</p>
        </div>
        <NotificationsDropdown notifications={notifications} />
      </div>

      {isAdmin && (
        <section>
          <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            ניהול מערכת
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { to: '/users', label: 'הרשאות משתמשים', icon: UserCheck, bg: 'bg-[#047857]', text: 'text-white', chip: 'bg-white/15 text-white' },
              { to: '/approvals', label: 'אישורי הרשמה', icon: CheckSquare, bg: 'bg-[#F59E0B]', text: 'text-[#3D2A05]', chip: 'bg-white/30 text-[#3D2A05]' },
              { to: '/reports', label: 'דוחות', icon: TrendingUp, bg: 'bg-[#C97264]', text: 'text-white', chip: 'bg-white/20 text-white' },
              { to: '/grade-monitor', label: 'מעקב שכבה', icon: Shield, bg: 'bg-[#A0522D]', text: 'text-white', chip: 'bg-white/20 text-white' },
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl transition-shadow hover:shadow-lg ${item.bg} ${item.text}`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.chip}`}>
                  <item.icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <span className="text-sm font-semibold text-center leading-tight">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {hasClassRole && (
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">הכיתה שלי · {getUserApprovedClass(user) || 'לא הוגדרה כיתה'}</h2>
          <p className="text-sm text-muted-foreground">אזור נתוני הכיתה המשויכת המאושרת שלך.</p>
        </div>
      )}

      {hasCoordinatorRole && (
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">השכבה שלי · {getUserApprovedGrade(user) || 'לא הוגדרה שכבה'}</h2>
          <p className="text-sm text-muted-foreground">אזור נתוני השכבה המשויכת המאושרת שלך.</p>
        </div>
      )}

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
              { icon: Clock, label: 'סימון נוכחות', action: 'attendance', tile: 'bg-[#DDEAF5]', chip: 'bg-white text-[#1E5F8C]', roles: ['admin', 'homeroom_teacher'] },
              { icon: Shield, label: 'אירוע משמעת', action: 'discipline', tile: 'bg-[#FBE3DA]', chip: 'bg-white text-[#B91C1C]', roles: ['admin', 'homeroom_teacher'] },
              { icon: BookOpen, label: 'הוספת מבחן', action: 'exam', tile: 'bg-[#EDE3F1]', chip: 'bg-white text-[#6D28D9]', roles: ['admin', 'coordinator', 'homeroom_teacher'] },
              { icon: Megaphone, label: 'הודעה לכיתה', action: 'announcement', tile: 'bg-[#FBEBC1]', chip: 'bg-white text-[#B45309]', roles: ['admin', 'coordinator', 'homeroom_teacher'] },
              { icon: Star, label: 'הערת מחנך', action: 'note', tile: 'bg-[#E7F1EB]', chip: 'bg-white text-[#047857]', roles: ['admin', 'homeroom_teacher'] },
              { icon: MessageSquare, label: 'שיחה עם הורים', action: 'communication', tile: 'bg-[#D7EEEC]', chip: 'bg-white text-[#0E7490]', roles: ['admin', 'homeroom_teacher'] },
              { icon: CheckSquare, label: 'משימה חדשה', action: 'task', tile: 'bg-[#E0E2F5]', chip: 'bg-white text-[#3730A3]', roles: ['admin', 'coordinator', 'homeroom_teacher'] },
              { icon: Heart, label: 'עדכון מעורבות', action: 'community', tile: 'bg-[#F8DCE5]', chip: 'bg-white text-[#BE185D]', roles: ['admin', 'homeroom_teacher'] },
            ].filter(btn => btn.roles.some(itemRole => approvedRoles.includes(itemRole))).map(btn => (
              <motion.button
                key={btn.action}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setQuickAction(btn.action)}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-shadow hover:shadow-md ${btn.tile} dark:bg-muted`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${btn.chip}`}>
                  <btn.icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <span className="text-xs font-semibold text-foreground/80 text-center leading-tight">{btn.label}</span>
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
            <CardTitle className="text-base font-semibold">משימות ותזכורות דחופות</CardTitle>
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
                  {task.student_name && <p className="text-xs text-muted-foreground">{task.category === 'הורים' ? 'תזכורת שיחה · ' : ''}{task.student_name}</p>}
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

        {/* Attendance Alerts */}
        {attendanceAlertStudents.length > 0 && (
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                התראות נוכחות
              </CardTitle>
              <Link to="/class-attendance" className="text-xs text-primary flex items-center gap-1 hover:underline">
                לניהול <ChevronLeft className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {attendanceAlertStudents.slice(0, 3).map(s => {
                const abs = allAttRecords.filter(r => r.student_id === s.id && r.status === 'נעדר/ת').length;
                const lt  = allAttRecords.filter(r => r.student_id === s.id && r.status === 'מאחר/ת').length;
                return (
                  <Link key={s.id} to="/class-attendance" className="flex items-center gap-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                    <div className="w-9 h-9 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center text-red-700 dark:text-red-300 font-bold text-sm flex-shrink-0">
                      {s.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.full_name}</p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {abs >= THRESHOLDS.absences && `${abs} היעדרויות`}
                        {abs >= THRESHOLDS.absences && lt >= THRESHOLDS.lates && ' · '}
                        {lt >= THRESHOLDS.lates && `${lt} איחורים`}
                      </p>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </Link>
                );
              })}
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
          user={user}
          role={role}
          onSuccess={() => { setQuickAction(null); loadData(); }}
        />
      )}
    </div>
  );
}