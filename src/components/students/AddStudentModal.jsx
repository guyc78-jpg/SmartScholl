import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { getLastName, getFirstNames } from '@/lib/studentName';

export default function AddStudentModal({ classId, editData, onClose, onSuccess }) {
  const [form, setForm] = useState(() => {
    const base = editData || {
      full_name: '', grade: 'י', gender: 'זכר', student_number: '',
      phone: '', email: '', parent1_name: '', parent1_phone: '', parent1_email: '',
      parent2_name: '', parent2_phone: '', parent2_email: '',
      community_service_goal: 60, community_service_done: 0,
      community_service_status: 'לא התחיל', status: 'פעיל'
    };
    // Smart split: prefer explicit fields if exist, otherwise derive from full_name
    return {
      ...base,
      last_name: base.last_name ?? getLastName(base.full_name || ''),
      first_name: base.first_name ?? getFirstNames(base.full_name || ''),
    };
  });
  const [saving, setSaving] = useState(false);
  const [classRoom, setClassRoom] = useState(null);

  useEffect(() => {
    if (!classId || !/^[a-f0-9]{24}$/i.test(classId)) {
      setClassRoom(null);
      return;
    }
    base44.entities.ClassRoom.filter({ id: classId }).then(data => setClassRoom(data[0] || null));
  }, [classId]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    const firstName = (form.first_name || '').trim();
    const lastName = (form.last_name || '').trim();
    if (!firstName || !lastName) {
      toast.error('שם פרטי ושם משפחה הם שדות חובה');
      return;
    }
    setSaving(true);
    try {
      const classData = {
        class_id: classId,
        class_name: classRoom?.name || form.class_name || '',
        grade: classRoom?.grade || form.grade || '',
      };
      // Canonical full_name keeps "first last" form so existing display utils render "last first"
      const payload = {
        ...form,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        ...classData,
      };
      if (editData?.id) {
        await base44.entities.Student.update(editData.id, payload);
      } else {
        await base44.entities.Student.create(payload);
      }
      toast.success(editData ? 'פרטי תלמיד עודכנו' : 'תלמיד נוסף בהצלחה!');
      onSuccess();
    } catch (e) {
      toast.error('שגיאה בשמירה');
    }
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{editData ? 'עריכת פרטי תלמיד' : 'הוספת תלמיד חדש'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">פרטים אישיים</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>שם משפחה *</Label>
                  <Input value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} placeholder="לדוגמה: כהן" />
                </div>
                <div className="space-y-1">
                  <Label>שם פרטי *</Label>
                  <Input value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} placeholder="לדוגמה: דניאל" />
                </div>
                <div className="space-y-1">
                  <Label>מין</Label>
                  <Select value={form.gender} onValueChange={v => set('gender', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="זכר">זכר</SelectItem>
                      <SelectItem value="נקבה">נקבה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>מספר תלמיד</Label>
                  <Input value={form.student_number} onChange={e => set('student_number', e.target.value)} placeholder="מספר ת.ז / מזהה" />
                </div>
                <div className="space-y-1">
                  <Label>טלפון</Label>
                  <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="050-0000000" />
                </div>
                <div className="space-y-1">
                  <Label>מייל</Label>
                  <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@school.il" />
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">הורה 1</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>שם</Label><Input value={form.parent1_name} onChange={e => set('parent1_name', e.target.value)} /></div>
              <div className="space-y-1"><Label>טלפון</Label><Input value={form.parent1_phone} onChange={e => set('parent1_phone', e.target.value)} /></div>
              <div className="space-y-1"><Label>מייל</Label><Input value={form.parent1_email} onChange={e => set('parent1_email', e.target.value)} /></div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">הורה 2</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>שם</Label><Input value={form.parent2_name} onChange={e => set('parent2_name', e.target.value)} /></div>
              <div className="space-y-1"><Label>טלפון</Label><Input value={form.parent2_phone} onChange={e => set('parent2_phone', e.target.value)} /></div>
              <div className="space-y-1"><Label>מייל</Label><Input value={form.parent2_email} onChange={e => set('parent2_email', e.target.value)} /></div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">סטטוס</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>סטטוס תלמיד</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['פעיל', 'דורש מעקב', 'מועבר', 'סיים'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>יעד מעורבות (שע׳)</Label>
                <Input type="number" value={form.community_service_goal} onChange={e => set('community_service_goal', Number(e.target.value))} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'שומר...' : 'שמור'}</Button>
            <Button variant="outline" onClick={onClose} className="flex-1">ביטול</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}