import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { getStudentClassId, getStudentClassName } from '@/lib/studentProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from 'sonner';
import { Calendar, Megaphone, Check, Star, AlertCircle } from 'lucide-react';
import { getUserFirstName } from '@/lib/roleUtils';
import NowNextCard from '@/components/schedule/NowNextCard';
import { isEventRelevantForStudent } from '@/components/exams/AudienceEditor';
import StudentExamCalendar from '@/components/student/StudentExamCalendar';
import StudentCommunityService from '@/components/student/StudentCommunityService';
import LearningAccommodationsCard from '@/components/student/LearningAccommodationsCard';

export default function StudentHome({ user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [exams, setExams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [scheduleToday, setScheduleToday] = useState([]);
  const [studentData, setStudentData] = useState(null);
  const [reads, setReads] = useState([]);
  const [examCompletions, setExamCompletions] = useState([]);
  const [gradeReports, setGradeReports] = useState([]);
  const [communityReports, setCommunityReports] = useState([]);
  const [smartAlerts, setSmartAlerts] = useState([]);
  const [celebratingExamId, setCelebratingExamId] = useState(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const todayDayName = dayNames[new Date().getDay()];
  const studentClassId = getStudentClassId(user, CLASS_ID);
  const studentClassName = getStudentClassName(user);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [anns, exs, tks, slots, students] = await Promise.all([
      base44.entities.Announcement.filter({ class_id: studentClassId, is_published: true }),
      base44.entities.Exam.list('date', 300),
      base44.entities.Task.filter({ class_id: studentClassId }),
      base44.entities.ScheduleSlot.filter({ class_id: studentClassId, day: todayDayName }),
      base44.entities.Student.filter({ class_id: studentClassId }),
    ]);

    const myStudent = students.find(s => s.email === user?.email || s.user_email === user?.email);
    setStudentData(myStudent || null);

    const [myReads, myExamCompletions, myGradeReports, myCommunityReports, myAlerts] = myStudent ? await Promise.all([
      base44.entities.AnnouncementRead.filter({ student_id: myStudent.id }),
      base44.entities.ExamCompletion.filter({ student_id: myStudent.id }),
      base44.entities.ExamGradeReport.filter({ student_id: myStudent.id }),
      base44.entities.CommunityServiceReport.filter({ student_id: myStudent.id }),
      base44.entities.SmartAlert.filter({ student_id: myStudent.id, is_active: true })
    ]) : [[], [], [], [], []];
    setReads(myReads);
    setExamCompletions(myExamCompletions);
    setGradeReports(myGradeReports.sort((a,b) => (b.updated_action_at || '').localeCompare(a.updated_action_at || '')));
    setCommunityReports(myCommunityReports.sort((a,b) => (b.activity_date || '').localeCompare(a.activity_date || '')));
    setSmartAlerts(myAlerts.sort((a,b) => (b.created_date || '').localeCompare(a.created_date || '')));

    const relevantExams = (exs || []).filter(e => myStudent ? isEventRelevantForStudent(e, myStudent) : e.class_id === studentClassId);
    setAnnouncements(anns.filter(a => ['כיתתית', 'חשובה'].includes(a.type)).sort((a,b) => (b.published_at||'').localeCompare(a.published_at||'')));
    setExams(relevantExams.sort((a,b) => (a.date || '').localeCompare(b.date || '')));
    setTasks(tks.filter(t => t.status !== 'בוצע').slice(0, 5));
    setScheduleToday(slots.sort((a,b) => a.period - b.period));
    setLoading(false);
  }

  async function confirmRead(ann) {
    if (!studentData) return;
    const already = reads.find(r => r.announcement_id === ann.id);
    if (already) { toast.info('כבר אישרת קריאה'); return; }
    await base44.entities.AnnouncementRead.create({
      announcement_id: ann.id, student_id: studentData.id,
      student_name: studentData.full_name, read_at: new Date().toISOString()
    });
    toast.success('אישור קריאה נשלח!');
    loadData();
  }

  async function toggleExamCompletion(exam) {
    if (!studentData) return;
    const existing = examCompletions.find(item => item.exam_id === exam.id);
    if (existing) {
      await base44.entities.ExamCompletion.delete(existing.id);
      setExamCompletions(prev => prev.filter(item => item.id !== existing.id));
      toast.success('הסימון בוטל');
      return;
    }

    const completion = await base44.entities.ExamCompletion.create({
      exam_id: exam.id,
      student_id: studentData.id,
      student_name: studentData.full_name,
      completed_at: new Date().toISOString()
    });
    setExamCompletions(prev => [...prev, completion]);
    setCelebratingExamId(exam.id);
    setTimeout(() => setCelebratingExamId(null), 900);
    toast.success('כל הכבוד! המבחן סומן כבוצע');
  }

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>;

  return (
    <div className="p-4 lg:p-6 space-y-5 text-right" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">שלום, {getUserFirstName(user)} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">יום {todayDayName}{studentClassName ? ` · כיתה ${studentClassName}` : ''}</p>
      </div>

      {/* Now / Next smart card */}
      <NowNextCard classId={studentClassId} />

      {/* Today's Schedule */}
      {scheduleToday.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500"/>מערכת שעות היום</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {scheduleToday.map(slot => (
                <div key={slot.id} className="flex items-center gap-3 py-1.5">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">{slot.period}</span>
                  <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{slot.start_time}–{slot.end_time}</span>
                  <span className="text-sm font-medium">{slot.subject}</span>
                  {slot.teacher && <span className="text-xs text-muted-foreground">· {slot.teacher}</span>}
                  {slot.room && <span className="text-xs text-muted-foreground">חדר {slot.room}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <StudentExamCalendar exams={exams} student={studentData} user={user} reports={gradeReports} completions={examCompletions} onToggleCompletion={toggleExamCompletion} onChanged={loadData} />

      {studentData && <StudentCommunityService student={studentData} user={user} reports={communityReports} onChanged={loadData} />}

      {studentData && <LearningAccommodationsCard studentId={studentData.id} studentName={studentData.full_name} readOnly />}

      {/* Smart Alerts */}
      {smartAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {smartAlerts[0]?.alert_type === 'positive_reinforcement' ? (
                <Star className="w-4 h-4 text-amber-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-orange-500" />
              )}
              התראות חשובות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {smartAlerts.map(alert => {
              const bgColor = alert.alert_type === 'positive_reinforcement' 
                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30'
                : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30';
              return (
                <motion.div key={alert.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className={`p-3 rounded-xl ${bgColor}`}>
                    <div className="flex items-start gap-2">
                      {alert.alert_type === 'positive_reinforcement' ? (
                        <Star className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 text-right">
                        <p className="text-sm font-medium">{alert.message}</p>
                        {alert.details?.note && (
                          <p className="text-xs text-muted-foreground mt-1">{alert.details.note}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Megaphone className="w-4 h-4 text-amber-500"/>הודעות כיתה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.slice(0, 4).map(ann => {
              const alreadyRead = reads.some(r => r.announcement_id === ann.id);
              return (
                <motion.div key={ann.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className={`p-3 rounded-xl ${ann.type === 'חשובה' ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30' : 'bg-muted/50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={ann.type} />
                      {alreadyRead && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full">קראתי ✓</span>}
                    </div>
                    <p className="text-sm font-medium">{ann.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ann.content}</p>
                    {ann.requires_confirmation && !alreadyRead && (
                      <Button size="sm" variant="outline" className="mt-2 gap-1.5 text-xs h-7" onClick={() => confirmRead(ann)}>
                        <Check className="w-3 h-3"/>אישור קריאה
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}