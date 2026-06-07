import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import EventTypeBadge from '@/components/exams/EventTypeBadge';
import { BookOpen, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const today = () => new Date().toISOString().split('T')[0];
const fmt = d => d ? new Date(d).toLocaleDateString('he-IL') : '';

export default function StudentExamCalendar({ exams, student, user, reports, completions = [], onToggleCompletion, onChanged }) {
  const [drafts, setDrafts] = useState({});
  const reportByExam = Object.fromEntries((reports || []).map(r => [r.exam_id, r]));

  const setDraft = (examId, patch) => setDrafts(prev => ({ ...prev, [examId]: { ...(prev[examId] || {}), ...patch } }));

  async function saveGrade(exam) {
    if (!student) return;
    const draft = drafts[exam.id] || {};
    const grade = Number(draft.reported_grade ?? reportByExam[exam.id]?.reported_grade ?? '');
    if (!Number.isFinite(grade) || grade < 0 || grade > 100) { toast.error('יש להזין ציון בין 0 ל־100'); return; }
    const now = new Date().toISOString();
    const payload = {
      exam_id: exam.id,
      exam_title: exam.title,
      exam_type: exam.type,
      subject: exam.subject,
      exam_date: exam.date,
      student_id: student.id,
      student_name: student.full_name,
      class_id: student.class_id,
      reported_grade: grade,
      status: 'דיווח תלמיד',
      student_note: draft.student_note ?? reportByExam[exam.id]?.student_note ?? '',
      submitted_by_name: user?.full_name || student.full_name,
      submitted_by_email: user?.email || student.email || student.user_email,
      submitted_at: reportByExam[exam.id]?.submitted_at || now,
      updated_by_name: user?.full_name || student.full_name,
      updated_by_email: user?.email || student.email || student.user_email,
      updated_action_at: now,
    };
    if (reportByExam[exam.id]) await base44.entities.ExamGradeReport.update(reportByExam[exam.id].id, payload);
    else await base44.entities.ExamGradeReport.create(payload);
    toast.success('הציון נשמר כדיווח תלמיד');
    setDrafts(prev => ({ ...prev, [exam.id]: {} }));
    onChanged?.();
  }

  return (
    <Card dir="rtl" className="text-right">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-end gap-2"><span>לוח מבחנים ואירועים שלי</span><BookOpen className="w-4 h-4 text-purple-500" /></CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(exams || []).length === 0 ? <p className="text-sm text-muted-foreground">אין כרגע מבחנים או אירועים רלוונטיים.</p> : exams.map(exam => {
          const report = reportByExam[exam.id];
          const completed = completions.some(item => item.exam_id === exam.id);
          const canReport = exam.date <= today() && (!report || ['דיווח תלמיד', 'דורש תיקון'].includes(report.status));
          const draft = drafts[exam.id] || {};
          return (
            <div key={exam.id} className="rounded-2xl border bg-card p-3 space-y-3 text-right">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3 justify-end text-right">
                  <div className="min-w-0">
                    <div className="flex items-center justify-end gap-2 flex-wrap"><EventTypeBadge type={exam.type} /><h3 className="font-semibold text-sm">{exam.title}</h3></div>
                    <p className="text-xs text-muted-foreground mt-1">{fmt(exam.date)}{exam.time ? ` · ${exam.time}` : ''}{exam.subject ? ` · ${exam.subject}` : ''}</p>
                    {exam.material && <p className="text-xs text-muted-foreground mt-1">חומר: {exam.material}</p>}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 flex items-center justify-center text-xs font-bold shrink-0">{fmt(exam.date).slice(0,5)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report && <span className="self-start rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 px-2.5 py-1 text-xs font-medium">{report.status}: {report.reported_grade}</span>}
                  {onToggleCompletion && <Button size="sm" variant={completed ? 'outline' : 'default'} onClick={() => onToggleCompletion(exam)}>{completed ? <RotateCcw className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}{completed ? 'בטל סימון' : 'סיימתי את המבחן'}</Button>}
                </div>
              </div>
              {canReport && (
                <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] items-start">
                  <Input type="number" min="0" max="100" placeholder="ציון" value={draft.reported_grade ?? report?.reported_grade ?? ''} onChange={e => setDraft(exam.id, { reported_grade: e.target.value })} />
                  <Textarea placeholder="הערה אישית (אופציונלי)" value={draft.student_note ?? report?.student_note ?? ''} onChange={e => setDraft(exam.id, { student_note: e.target.value })} className="min-h-[38px]" />
                  <Button size="sm" onClick={() => saveGrade(exam)} className="w-full sm:w-auto"><CheckCircle2 className="w-4 h-4" />שמור דיווח</Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}