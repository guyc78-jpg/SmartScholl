import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { normalizeStudentNameFields } from '@/lib/studentName';
import { findClassRoomByName } from '@/lib/classAssignment';

export default function AddStudentModal({ classId, editData, onClose, onSuccess }) {
  const [form, setForm] = useState(() => {
    const base = editData || {
      full_name: '', grade: 'י', gender: 'זכר', student_number: '',
      phone: '', email: '', parent1_name: '', parent1_phone: '', parent1_email: '',
      parent2_name: '', parent2_phone: '', parent2_email: '',
      community_service_goal: 60, community_service_done: 0,
      community_service_status: 'לא התחיל', status: 'פעיל'
    };
    const nameFields = normalizeStudentNameFields(base);
    return {
      ...base,
      ...nameFields,
    };
  });
  const [saving, setSaving] = useState(false);
  const [classRoom, setClassRoom] = useState(null);
  const [classRooms, setClassRooms] = useState([]);

  useEffect(() => {
    if (!classId || !/^[a-f0-9]{24}$/i.test(classId)) {
      setClassRoom(null);
      base44.entities.ClassRoom.list('-updated_date', 200).then(data => setClassRooms(data || []));
      return;
    }
    Promise.all([
      base44.entities.ClassRoom.filter({ id: classId }),
      base44.entities.ClassRoom.list('-updated_date', 200),
    ]).then(([byId, allRooms]) => {
      setClassRoom(byId[0] || null);
      setClassRooms(allRooms || []);
    });
  }, [classId]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    const firstName = (form.firstName || form.first_name || '').trim();
    const lastName = (form.lastName || form.last_name || '').trim();
    if (!firstName || !lastName) {
      toast.error('שם פרטי ושם משפחה הם שדות חובה');
      return;
    }
    setSaving(true);
    try {
      const resolvedClassRoom = classRoom || findClassRoomByName(classRooms, form.class_name);
      const classData = {
        class_id: resolvedClassRoom?.id || classId,
        class_name: resolvedClassRoom?.name || form.class_name || '',
        grade: resolvedClassRoom?.grade || form.grade || '',
      };
      const payload = {
        ...form,
        firstName,
        lastName,
        first_name: firstName,
        last_name: lastName,
        fullName: `${firstName} ${lastName}`,
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
      <DialogContent
        className="sm:max-w-lg max-h-[92vh] p-0 gap-0 flex flex-col overflow-hidden"
        dir="rtl"
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-right">
            {editData ? 'עריכת פרטי תלמיד' : 'הוספת תלמיד חדש'}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable body only if accordions expand */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
          {/* Row 1: Last name + First name */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs font-medium">שם משפחה *</Label>
              <Input
                className="h-9"
                value={form.lastName || form.last_name || ''}
                onChange={e => setForm(p => ({ ...p, lastName: e.target.value, last_name: e.target.value }))}
                placeholder="כהן"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">שם פרטי *</Label>
              <Input
                className="h-9"
                value={form.firstName || form.first_name || ''}
                onChange={e => setForm(p => ({ ...p, firstName: e.target.value, first_name: e.target.value }))}
                placeholder="דניאל"
              />
            </div>
          </div>

          {/* Row 2: Gender + Student Number */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs font-medium">מין</Label>
              <Select value={form.gender} onValueChange={v => set('gender', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="זכר">זכר</SelectItem>
                  <SelectItem value="נקבה">נקבה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">תעודת זהות</Label>
              <Input
                className="h-9"
                value={form.student_number}
                onChange={e => set('student_number', e.target.value)}
                placeholder="ת.ז / מזהה"
              />
            </div>
          </div>

          {/* Row 3: Phone + Status */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs font-medium">טלפון</Label>
              <Input
                className="h-9"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="050-0000000"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">סטטוס</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['פעיל', 'דורש מעקב', 'מועבר', 'סיים'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Email (full width, LTR) */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-right block">מייל</Label>
            <Input
              className="h-9 ltr:text-left rtl:text-left force-ltr"
              dir="ltr"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="name@school.il"
            />
          </div>

          {/* Parents — collapsed by default */}
          <Accordion type="multiple" className="border border-border rounded-lg divide-y divide-border">
            <AccordionItem value="parent1" className="border-b-0 px-3">
              <AccordionTrigger className="py-2.5 text-sm font-medium text-right hover:no-underline">
                פרטי הורה 1
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">שם</Label>
                    <Input
                      className="h-9"
                      value={form.parent1_name}
                      onChange={e => set('parent1_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">טלפון</Label>
                    <Input
                      className="h-9"
                      value={form.parent1_phone}
                      onChange={e => set('parent1_phone', e.target.value)}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="parent2" className="border-b-0 px-3">
              <AccordionTrigger className="py-2.5 text-sm font-medium text-right hover:no-underline">
                פרטי הורה 2
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">שם</Label>
                    <Input
                      className="h-9"
                      value={form.parent2_name}
                      onChange={e => set('parent2_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">טלפון</Label>
                    <Input
                      className="h-9"
                      value={form.parent2_phone}
                      onChange={e => set('parent2_phone', e.target.value)}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Sticky footer */}
        <div className="border-t border-border bg-card px-5 py-3 flex gap-2 shrink-0">
          <Button onClick={handleSave} disabled={saving} className="flex-1 h-10">
            {saving ? 'שומר...' : 'שמור'}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1 h-10">
            ביטול
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}