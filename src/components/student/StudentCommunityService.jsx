import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Plus } from 'lucide-react';
import { toast } from 'sonner';

const initialForm = { activity_date: '', hours: '', place: '', contact_name: '', contact_phone: '', contact_email: '', note: '' };
const statusClasses = {
  'ממתין לאישור': 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  'אושר': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  'דורש תיקון': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  'נדחה': 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
};

export default function StudentCommunityService({ student, user, reports, onChanged }) {
  const [form, setForm] = useState(initialForm);
  const totalApproved = (reports || []).filter(r => r.status === 'אושר').reduce((sum, r) => sum + Number(r.hours || 0), 0);
  const goal = student?.community_service_goal || 60;
  const pct = Math.min(100, Math.round((totalApproved / goal) * 100));
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  async function submitReport() {
    if (!student) return;
    if (!form.activity_date || !form.place || !Number(form.hours)) { toast.error('יש למלא תאריך, מקום ומספר שעות'); return; }
    const now = new Date().toISOString();
    await base44.entities.CommunityServiceReport.create({
      student_id: student.id,
      student_name: student.full_name,
      class_id: student.class_id,
      activity_date: form.activity_date,
      hours: Number(form.hours),
      place: form.place,
      contact_name: form.contact_name,
      contact_phone: form.contact_phone,
      contact_email: form.contact_email,
      note: form.note,
      status: 'ממתין לאישור',
      submitted_by_name: user?.full_name || student.full_name,
      submitted_by_email: user?.email || student.email || student.user_email,
      submitted_at: now,
      updated_by_name: user?.full_name || student.full_name,
      updated_by_email: user?.email || student.email || student.user_email,
      updated_action_at: now,
    });
    toast.success('דיווח המעורבות נשלח לאישור');
    setForm(initialForm);
    onChanged?.();
  }

  return (
    <Card dir="rtl" className="text-right">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-end gap-2"><span>מעורבות חברתית שלי</span><Heart className="w-4 h-4 text-pink-500" /></CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl bg-pink-50 dark:bg-pink-900/20 p-3">
          <div className="flex justify-between text-sm mb-2"><span className="font-bold">{totalApproved} / {goal} שע׳ מאושרות</span><span className="text-muted-foreground">התקדמות</span></div>
          <div className="h-2.5 bg-white/80 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-pink-500 rounded-full" style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input type="date" value={form.activity_date} onChange={e => set('activity_date', e.target.value)} />
          <Input type="number" min="0" step="0.5" placeholder="מספר שעות" value={form.hours} onChange={e => set('hours', e.target.value)} />
          <Input placeholder="מקום התנדבות" value={form.place} onChange={e => set('place', e.target.value)} />
          <Input placeholder="איש קשר" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
          <Input type="tel" placeholder="טלפון איש קשר" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
          <Input type="email" placeholder="מייל איש קשר" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
          <Textarea className="sm:col-span-2" placeholder="הערה" value={form.note} onChange={e => set('note', e.target.value)} />
        </div>
        <Button onClick={submitReport} className="w-full sm:w-auto"><Plus className="w-4 h-4" />הוסף דיווח מעורבות</Button>

        <div className="space-y-2">
          {(reports || []).length === 0 ? <p className="text-sm text-muted-foreground">עדיין אין דיווחי מעורבות.</p> : reports.map(report => (
            <div key={report.id} className="rounded-xl border p-3 text-right">
              <div className="flex flex-wrap items-center justify-end gap-2 mb-1">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[report.status] || statusClasses['ממתין לאישור']}`}>{report.status}</span>
                <span className="font-semibold text-sm">{report.place}</span>
              </div>
              <p className="text-xs text-muted-foreground">{report.activity_date} · {report.hours} שעות{report.contact_name ? ` · ${report.contact_name}` : ''}</p>
              {report.note && <p className="text-xs mt-1">{report.note}</p>}
              {report.staff_note && <p className="text-xs mt-1 text-muted-foreground">הערת צוות: {report.staff_note}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}