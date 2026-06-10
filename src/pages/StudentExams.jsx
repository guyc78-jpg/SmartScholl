import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { getStudentClassId } from '@/lib/studentProfile';
import { fetchMyStudent } from '@/lib/studentData';
import { isEventRelevantForStudent } from '@/components/exams/AudienceEditor';
import StudentExamCalendar from '@/components/student/StudentExamCalendar';
import { toast } from 'sonner';

export default function StudentExams({ user }) {
  const classId = getStudentClassId(user, CLASS_ID);
  const [data, setData] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
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

    setData({ student, exams: relevantExams, gradeReports, completions });
  }

  async function toggleExamCompletion(exam) {
    if (!data?.student) return;
    const existing = data.completions.find(item => item.exam_id === exam.id);
    if (existing) {
      await base44.entities.ExamCompletion.delete(existing.id);
      setData(prev => ({ ...prev, completions: prev.completions.filter(item => item.id !== existing.id) }));
      toast.success('הסימון בוטל');
      return;
    }
    const completion = await base44.entities.ExamCompletion.create({
      exam_id: exam.id,
      student_id: data.student.id,
      student_name: data.student.full_name,
      completed_at: new Date().toISOString(),
    });
    setData(prev => ({ ...prev, completions: [...prev.completions, completion] }));
    toast.success('כל הכבוד! המבחן סומן כבוצע');
  }

  if (!data) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-4 text-right max-w-3xl mx-auto" dir="rtl">
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