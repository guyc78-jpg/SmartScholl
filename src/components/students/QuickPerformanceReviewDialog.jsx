import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatStudentName } from '@/lib/studentName';
import { getLocalDateString } from '@/lib/dateUtils';

const METRICS = [
  ['learning_habits', 'הרגלי למידה'],
  ['participation', 'השתתפות'],
  ['responsibility', 'אחריות'],
  ['behavior', 'התנהגות'],
  ['social_functioning', 'תפקוד חברתי'],
  ['emotional_state', 'מצב רגשי'],
];

const createEmptyForm = () => ({
  period: currentPeriod(),
  learning_habits: 3,
  participation: 3,
  responsibility: 3,
  behavior: 3,
  social_functioning: 3,
  emotional_state: 3,
  notes: '',
});

const currentPeriod = () => {
  const month = new Date().getMonth() + 1;
  if (month <= 3) return 'רבעון ג׳';
  if (month <= 6) return 'רבעון ד׳';
  if (month <= 9) return 'רבעון א׳';
  return 'רבעון ב׳';
};

export default function QuickPerformanceReviewDialog({ student, open, onOpenChange }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(createEmptyForm);

  useEffect(() => {
    if (open) setForm(createEmptyForm());
  }, [open]);

  const setValue = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const saveReview = async () => {
    if (!student) return;
    setSaving(true);
    const today = getLocalDateString();
    await base44.entities.PerformanceReview.create({
      student_id: student.id,
      student_name: formatStudentName(student),
      class_id: student.class_id || '',
      period: form.period,
      date: today,
      learning_habits: Number(form.learning_habits || 3),
      participation: Number(form.participation || 3),
      responsibility: Number(form.responsibility || 3),
      behavior: Number(form.behavior || 3),
      social_functioning: Number(form.social_functioning || 3),
      emotional_state: Number(form.emotional_state || 3),
      notes: form.notes,
    });
    toast.success('הערכת התפקוד נשמרה');
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="text-right sm:max-w-lg">
        <DialogHeader className="text-right">
          <DialogTitle>הערכת תפקוד מהירה</DialogTitle>
          <p className="text-sm text-muted-foreground">{student ? formatStudentName(student) : ''}</p>
        </DialogHeader>

        <div className="space-y-4" dir="rtl">
          <label className="block space-y-1 text-right text-sm font-medium">
            <span>תקופה</span>
            <select
              value={form.period}
              onChange={event => setValue('period', event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-right"
              dir="rtl"
            >
              {['רבעון א׳', 'רבעון ב׳', 'רבעון ג׳', 'רבעון ד׳', 'מחצית א׳', 'מחצית ב׳'].map(period => (
                <option key={period} value={period}>{period}</option>
              ))}
            </select>
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            {METRICS.map(([key, label]) => (
              <label key={key} className="space-y-1 rounded-xl border border-border p-3 text-right text-sm">
                <span className="font-medium">{label}</span>
                <select
                  value={form[key] || 3}
                  onChange={event => setValue(key, event.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-right"
                  dir="rtl"
                >
                  {[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            ))}
          </div>

          <Textarea
            value={form.notes}
            onChange={event => setValue('notes', event.target.value)}
            placeholder="הערה קצרה לצוות..."
            className="min-h-24 resize-none text-right"
            dir="rtl"
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>ביטול</Button>
            <Button onClick={saveReview} disabled={saving}>{saving ? 'שומר...' : 'שמור הערכה'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
