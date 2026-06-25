import { useState, useEffect, useRef } from 'react';
import { THRESHOLDS } from '@/pages/ClassAttendance';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import StatCard from '@/components/ui/StatCard';
import UrgentFlagsSection from '@/components/urgent/UrgentFlagsSection';
import DailySmartCard from '@/components/dashboard/DailySmartCard';
import WatchStudentsSection from '@/components/dashboard/WatchStudentsSection';
import AttendanceExceptionsCard from '@/components/dashboard/AttendanceExceptionsCard';
import AttendanceExceptionsDialog from '@/components/dashboard/AttendanceExceptionsDialog';
import ClassAssignmentAlert from '@/components/students/ClassAssignmentAlert';

import {
  Users, Clock, AlertTriangle, BookOpen, CheckSquare,
  Shield, Heart, UserCheck, Calendar, MessageSquare,
  Megaphone, Star, ChevronLeft, TrendingUp, CalendarDays
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TYPE_STYLES } from '@/components/exams/eventConstants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/StatusBadge';
import QuickActionModal from '@/components/dashboard/QuickActionModal';
import OpenTasksDialog from '@/components/dashboard/OpenTasksDialog';
import DisciplineEventDialog from '@/components/dashboard/DisciplineEventDialog';
import NotificationsDropdown from '@/components/dashboard/NotificationsDropdown';
import SchoolNameBanner from '@/components/layout/SchoolNameBanner';
import RoleIcon from '@/components/ui/RoleIcon';
import NowNextCard from '@/components/schedule/NowNextCard';
import { getUserApprovedClass, getUserApprovedClassId, getUserApprovedGrade } from '@/lib/schoolStructure';
import { getAvailableRoles, getUserFirstName, hasApprovedRole, getRoleDisplayLines, getRoleShort } from '@/lib/roleUtils';
import { getClassDisplayName, getHomeroomClassLabel } from '@/lib/classIdentity';
import useReadNotifications from '@/hooks/useReadNotifications';
import { ATTENDANCE_EXCEPTION_STATUSES, getAttendanceScopedStudents, getScopedClassIds, filterScopedAttendance, getSelectedAttendanceDate, getLocalDateString, loadScopedAttendanceForDate } from '@/lib/attendanceScope.js';

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
function hebrewDate() {
  const d = new Date();
  return `יום ${HEBREW_DAYS[d.getDay()]}, ${d.getDate()} ב${HEBREW_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function Dashboard({ user, role, initialData }) {
   const navigate = useNavigate();
   const [students, setStudents] = useState(initialData?.students || []);
   const [todayAttendance, setTodayAttendance] = useState(initialData?.todayAttendance || []);
   const [exams, setExams] = useState(initialData?.exams || []);
   const [tasks, setTasks] = useState(initialData?.tasks || []);
   const [discipline, setDiscipline] = useState(initialData?.discipline || []);
   const [announcements, setAnnouncements] = useState(initialData?.announcements || []);
   const [loading, setLoading] = useState(!initialData);
   const [quickAction, setQuickAction] = useState(null);
   const [tasksDialogOpen, setTasksDialogOpen] = useState(false);
   const [selectedDisciplineEvent, setSelectedDisciplineEvent] = useState(null);
   const [attendanceFilterOpen, setAttendanceFilterOpen] = useState(false);
   const [dashboardClassRoom, setDashboardClassRoom] = useState(null);
   const [upcomingConversations, setUpcomingConversations] = useState([]);
   const [allAttRecords, setAllAttRecords] = useState([]);
   const [performanceReviews, setPerformanceReviews] = useState([]);
   const loadTimerRef = useRef(null);
  const isLoadingDataRef = useRef(false);
  const pendingReloadRef = useRef(false);
  const lastLoadAtRef = useRef(0);

  const today = getLocalDateString();
  const attendanceDate = getSelectedAttendanceDate();
  const approvedRoles = getAvailableRoles(user);
  const isAdmin = approvedRoles.includes('admin') || approvedRoles.includes('system_admin');
  const hasClassRole = approvedRoles.includes('homeroom_teacher');
  const hasCoordinatorRole = approvedRoles.includes('coordinator');
  const isActiveHomeroom = role === 'homeroom_teacher';
  const isActiveCoordinator = role === 'coordinator';
  const isActiveAdmin = role === 'admin';
  const roleDisplayLines = getRoleDisplayLines(user, role);
  const dashboardTitle = roleDisplayLines[0];
  const dashboardSecondaryTitle = roleDisplayLines.slice(1).join(' · ');
  // classId must be stable from the start — never depend on async-loaded students
  const classId = getUserApprovedClassId(user, CLASS_ID);
  const classIdentityTitle = dashboardClassRoom ? getClassDisplayName(dashboardClassRoom, getUserApprovedClass(user)) : getUserApprovedClass(user);
  const headerRoleTitle = isActiveHomeroom ? getHomeroomClassLabel(dashboardClassRoom, classIdentityTitle) : dashboardTitle;
  const scopeLabels = [
    isActiveAdmin ? getRoleShort('admin', user) + ' מערכת' : null,
    isActiveHomeroom ? `${getRoleShort('homeroom_teacher', user)}${classIdentityTitle ? ` · ${classIdentityTitle}` : ''}` : null,
    isActiveCoordinator ? `${getRoleShort('coordinator', user)}${getUserApprovedGrade(user) ? ` · ${getUserApprovedGrade(user)}` : ''}` : null,
  ].filter(Boolean).join(' | ') || 'מערכת כללית';

  useEffect(() => {
    if (classId) {
      base44.entities.ClassRoom.list('grade', 500)
        .then(rows => setDashboardClassRoom((rows || []).find(item => item.id === classId) || null))
        .catch(() => setDashboardClassRoom(null));
    }
  }, [classId]);

  useEffect(() => {
    if (initialData) {
      setStudents(initialData.students || []);
      setTodayAttendance(initialData.todayAttendance || []);
      setExams(initialData.exams || []);
      setTasks(initialData.tasks || []);
      setDiscipline(initialData.discipline || []);
      setAnnouncements(initialData.announcements || []);
      setLoading(false);
    }
    loadData(!initialData);
    const scheduleReload = () => {
      clearTimeout(loadTimerRef.current);
      loadTimerRef.current = setTimeout(() => loadData(false), 150);
    };
    const unsubscribe = base44.entities.AttendanceRecord.subscribe(scheduleReload);
    const handleFocus = () => {
      // Reload on focus only if 30+ seconds have passed
      if (Date.now() - lastLoadAtRef.current > 30_000) {
        clearTimeout(loadTimerRef.current);
        loadTimerRef.current = setTimeout(() => loadData(false), 1500);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      clearTimeout(loadTimerRef.current);
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, role, attendanceDate]);

  async function loadData(showSpinner = true) {
    if (isLoadingDataRef.current) {
      pendingReloadRef.current = true;
      return;
    }

    isLoadingDataRef.current = true;
    if (showSpinner) setLoading(true);

    try {
      const scopedStudents = await getAttendanceScopedStudents(user, role);
      const classIds = getScopedClassIds(scopedStudents);
      const classIdSet = new Set(classIds);
      const scopedIds = new Set(scopedStudents.map(student => student.id));
      const shouldFetchAll = isActiveAdmin || classIds.length > 3;
      const filterByClass = records => (records || []).filter(record => classIdSet.has(record.class_id));
      
      const retryFetch = async (fn, retries = 2) => {
        for (let i = 0; i < retries; i++) {
          try {
            return await fn();
          } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(resolve => setTimeout(resolve, 350 * (i + 1)));
          }
        }
      };

      const fetchForScope = async (entityName, query = null, limit = 500) => {
        if (classIds.length === 0) return [];
        if (shouldFetchAll) {
          const records = await retryFetch(() =>
            query
              ? base44.entities[entityName].filter(query, '-updated_date', limit)
              : base44.entities[entityName].list('-updated_date', limit)
          );
          return filterByClass(records);
        }
        const results = await Promise.all(classIds.map(currentClassId => {
          const scopedQuery = query ? { ...query, class_id: currentClassId } : { class_id: currentClassId };
          return retryFetch(() => base44.entities[entityName].filter(scopedQuery, '-updated_date', limit));
        }));
        return results.flat();
      };

      const [att, exs, tks, dis, ann] = await Promise.all([
        loadScopedAttendanceForDate(scopedStudents, attendanceDate),
        fetchForScope('Exam', null, 250),
        fetchForScope('Task', null, 250),
        fetchForScope('DisciplineEvent', null, 250),
        fetchForScope('Announcement', null, 100),
      ]);

      setStudents(scopedStudents);
      setTodayAttendance(att);
      setDiscipline(dis.filter(record => scopedIds.has(record.student_id)));
      setTasks(tks.filter(task => !task.student_id || scopedIds.has(task.student_id)));
      setExams(exs);
      setAnnouncements(ann);
      setLoading(false);

      Promise.all([
        fetchForScope('AttendanceRecord', null, 800),
        fetchForScope('PerformanceReview', null, 300),
      ]).then(([allAtt, perf]) => {
        setAllAttRecords(filterScopedAttendance(allAtt, scopedStudents));
        setPerformanceReviews(perf.filter(record => scopedIds.has(record.student_id)));
      }).catch(() => {});
      lastLoadAtRef.current = Date.now();
    } catch (err) {
      console.error('Dashboard load error:', err);
      setLoading(false);
    } finally {
      setLoading(false);
      isLoadingDataRef.current = false;
    }

    if (pendingReloadRef.current) {
      pendingReloadRef.current = false;
      loadData(false);
    }
  }

  const presentToday = todayAttendance.filter(a => ['נוכח', 'נוכח/ת'].includes(a.status)).length;
  const absentToday  = todayAttendance.filter(a => ['נעדר', 'נעדר/ת'].includes(a.status)).length;
  const lateToday    = todayAttendance.filter(a => ['מאחר', 'מאחר/ת'].includes(a.status)).length;
  const releasedToday = todayAttendance.filter(a => ['שוחרר', 'שוחרר/ת'].includes(a.status)).length;
  const attendanceExceptionRecords = todayAttendance.filter(a => ATTENDANCE_EXCEPTION_STATUSES.includes(a.status));
  const attendanceExceptionsToday = attendanceExceptionRecords.length;
  const openTasks = tasks.filter(t => t.status !== 'בוצע').length;

  const MONTH_SHORT = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

  const upcomingEvents = exams
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const openTaskItems = tasks
    .filter(t => t.status !== 'בוצע')
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  const watchStudents = students.filter(s => s.status === 'דורש מעקב');

  // Upcoming scheduled conversations (for internal notification center)
  useEffect(() => {
    let cancelled = false;
    base44.entities.ScheduledConversation.filter({ status: 'מתוכננת' }, '-date', 200)
      .then(list => {
        if (cancelled) return;
        const scopedIds = new Set(students.map(s => s.id));
        const scopedClassIds = new Set(students.map(s => s.class_id).filter(Boolean));
        const mine = (list || []).filter(c =>
          c.owner_user_id === user?.id ||
          (c.student_id && scopedIds.has(c.student_id)) ||
          (c.class_id && scopedClassIds.has(c.class_id))
        );
        const now = Date.now();
        const soon = mine.filter(c => {
          const start = new Date(`${c.date}T${c.time || '00:00'}`).getTime();
          return start >= now && start - now <= 26 * 60 * 60 * 1000;
        }).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
        setUpcomingConversations(soon);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, students]);

  // Class attendance pattern alerts
  const attendanceAlertStudents = students.filter(s => {
    const absences = allAttRecords.filter(r => r.student_id === s.id && ['נעדר/ת'].includes(r.status)).length;
    const lates    = allAttRecords.filter(r => r.student_id === s.id && ['מאחר/ת'].includes(r.status)).length;
    return absences >= THRESHOLDS.absences || lates >= THRESHOLDS.lates;
  });

  const isCommunityException = (student) => {
    const goal = Number(student.community_service_goal ?? 60);
    const done = Number(student.community_service_done ?? 0);
    const status = student.community_service_status;
    return done <= 0 || done < goal || (!!status && status !== 'הושלם') || student.status === 'דורש מעקב';
  };

  const communityBehind = students.filter(isCommunityException);

  const canSeeClassAlerts = hasClassRole;
  const { isRead, markAsRead } = useReadNotifications();

  // Each notification has a "signature" derived from its current count.
  // When the count changes (new event), the signature changes and the
  // notification re-appears even if it was previously dismissed.
  const allNotifications = [

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
    ...upcomingConversations.map(c => ({
      id: `conversation-${c.id}`,
      signature: `conversation-${c.id}-${c.date}-${c.time}`,
      title: `${c.conversation_type}${c.student_name ? ` · ${c.student_name}` : ''}`,
      description: `${new Date(c.date).toLocaleDateString('he-IL')} בשעה ${c.time}`,
      to: c.student_id ? `/students/${c.student_id}` : '/conversations'
    })),
  ];

  const notifications = allNotifications.filter(item => !isRead(item.id, item.signature));

  const handleNotificationRead = (item) => {
    markAsRead(item.id, item.signature);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h1 className="text-xl lg:text-2xl font-bold text-foreground leading-tight">שלום, {getUserFirstName(user)} 👋</h1>
            <NotificationsDropdown notifications={notifications} onRead={handleNotificationRead} />
          </div>
          <p className="text-sm font-medium text-foreground/70 mt-0.5 flex items-center gap-1.5" dir="rtl">
            <RoleIcon role={role} roles={approvedRoles} />
            <span>{headerRoleTitle}</span>
          </p>
          {dashboardSecondaryTitle && <p className="text-xs text-muted-foreground/80 mt-0.5">{dashboardSecondaryTitle}</p>}
          <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5">
            <SchoolNameBanner inline />
            <span>{hebrewDate()}</span>
          </p>
        </div>
      </div>

      <ClassAssignmentAlert enabled={isActiveAdmin} onFixed={() => loadData(false)} />

      {/* Now / Next — shown first, always visible for staff with a class */}
      {(isActiveHomeroom || isActiveAdmin || isActiveCoordinator) && (
        <NowNextCard classId={classId} showEmpty />
      )}

      {(isActiveHomeroom || isActiveAdmin || isActiveCoordinator) && (
        <AttendanceExceptionsCard
          exceptionsCount={attendanceExceptionsToday}
          totalStudents={students.length}
          exceptions={attendanceExceptionRecords}
          date={attendanceDate !== today ? attendanceDate : 'היום'}
          onClick={() => attendanceExceptionsToday > 0 && setAttendanceFilterOpen(true)}
        />
      )}

      {/* Urgent Flags — dynamic items needing immediate attention (staff only) */}
      {(isActiveHomeroom || isActiveCoordinator || isActiveAdmin) && classId && (
        <UrgentFlagsSection
          classId={classId}
          user={user}
          canManage={isActiveHomeroom || isActiveCoordinator || isActiveAdmin}
        />
      )}

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
          onOpenDisciplineEvent={setSelectedDisciplineEvent}
        />
      )}

      {/* Watch Students Section — identify students needing attention */}
      {(isActiveHomeroom || isActiveAdmin || isActiveCoordinator) && (
        <WatchStudentsSection
          students={students}
          allAttendanceRecords={allAttRecords}
          performanceReviews={performanceReviews}
          tasks={tasks}
          classId={classId}
        />
      )}

      {/* Tasks Card */}
      {openTasks > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={CheckSquare} title="משימות פתוחות" value={openTasks} subtitle="לטיפול" color={openTasks > 3 ? 'amber' : 'slate'} onClick={() => setTasksDialogOpen(true)} />
        </div>
      )}

      {/* Quick Actions — compact 4-col grid */}
      {(isActiveHomeroom || isActiveCoordinator || isActiveAdmin) && (() => {
        // Compute badges for relevant actions
        const attendanceExceptionsCount = attendanceExceptionsToday;
        const pendingParentTasks = tasks.filter(t => t.category === 'הורים' && t.status !== 'בוצע').length;
        const pendingTasksCount = tasks.filter(t => t.status !== 'בוצע').length;
        const communityBehindCount = communityBehind.length;

        const quickActions = [
          { icon: Star, label: 'חיזוק חיובי', action: 'positive_reinforcement', roles: ['admin', 'homeroom_teacher'], badge: 0 },
          { icon: Shield, label: 'משמעת', action: 'discipline', roles: ['admin', 'homeroom_teacher'], badge: 0 },
          { icon: BookOpen, label: 'מבחן', action: 'exam', roles: ['admin', 'coordinator', 'homeroom_teacher'], badge: 0 },
          { icon: Megaphone, label: 'הודעה', action: 'announcement', roles: ['admin', 'coordinator', 'homeroom_teacher'], badge: 0 },
          { icon: Star, label: 'הערה', action: 'note', roles: ['admin', 'homeroom_teacher'], badge: 0 },
          { icon: MessageSquare, label: 'הורים', action: 'communication', roles: ['admin', 'homeroom_teacher'], badge: pendingParentTasks },
          { icon: CheckSquare, label: 'משימה', action: 'task', roles: ['admin', 'coordinator', 'homeroom_teacher'], badge: pendingTasksCount },
          { icon: Heart, label: 'מעורבות', action: 'community', roles: ['admin', 'division_manager', 'coordinator', 'homeroom_teacher'], badge: communityBehindCount },
        ].filter(btn => btn.roles.some(itemRole => approvedRoles.includes(itemRole) || (itemRole === 'admin' && approvedRoles.includes('system_admin'))));
        if (!quickActions.length) return null;
        return (
          <section>
            <h2 className="text-sm font-bold text-foreground mb-2.5">פעולות מהירות</h2>
            <div className="grid grid-cols-4 gap-2">
              {quickActions.map(btn => {
                const commonClassName = "group relative flex flex-col items-center justify-center gap-1.5 py-3 px-1.5 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-primary/[0.04] transition-colors";
                const commonContent = (
                  <>
                    {btn.badge > 0 && (
                      <span className="absolute top-1.5 end-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center leading-none">
                        {btn.badge > 99 ? '99+' : btn.badge}
                      </span>
                    )}
                    <div className="w-9 h-9 rounded-lg bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
                      <btn.icon className="w-4 h-4 text-primary" strokeWidth={2.2} />
                    </div>
                    <span className="text-[11px] font-semibold text-foreground/80 leading-tight">{btn.label}</span>
                  </>
                );
                return (
                <button
                  key={btn.action}
                  onClick={() => setQuickAction(btn.action)}
                  className={commonClassName}
                >
                  {commonContent}
                </button>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Lists — show only when there is content */}
      {(upcomingEvents.length > 0 || announcements.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-4">
          {upcomingEvents.length > 0 && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  אירועים קרובים
                </CardTitle>
                <Link to="/exams" className="text-xs text-primary flex items-center gap-1 hover:underline">
                  הכל <ChevronLeft className="w-3 h-3" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingEvents.map(event => {
                  const d = new Date(event.date);
                  const typeStyle = TYPE_STYLES[event.type] || TYPE_STYLES['אחר'];
                  return (
                    <div key={event.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
                      {/* Date badge */}
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex flex-col items-center justify-center text-primary flex-shrink-0">
                        <span className="text-[11px] font-bold leading-none">{d.getDate()}</span>
                        <span className="text-[9px] leading-none mt-0.5">{MONTH_SHORT[d.getMonth()]}</span>
                      </div>
                      {/* Title + subtitle */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[event.subject, event.teacher].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {/* Type chip */}
                      {event.type && (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${typeStyle}`}>
                          {event.type}
                        </span>
                      )}
                    </div>
                  );
                })}
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

      <OpenTasksDialog
        open={tasksDialogOpen}
        onOpenChange={setTasksDialogOpen}
        tasks={openTaskItems}
        onChanged={() => loadData(false)}
      />

      <DisciplineEventDialog
        event={selectedDisciplineEvent}
        open={!!selectedDisciplineEvent}
        onOpenChange={(isOpen) => !isOpen && setSelectedDisciplineEvent(null)}
        onChanged={() => loadData(false)}
      />

      {quickAction && (
        <QuickActionModal
          action={quickAction}
          classId={classId}
          onClose={() => setQuickAction(null)}
          user={user}
          role={role}
          initialStudents={students}
          onSuccess={() => { setQuickAction(null); loadData(); }}
        />
      )}

      <AttendanceExceptionsDialog
        open={attendanceFilterOpen}
        onOpenChange={setAttendanceFilterOpen}
        records={attendanceExceptionRecords}
        dateLabel={attendanceDate !== today ? attendanceDate : 'היום'}
      />
    </div>
  );
}