import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { getStudentClassId, getStudentClassName } from '@/lib/studentProfile';
import { fetchMyStudent } from '@/lib/studentData';
import { getUserFirstName } from '@/lib/roleUtils';
import NowNextCard from '@/components/schedule/NowNextCard';
import { isEventRelevantForStudent } from '@/components/exams/AudienceEditor';
import StudentQuickStats from '@/components/student/StudentQuickStats';
import UpcomingExamsCard from '@/components/student/UpcomingExamsCard';
import AttendanceStatusCard from '@/components/student/AttendanceStatusCard';
import StudentAnnouncements from '@/components/student/StudentAnnouncements';
import StudentAlertsCard from '@/components/student/StudentAlertsCard';
import { getLocalDateString } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';

const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function StudentHome({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadRequestId = useRef(0);
  const today = getLocalDateString();
  const todayDayName = dayNames[new Date().getDay()];
  const classId = getStudentClassId(user, '');
  const className = getStudentClassName(user);

  useEffect(() => {
    loadData(true);
    return () => { loadRequestId.current += 1; };
  }, [user?.id, classId]);

  async function loadData(showLoading = false) {
    const requestId = ++loadRequestId.current;
    if (showLoading) {
      setLoading(true);
      setData(null);
    }
    setError('');
    try {
      if (!classId) throw new Error('Missing student class assignment');
      const [anns, exs, student] = await Promise.all([
        base44.entities.Announcement.filter({ class_id: classId, is_published: true }),
        base44.entities.Exam.list('date', 300),
        fetchMyStudent(user, classId),
      ]);

      const [reads, attendance, communityReports, alerts] = student ? await Promise.all([
        base44.entities.AnnouncementRead.filter({ student_id: student.id }),
        base44.entities.AttendanceRecord.filter({ student_id: student.id }, '-date', 60),
        base44.entities.CommunityServiceReport.filter({ student_id: student.id }),
        base44.entities.SmartAlert.filter({ student_id: student.id, is_active: true }),
      ]) : [[], [], [], []];

      const relevantExams = (exs || [])
        .filter(e => student ? isEventRelevantForStudent(e, student) : e.class_id === classId)
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      if (requestId !== loadRequestId.current) return;
      setData({
        student,
        announcements: (anns || [])
          .filter(a => ['כיתתית', 'חשובה'].includes(a.type) || (a.type === 'אישית' && a.target_student_id === student?.id))
          .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || '')),
        reads: reads || [],
        attendance: attendance || [],
        communityReports: communityReports || [],
        alerts: (alerts || []).sort((a, b) => (b.created_date || '').localeCompare(a.created_date || '')),
        exams: relevantExams,
      });
    } catch (loadError) {
      if (requestId !== loadRequestId.current) return;
      console.error('Student home load failed:', loadError);
      setError('לא הצלחנו לטעון את עמוד הבית. בדקו את החיבור ונסו שוב.');
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16" role="status" aria-live="polite">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" aria-hidden="true" />
        <span className="sr-only">טוענים את עמוד הבית</span>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center" dir="rtl" role="alert">
        <p className="text-sm text-destructive">{error}</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => loadData(true)}>
          נסו שוב
        </Button>
      </div>
    );
  }
  if (!data) return null;

  const upcomingExams = data.exams.filter(e => (e.date || '') >= today);
  const communityApproved = data.communityReports.filter(r => r.status === 'אושר').reduce((s, r) => s + Number(r.hours || 0), 0);

  return (
    <div className="p-4 lg:p-6 space-y-4 text-right max-w-3xl mx-auto" dir="rtl">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {error}
          <Button type="button" variant="ghost" size="sm" className="mr-2 h-7" onClick={() => loadData(false)}>
            נסו שוב
          </Button>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-foreground">שלום, {getUserFirstName(user)} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">יום {todayDayName}{className ? ` · כיתה ${className}` : ''}</p>
      </div>

      {/* שיעור נוכחי / הבא */}
      <NowNextCard classId={classId} />

      {/* מבט מהיר: מבחן קרוב · נוכחות · מעורבות */}
      <StudentQuickStats
        nextExam={upcomingExams[0]}
        attendanceRecords={data.attendance}
        communityApproved={communityApproved}
        communityGoal={data.student?.community_service_goal || 60}
      />

      <StudentAlertsCard alerts={data.alerts} />

      <UpcomingExamsCard exams={upcomingExams} />

      <AttendanceStatusCard records={data.attendance} />

      <StudentAnnouncements announcements={data.announcements} reads={data.reads} student={data.student} onChanged={loadData} />
    </div>
  );
}
