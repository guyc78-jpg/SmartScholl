import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { getStudentClassId } from '@/lib/studentProfile';
import { fetchMyStudent } from '@/lib/studentData';
import { isEventRelevantForStudent } from '@/components/exams/AudienceEditor';
import StudentExamCalendar from '@/components/student/StudentExamCalendar';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function StudentExams({ user }) {
  const classId = getStudentClassId(user, '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadRequestId = useRef(0);

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
      const [exs, student] = await Promise.all([
        base44.entities.Exam.list('date', 300),
        fetchMyStudent(user, classId),
      ]);
      const [gradeReports, completions] = student ? await Promise.all([
        base44.entities.ExamGradeReport.filter({ student_id: student.id }),
        base44.entities.ExamCompletion.filter({ student_id: student.id }),
      ]) : [[], []];

      const relevantExams = (exs || [])
        .filter(e => student ? isEventRelevantForStudent(e, student) : e.class_id === classId)
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      if (requestId !== loadRequestId.current) return;
      setData({
        student,
        exams: relevantExams,
        gradeReports: gradeReports || [],
        completions: completions || [],
      });
    } catch (loadError) {
      if (requestId !== loadRequestId.current) return;
      console.error('Student exams load failed:', loadError);
      setError('לא הצלחנו לטעון את לוח המבחנים. בדקו את החיבור ונסו שוב.');
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }

  async function toggleExamCompletion(exam) {
    if (!data?.student) return;
    const existing = data.completions.find(item => item.exam_id === exam.id);
    if (existing?.status === 'done') {
      const updated = await base44.entities.ExamCompletion.update(existing.id, {
        status: 'not_started',
        completed_at: '',
      });
      setData(prev => ({
        ...prev,
        completions: prev.completions.map(item => item.id === existing.id ? { ...item, ...updated } : item),
      }));
      toast.success('הסימון בוטל');
      return;
    }
    const completionPayload = {
      exam_id: exam.id,
      student_id: data.student.id,
      student_name: data.student.full_name,
      class_id: data.student.class_id,
      grade: data.student.grade,
      status: 'done',
      completed_at: new Date().toISOString(),
    };
    const completion = existing
      ? await base44.entities.ExamCompletion.update(existing.id, completionPayload)
      : await base44.entities.ExamCompletion.create(completionPayload);
    setData(prev => ({
      ...prev,
      completions: existing
        ? prev.completions.map(item => item.id === existing.id ? { ...item, ...completion } : item)
        : [...prev.completions, completion],
    }));
    toast.success('כל הכבוד! המבחן סומן כבוצע');
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16" role="status" aria-live="polite">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" aria-hidden="true" />
        <span className="sr-only">טוענים את לוח המבחנים</span>
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
        <h1 className="text-2xl font-bold text-foreground">לוח מבחנים ואירועים</h1>
        <p className="text-sm text-muted-foreground mt-0.5">כל המבחנים והאירועים הרלוונטיים אליי, כולל דיווח ציון אישי</p>
      </div>

      <StudentExamCalendar
        exams={data.exams}
        student={data.student}
        user={user}
        reports={data.gradeReports}
        completions={data.completions}
        onToggleCompletion={toggleExamCompletion}
        onChanged={loadData}
      />
    </div>
  );
}
