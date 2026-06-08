import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatStudentName } from '@/lib/studentName';

const statuses = ['דיווח תלמיד', 'אושר', 'דורש תיקון', 'נדחה'];

export default function ExamGradeReportsPanel({ reports, user, onChanged, readOnly = false }) {
  const [drafts, setDrafts] = useState({});
  const setDraft = (id, patch) => setDrafts(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));

  async function save(report, patch = {}) {
    const draft = { ...(drafts[report.id] || {}), ...patch };
    const now = new Date().toISOString();
    await base44.entities.ExamGradeReport.update(report.id, {
      reported_grade: Number(draft.reported_grade ?? report.reported_grade),
      status: draft.status || report.status,
      staff_note: draft.staff_note ?? report.staff_note ?? '',
      reviewed_by_name: user?.full_name || '',
      reviewed_by_email: user?.email || '',
      reviewed_at: now,
      updated_by_name: user?.full_name || '',
      updated_by_email: user?.email || '',
      updated_action_at: now,
    });
    toast.success('דיווח הציון עודכן');
    setDrafts(prev => ({ ...prev, [report.id]: {} }));
    onChanged?.();
  }

  return (
    <Card className="p-4 text-right" dir="rtl">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs text-muted-foreground">{reports.length} דיווחים</span>
        <h2 className="font-bold">ציונים בדיווח תלמידים</h2>
      </div>
      {reports.length === 0 ? <p className="text-sm text-muted-foreground">אין דיווחי ציונים לאישור.</p> : <div className="space-y-2">
        {reports.map(report => {
          const draft = drafts[report.id] || {};
          return (
            <div key={report.id} className="rounded-xl border p-3 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {!readOnly && <div className="flex gap-2 flex-wrap"><Button size="sm" onClick={() => save(report, { status: 'אושר' })}>אשר</Button><Button size="sm" variant="outline" onClick={() => save(report, { status: 'דורש תיקון' })}>דורש תיקון</Button><Button size="sm" variant="destructive" onClick={() => save(report, { status: 'נדחה' })}>דחה</Button></div>}
                <div className="text-right"><p className="font-semibold text-sm">{formatStudentName(report.student_name)} · {report.exam_title}</p><p className="text-xs text-muted-foreground">{report.subject} · {report.exam_date} · סטטוס: {report.status}</p></div>
              </div>
              {!readOnly && (
                <div className="grid gap-2 sm:grid-cols-[120px_160px_1fr_auto] items-start">
                  <Input type="number" min="0" max="100" value={draft.reported_grade ?? report.reported_grade ?? ''} onChange={e => setDraft(report.id, { reported_grade: e.target.value })} />
                  <Select value={draft.status || report.status} onValueChange={status => setDraft(report.id, { status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                  <Textarea placeholder="הערת צוות" value={draft.staff_note ?? report.staff_note ?? ''} onChange={e => setDraft(report.id, { staff_note: e.target.value })} className="min-h-[38px]" />
                  <Button variant="outline" onClick={() => save(report)}>שמור</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>}
    </Card>
  );
}