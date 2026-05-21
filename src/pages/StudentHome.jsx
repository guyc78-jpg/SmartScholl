import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from 'sonner';
import { Calendar, BookOpen, Megaphone, Heart, CheckSquare, Check, Clock, RotateCcw } from 'lucide-react';
import { getUserFirstName } from '@/lib/roleUtils';
import NowNextCard from '@/components/schedule/NowNextCard';

export default function StudentHome({ user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [exams, setExams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [scheduleToday, setScheduleToday] = useState([]);
  const [studentData, setStudentData] = useState(null);
  const [reads, setReads] = useState([]);
  const [examCompletions, setExamCompletions] = useState([]);
  const [celebratingExamId, setCelebratingExamId] = useState(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const todayDayName = dayNames[new Date().getDay()];

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [anns, exs, tks, slots, students] = await Promise.all([
      base44.entities.Announcement.filter({ class_id: CLASS_ID, is_published: true }),
      base44.entities.Exam.filter({ class_id: CLASS_ID }),
      base44.entities.Task.filter({ class_id: CLASS_ID }),
      base44.entities.ScheduleSlot.filter({ class_id: CLASS_ID, day: todayDayName }),
      base44.entities.Student.filter({ class_id: CLASS_ID }),
    ]);

    const myStudent = students.find(s => s.email === user?.email || s.user_email === user?.email);
    setStudentData(myStudent || students[0]); // fallback to first student for demo

    const [myReads, myExamCompletions] = myStudent ? await Promise.all([
      base44.entities.AnnouncementRead.filter({ student_id: myStudent.id }),
      base44.entities.ExamCompletion.filter({ student_id: myStudent.id })
    ]) : [[], []];
    setReads(myReads);
    setExamCompletions(myExamCompletions);

    setAnnouncements(anns.filter(a => ['כיתתית', 'חשובה'].includes(a.type)).sort((a,b) => (b.published_at||'').localeCompare(a.published_at||'')));
    setExams(exs.filter(e => e.date >= today).sort((a,b) => a.date.localeCompare(b.date)));
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

  const communityPct = studentData?.community_service_goal > 0
    ? Math.round((studentData.community_service_done / studentData.community_service_goal) * 100) : 0;
  const completedExamCount = exams.filter(exam => examCompletions.some(item => item.exam_id === exam.id)).length;
  const examProgressPct = exams.length ? Math.round((completedExamCount / exams.length) * 100) : 0;

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>;

  const formatDate = (d) => { const dt = new Date(d); return `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}`; };

  return (
    <div className="p-4 lg:p-6 space-y-5 text-right" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">שלום, {getUserFirstName(user)} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">יום {todayDayName} · כיתה {studentData?.class_name || 'י׳1'}</p>
      </div>

      {/* Now / Next smart card */}
      <NowNextCard classId={CLASS_ID} />

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

      {/* Upcoming Exams */}
      {exams.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-purple-500"/>מבחנים קרובים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 p-3">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">התקדמות מבחנים</span>
                <span className="font-bold">{completedExamCount} / {exams.length} בוצעו</span>
              </div>
              <div className="h-2.5 bg-white/70 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${examProgressPct}%` }} />
              </div>
            </div>
            {exams.slice(0, 4).map(exam => {
              const completed = examCompletions.some(item => item.exam_id === exam.id);
              const celebrating = celebratingExamId === exam.id;
              return (
                <div key={exam.id} className={`relative flex flex-col sm:flex-row sm:items-center gap-3 py-2 border-b last:border-0 ${completed ? 'opacity-80' : ''}`}>
                  {celebrating && <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0] }} transition={{ duration: 0.8 }} className="absolute left-4 top-1 text-3xl pointer-events-none">✅</motion.div>}
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${completed ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'}`}>
                      <span className="text-xs font-bold">{completed ? '✓' : formatDate(exam.date)}</span>
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${completed ? 'line-through text-muted-foreground' : ''}`}>{exam.title} {completed && '✅'}</p>
                      <p className="text-xs text-muted-foreground">{exam.subject}{exam.time ? ` · ${exam.time}` : ''}{exam.class_or_grade ? ` · ${exam.class_or_grade}` : ''}</p>
                      {exam.material && <p className="text-xs text-muted-foreground">📚 {exam.material}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={completed ? 'בוצע' : exam.type} />
                    <Button size="sm" variant={completed ? 'outline' : 'default'} className="h-8 text-xs gap-1.5" onClick={() => toggleExamCompletion(exam)}>
                      {completed ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                      {completed ? 'בטל סימון' : 'סיימתי את המבחן'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Community Service */}
      {studentData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Heart className="w-4 h-4 text-pink-500"/>מעורבות חברתית</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">התקדמות</span>
              <span className="font-bold">{studentData.community_service_done || 0} / {studentData.community_service_goal || 60} שע׳ ({communityPct}%)</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full ${communityPct >= 100 ? 'bg-emerald-500' : communityPct >= 50 ? 'bg-blue-500' : 'bg-red-400'}`}
                style={{ width: `${Math.min(communityPct, 100)}%` }}/>
            </div>
            <StatusBadge status={studentData.community_service_status} />
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