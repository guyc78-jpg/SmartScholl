import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GRADES, formatGrade } from '@/lib/schoolStructure';

export default function ClassRoomForm({ classRoom, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState(classRoom || {
    grade: '', name: '', homeroom_teacher_name: '', homeroom_teacher_email: '',
    coordinator_name: '', coordinator_email: '', class_code: '', room_number: '', year: '', is_active: true,
  });
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-4" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>שכבה *</Label>
          <Select value={form.grade || ''} onValueChange={value => set('grade', value)}>
            <SelectTrigger><SelectValue placeholder="בחר/י שכבה" /></SelectTrigger>
            <SelectContent>{GRADES.map(grade => <SelectItem key={grade} value={grade}>{formatGrade(grade)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>כיתה *</Label><Input value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="לדוגמה: י׳1" /></div>
        <div className="space-y-2"><Label>מחנך/ת</Label><Input value={form.homeroom_teacher_name || ''} onChange={e => set('homeroom_teacher_name', e.target.value)} /></div>
        <div className="space-y-2"><Label>אימייל מחנך/ת</Label><Input type="email" value={form.homeroom_teacher_email || ''} onChange={e => set('homeroom_teacher_email', e.target.value)} /></div>
        <div className="space-y-2"><Label>רכז/ת שכבה</Label><Input value={form.coordinator_name || ''} onChange={e => set('coordinator_name', e.target.value)} /></div>
        <div className="space-y-2"><Label>אימייל רכז/ת</Label><Input type="email" value={form.coordinator_email || ''} onChange={e => set('coordinator_email', e.target.value)} /></div>
        <div className="space-y-2"><Label>קוד כיתה אופציונלי</Label><Input value={form.class_code || ''} onChange={e => set('class_code', e.target.value)} /></div>
        <div className="space-y-2"><Label>חדר</Label><Input value={form.room_number || ''} onChange={e => set('room_number', e.target.value)} /></div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" type="button" onClick={onCancel}>ביטול</Button>
        <Button type="button" disabled={saving || !form.grade || !form.name} onClick={() => onSubmit(form)}>{saving ? 'שומר...' : 'שמור כיתה'}</Button>
      </div>
    </div>
  );
}