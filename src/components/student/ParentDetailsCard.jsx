import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function ParentDetailsCard({ student, canEdit, onStudentUpdate }) {
  const [parentForm, setParentForm] = useState({
    parent1_name: '',
    parent1_phone: '',
    parent2_name: '',
    parent2_phone: ''
  });

  useEffect(() => {
    if (!student) return;
    setParentForm({
      parent1_name: student.parent1_name || '',
      parent1_phone: student.parent1_phone || '',
      parent2_name: student.parent2_name || '',
      parent2_phone: student.parent2_phone || ''
    });
  }, [student]);

  if (!canEdit) return null;

  const normalizePhone = (value) => value.trim().replace(/[\s-]/g, '');
  const isValidPhone = (value) => !value || /^(?:0\d{8,9}|\+972\d{8,9})$/.test(normalizePhone(value));

  const setParentField = (field, value) => {
    setParentForm(prev => ({ ...prev, [field]: value }));
  };

  async function handleSaveParents() {
    if (!isValidPhone(parentForm.parent1_phone) || !isValidPhone(parentForm.parent2_phone)) {
      toast.error('יש להזין מספרי טלפון תקינים');
      return;
    }

    const updatedParents = {
      parent1_name: parentForm.parent1_name.trim(),
      parent1_phone: normalizePhone(parentForm.parent1_phone),
      parent2_name: parentForm.parent2_name.trim(),
      parent2_phone: normalizePhone(parentForm.parent2_phone)
    };

    await base44.entities.Student.update(student.id, updatedParents);
    onStudentUpdate(updatedParents);
    toast.success('פרטי ההורים נשמרו בהצלחה');
  }

  const hasParentDetails = parentForm.parent1_name || parentForm.parent1_phone || parentForm.parent2_name || parentForm.parent2_phone;

  return (
    <Card dir="rtl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">פרטי הורים</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>שם הורה 1</Label>
            <Input value={parentForm.parent1_name} onChange={e => setParentField('parent1_name', e.target.value)} placeholder="שם מלא" />
          </div>
          <div className="space-y-1">
            <Label>טלפון הורה 1</Label>
            <Input type="tel" value={parentForm.parent1_phone} onChange={e => setParentField('parent1_phone', e.target.value)} placeholder="לדוגמה: 0547683142" />
          </div>
          <div className="space-y-1">
            <Label>שם הורה 2 <span className="text-muted-foreground">(אופציונלי)</span></Label>
            <Input value={parentForm.parent2_name} onChange={e => setParentField('parent2_name', e.target.value)} placeholder="שם מלא" />
          </div>
          <div className="space-y-1">
            <Label>טלפון הורה 2 <span className="text-muted-foreground">(אופציונלי)</span></Label>
            <Input type="tel" value={parentForm.parent2_phone} onChange={e => setParentField('parent2_phone', e.target.value)} placeholder="לדוגמה: 0521234567" />
          </div>
        </div>

        <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">תצוגה בפרופיל</p>
          {parentForm.parent1_name || parentForm.parent1_phone ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                {parentForm.parent1_name && <p className="text-sm font-medium">{parentForm.parent1_name}</p>}
                {parentForm.parent1_phone && <p className="text-xs text-muted-foreground">{parentForm.parent1_phone}</p>}
              </div>
              {parentForm.parent1_phone && <a href={`tel:${normalizePhone(parentForm.parent1_phone)}`}><Button variant="ghost" size="icon" className="w-8 h-8"><Phone className="w-4 h-4" /></Button></a>}
            </div>
          ) : null}
          {parentForm.parent2_name || parentForm.parent2_phone ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                {parentForm.parent2_name && <p className="text-sm font-medium">{parentForm.parent2_name}</p>}
                {parentForm.parent2_phone && <p className="text-xs text-muted-foreground">{parentForm.parent2_phone}</p>}
              </div>
              {parentForm.parent2_phone && <a href={`tel:${normalizePhone(parentForm.parent2_phone)}`}><Button variant="ghost" size="icon" className="w-8 h-8"><Phone className="w-4 h-4" /></Button></a>}
            </div>
          ) : null}
          {!hasParentDetails && <p className="text-sm text-muted-foreground">לא הוזנו פרטי הורים</p>}
        </div>

        <Button onClick={handleSaveParents} className="w-full sm:w-auto">
          שמור פרטי הורים
        </Button>
      </CardContent>
    </Card>
  );
}