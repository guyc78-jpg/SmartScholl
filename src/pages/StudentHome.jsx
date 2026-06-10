import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
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

const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function StudentHome({ user }) {
  const [data, setData] = useState(null);
  const today = new Date().toISOString().split('T')[0];
  const todayDayName = dayNames[new Date().getDay()];
  const classId = getStudentClassId(user, CLASS_ID);
  const className = getStudentClassName(user);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
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

    setData({
      student,
      announcements: anns
        .filter(a => ['כיתתית', 'חשובה'].includes(a.type) || (a.type === 'אישית' && a.target_student_id === student?.id))
        .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || '')),
      reads,
      attendance,
      communityReports,
      alerts: alerts.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || '')),
      exams: relevantExams,
    });
  }

  if (!data) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const upcomingExams = data.exams.filter(e => (e.date || '') >= today);
  const communityApproved = data.communityReports.filter(r => r.status === 'אושר').reduce((s, r) => s + Number(r.hours || 0), 0);

  return (
    <div className="p-4 lg:p-6 space-y-4 text-right max-w-3xl mx-auto" dir="rtl">
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