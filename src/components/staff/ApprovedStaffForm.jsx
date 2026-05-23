import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GradeClassSelect from '@/components/profile/GradeClassSelect';

const emptyForm = { email: '', full_name: '', role: 'homeroom_teacher', grade: '', class_id: '', class_name: '', subject: '', school_role: '' };

export default function ApprovedStaffForm({ onSubmit, saving }) {
  const [form, setForm] = useState(emptyForm);
  const isHomeroom = form.role === 'homeroom_teacher';

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(form);
    setForm(emptyForm);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border p-4 space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-2"><Label>שם מלא</Label><Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required /></div>
        <div className="space-y-2"><Label>אימייל Google</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required /></div>
        <div className="space-y-2">
          <Label>תפקיד</Label>
          <Select value={form.role} onValueChange={role => setForm(p => ({ ...p, role, class_id: '', class_name: '', grade: '' }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="homeroom_teacher">מחנך/ת</SelectItem>
              <SelectItem value="coordinator">רכז/ת שכבה</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>מקצוע / תפקיד</Label><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="למשל: מתמטיקה" /></div>
      </div>

      <GradeClassSelect
        grade={form.grade}
        classNameValue={form.class_name}
        classId={form.class_id}
        showClass={isHomeroom}
        onGradeChange={grade => setForm(p => ({ ...p, grade }))}
        onClassChange={class_name => setForm(p => ({ ...p, class_name }))}
        onClassIdChange={class_id => setForm(p => ({ ...p, class_id }))}
      />

      <Button type="submit" disabled={saving} className="w-full">{saving ? 'שומר...' : 'הוסף לרשימת צוות מאושרת'}</Button>
    </form>
  );
}