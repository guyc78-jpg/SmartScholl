import { useState, useEffect } from 'react';
import { THRESHOLDS } from '@/pages/ClassAttendance';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import StatCard from '@/components/ui/StatCard';
import TodayHighlights from '@/components/dashboard/TodayHighlights';
import DailySmartCard from '@/components/dashboard/DailySmartCard';
import WatchStudentsSection from '@/components/dashboard/WatchStudentsSection';
import SmartAlerts from '@/components/dashboard/SmartAlerts';
import {
  Users, Clock, AlertTriangle, BookOpen, CheckSquare,
  Shield, Heart, UserCheck, Calendar, MessageSquare,
  Megaphone, Star, ChevronLeft, TrendingUp, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/StatusBadge';
import QuickActionModal from '@/components/dashboard/QuickActionModal';
import NotificationsDropdown from '@/components/dashboard/NotificationsDropdown';
import SchoolNameBanner from '@/components/layout/SchoolNameBanner';
import NowNextCard from '@/components/schedule/NowNextCard';
import { isStudentInApprovedScope, getUserApprovedClass, getUserApprovedGrade, getUserApprovedClassId } from '@/lib/schoolStructure';
import { getAvailableRoles, getUserFirstName, hasApprovedRole, getRoleHomeLabel, getRoleShort } from '@/lib/roleUtils';
import useReadNotifications from '@/hooks/useReadNotifications';

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
  const isActiveHomeroom = role === 'homeroom_teacher';
  const isActiveCoordinator = role === 'coordinator';
  const isActiveAdmin = role === 'admin';
  const dashboardTitle = getRoleHomeLabel(user, role);
  const classId = getUserApprovedClassId(user, CLASS_ID);
  const scopeLabels = [
    isActiveAdmin ? getRoleShort('admin', user) + ' מערכת' : null,
    isActiveHomeroom ? `${getRoleShort('homeroom_teacher', user)}${getUserApprovedClass(user) ? ` · ${getUserApprovedClass(user)}` : ''}` : null,
    isActiveCoordinator ? `${getRoleShort('coordinator', user)}${getUserApprovedGrade(user) ? ` · ${getUserApprovedGrade(user)}` : ''}` : null,
  ].filter(Boolean).join(' | ') || 'מערכת כללית';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [sts, att, exs, tks, dis, ann] = await Promise.all([
      base44.entities.Student.filter({ class_id: classId }),
      base44.entities.AttendanceRecord.filter({ class_id: classId, date: today }),
      base44.entities.Exam.filter({ class_id: classId }),
      base44.entities.Task.filter({ class_id: classId }),
      base44.entities.DisciplineEvent.filter({ class_id: classId }),
      base44.entities.Announcement.filter({ class_id: classId }),
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
  const [performanceReviews, setPerformanceReviews] = useState([]);
  useEffect(() => {
    Promise.all([
      base44.entities.AttendanceRecord.filter({ class_id: classId }),
      base44.entities.PerformanceReview.filter({ class_id: classId })
    ]).then(([att, perf]) => {
      setAllAttRecords(att);
      setPerformanceReviews(perf);
    });
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
  const { isRead, markAsRead } = useReadNotifications();

  // Each notification has a "signature" derived from its current count.
  // When the count changes (new event), the signature changes and the
  // notification re-appears even if it was previously dismissed.
  const allNotifications = [
    ...(canSeeClassAlerts && openDiscipline > 0 ? [{
      id: 'discipline',
      signature: `discipline-${openDiscipline}`,
      title: `${openDiscipline} אירועי משמעת פתוחים`,
      description: 'דורש טיפול ומעקב',
      to: '/discipline'
    }] : []),
    ...(openTasks > 0 ? [{
      id: 'tasks',
      signature: `tasks-${openTasks}`,
      title: `${openTasks} משימות פתוחות`,
      description: 'משימות שממתינות לטיפול',
      to: '/tasks'
    }] : []),
    ...(canSeeClassAlerts && attendanceAlertStudents.length > 0 ? [{
      id: 'attendance',
      signature: `attendance-${attendanceAlertStudents.length}`,
      title: `${attendanceAlertStudents.length} התראות נוכחות`,
      description: 'תלמידים שחצו סף היעדרויות או איחורים',
      to: '/class-attendance'
    }] : []),
    ...(canSeeClassAlerts && watchStudents.length > 0 ? [{
      id: 'watch-students',
      signature: `watch-${watchStudents.length}`,
      title: `${watchStudents.length} תלמידים למעקב`,
      description: 'תלמידים שסומנו כדורשים מעקב',
      to: '/students'
    }] : []),
  ];

  const notifications = allNotifications.filter(item => !isRead(item.id, item.signature));

  const handleNotificationRead = (item) => {
    markAsRead(item.id, item.signature);
  };

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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold text-foreground leading-tight">שלום, {getUserFirstName(user)} 👋</h1>
          <p className="text-sm font-medium text-foreground/70 mt-0.5">{dashboardTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5">
            <SchoolNameBanner inline />
            <span>{hebrewDate()}</span>
          </p>
        </div>
        <NotificationsDropdown notifications={notifications} onRead={handleNotificationRead} />
      </div>

      {/* Now / Next — only useful for homeroom teachers (have a class) */}
      {(isActiveHomeroom || isActiveAdmin) && <NowNextCard classId={classId} />}

      {/* Daily Smart Card — unified intelligence on what matters today */}
      {(isActiveHomeroom || isActiveAdmin || isActiveCoordinator) && (
        <DailySmartCard
          classId={classId}
          students={students}
          todayAttendance={todayAttendance}
          exams={exams}
          tasks={tasks}
          discipline={discipline}
          announcements={announcements}
          role={role}
          user={user}
        />
      )}

      {/* Smart Alerts */}
      {(isActiveHomeroom || isActiveAdmin || isActiveCoordinator) && (
        <SmartAlerts userRole={role} />
      )}

      {/* Watch Students Section — identify students needing attention */}
      {(isActiveHomeroom || isActiveAdmin || isActiveCoordinator) && (
        <WatchStudentsSection
          students={students}
          allAttendanceRecords={allAttRecords}
          performanceReviews={performanceReviews}
          disciplineEvents={discipline}
          tasks={tasks}
          classId={classId}
        />
      )}

      {isAdmin && (
        <section>
          <h2 className="text-sm font-bold text-foreground mb-2.5 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            ניהול מערכת
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              { to: '/users', label: 'הרשאות', icon: UserCheck },
              { to: '/classrooms', label: 'כיתות', icon: Users },
              { to: '/approvals', label: 'אישורי הרשמה', icon: CheckSquare },
              { to: '/reports', label: 'דוחות', icon: TrendingUp },
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-primary/[0.04] transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-primary" strokeWidth={2.2} />
                </div>
                <span className="text-sm font-semibold text-foreground/85 truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Today Highlights — what really matters today */}
      {(() => {
        const highlights = [];
        if (absentToday + lateToday > 0) highlights.push({
          id: 'absent', icon: AlertTriangle, label: `${absentToday + lateToday} נעדרים/מאחרים היום`,
          hint: `${absentToday} נעדר · ${lateToday} מאחר`, value: absentToday + lateToday,
          tone: absentToday + lateToday > 2 ? 'urgent' : 'warn', to: '/class-attendance'
        });
        if (todayAttendance.length === 0 && (isActiveHomeroom || isActiveAdmin) && students.length > 0) highlights.push({
          id: 'no-att', icon: Clock, label: 'נוכחות היום טרם סומנה', hint: 'התחילו לסמן נוכחות לכיתה',
          tone: 'info', to: '/class-attendance'
        });
        if (openDiscipline > 0) highlights.push({
          id: 'disc', icon: Shield, label: 'אירועי משמעת פתוחים', hint: 'דורש טיפול ומעקב',
          value: openDiscipline, tone: 'urgent', to: '/discipline'
        });
        if (urgentTasks.length > 0) highlights.push({
          id: 'tasks', icon: CheckSquare, label: 'משימות דחופות',
          hint: urgentTasks[0]?.title, value: urgentTasks.length, tone: 'warn', to: '/tasks'
        });
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowIso = tomorrow.toISOString().split('T')[0];
        const imminentExam = nextExams.find(e => e.date === today || e.date === tomorrowIso);
        if (imminentExam) highlights.push({
          id: 'exam-now', icon: BookOpen,
          label: imminentExam.date === today ? 'מבחן היום' : 'מבחן מחר',
          hint: `${imminentExam.title}${imminentExam.subject ? ' · ' + imminentExam.subject : ''}`,
          tone: 'info', to: '/exams'
        });
        if (attendanceAlertStudents.length > 0) highlights.push({
          id: 'att-alerts', icon: Users, label: 'תלמידים עם בעיית נוכחות',
          hint: 'חצו סף היעדרויות/איחורים', value: attendanceAlertStudents.length,
          tone: 'warn', to: '/class-attendance'
        });
        if (announcements.length > 0) highlights.push({
          id: 'ann', icon: Megaphone, label: 'הודעה אחרונה לכיתה',
          hint: announcements[0]?.title, tone: 'info', to: '/announcements'
        });
        return <TodayHighlights items={highlights} />;
      })()}

      {/* Admin: 4 main management actions */}
      {isActiveAdmin && (
        <section>
          <h2 className="text-sm font-bold text-foreground mb-2.5 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            ניהול מערכת
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              { to: '/users', label: 'הרשאות', icon: UserCheck },
              { to: '/classrooms', label: 'כיתות', icon: Users },
              { to: '/approvals', label: 'אישורי הרשמה', icon: CheckSquare },
              { to: '/reports', label: 'דוחות', icon: TrendingUp },
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-primary/[0.04] transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-primary" strokeWidth={2.2} />
                </div>
                <span className="text-sm font-semibold text-foreground/85 truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Stat Cards — show only non-zero KPIs to avoid empty look */}
      {(() => {
        const kpis = [
          students.length > 0 && { icon: Users, title: 'תלמידים', value: students.length, subtitle: 'בכיתה', color: 'blue' },
          presentToday > 0 && { icon: UserCheck, title: 'נוכחים היום', value: presentToday, subtitle: `מתוך ${todayAttendance.length}`, color: 'green' },
          openTasks > 0 && { icon: CheckSquare, title: 'משימות פתוחות', value: openTasks, subtitle: 'לטיפול', color: openTasks > 3 ? 'amber' : 'slate' },
        ].filter(Boolean);
        if (kpis.length === 0) return null;
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map(k => <StatCard key={k.title} {...k} />)}
          </div>
        );
      })()}

      {/* Quick Actions — compact 4-col grid */}
      {(isActiveHomeroom || isActiveCoordinator || isActiveAdmin) && (() => {
        const quickActions = [
          { icon: Clock, label: 'נוכחות', action: 'attendance', roles: ['admin', 'homeroom_teacher'] },
          { icon: Shield, label: 'משמעת', action: 'discipline', roles: ['admin', 'homeroom_teacher'] },
          { icon: BookOpen, label: 'מבחן', action: 'exam', roles: ['admin', 'coordinator', 'homeroom_teacher'] },
          { icon: Megaphone, label: 'הודעה', action: 'announcement', roles: ['admin', 'coordinator', 'homeroom_teacher'] },
          { icon: Star, label: 'הערה', action: 'note', roles: ['admin', 'homeroom_teacher'] },
          { icon: MessageSquare, label: 'הורים', action: 'communication', roles: ['admin', 'homeroom_teacher'] },
          { icon: CheckSquare, label: 'משימה', action: 'task', roles: ['admin', 'coordinator', 'homeroom_teacher'] },
          { icon: Heart, label: 'מעורבות', action: 'community', roles: ['admin', 'homeroom_teacher'] },
        ].filter(btn => btn.roles.some(itemRole => approvedRoles.includes(itemRole)));
        if (!quickActions.length) return null;
        return (
          <section>
            <h2 className="text-sm font-bold text-foreground mb-2.5">פעולות מהירות</h2>
            <div className="grid grid-cols-4 gap-2">
              {quickActions.map(btn => (
                <button
                  key={btn.action}
                  onClick={() => setQuickAction(btn.action)}
                  className="group flex flex-col items-center justify-center gap-1.5 py-3 px-1.5 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-primary/[0.04] transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
                    <btn.icon className="w-4 h-4 text-primary" strokeWidth={2.2} />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground/80 leading-tight">{btn.label}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Lists — show only when there is content */}
      {(nextExams.length > 0 || urgentTasks.length > 0 || announcements.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-4">
          {nextExams.length > 0 && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">מבחנים קרובים</CardTitle>
                <Link to="/exams" className="text-xs text-primary flex items-center gap-1 hover:underline">
                  הכל <ChevronLeft className="w-3 h-3" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                {nextExams.map(exam => (
                  <div key={exam.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex flex-col items-center justify-center text-primary">
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
          )}

          {urgentTasks.length > 0 && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">משימות ותזכורות דחופות</CardTitle>
                <Link to="/tasks" className="text-xs text-primary flex items-center gap-1 hover:underline">
                  הכל <ChevronLeft className="w-3 h-3" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                {urgentTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
                    <div className={`w-1.5 h-10 rounded-full ${task.priority === 'דחופה' ? 'bg-destructive' : 'bg-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.student_name && <p className="text-xs text-muted-foreground">{task.category === 'הורים' ? 'תזכורת שיחה · ' : ''}{task.student_name}</p>}
                    </div>
                    <StatusBadge status={task.priority} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {announcements.length > 0 && (
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
          )}
        </div>
      )}

      {quickAction && (
        <QuickActionModal
          action={quickAction}
          students={students}
          classId={classId}
          onClose={() => setQuickAction(null)}
          user={user}
          role={role}
          onSuccess={() => { setQuickAction(null); loadData(); }}
        />
      )}
    </div>
  );
}