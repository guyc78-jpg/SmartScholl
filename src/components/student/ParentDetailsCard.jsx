import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, MessageCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function ParentDetailsCard({ student, canEdit, onStudentUpdate }) {
  const [parentForm, setParentForm] = useState({
    parent1_name: '',
    parent1_phone: '',
    parent1_email: '',
    parent2_name: '',
    parent2_phone: '',
    parent2_email: ''
  });

  useEffect(() => {
    if (!student) return;
    setParentForm({
      parent1_name: student.parent1_name || '',
      parent1_phone: student.parent1_phone || '',
      parent1_email: student.parent1_email || '',
      parent2_name: student.parent2_name || '',
      parent2_phone: student.parent2_phone || '',
      parent2_email: student.parent2_email || ''
    });
  }, [student]);

  if (!canEdit) return null;

  const normalizePhone = (value) => value.trim().replace(/[\s-]/g, '');
  const isValidPhone = (value) => !value || /^(?:0\d{8,9}|\+972\d{8,9})$/.test(normalizePhone(value));
  const whatsappPhone = (value) => normalizePhone(value).replace(/^0/, '972').replace(/^\+/, '');

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
      parent1_email: parentForm.parent1_email.trim(),
      parent2_name: parentForm.parent2_name.trim(),
      parent2_phone: normalizePhone(parentForm.parent2_phone),
      parent2_email: parentForm.parent2_email.trim()
    };

    await base44.entities.Student.update(student.id, updatedParents);
    onStudentUpdate(updatedParents);
    toast.success('פרטי ההורים נשמרו בהצלחה');
  }

  const parents = [
    { label: 'הורה 1', name: parentForm.parent1_name, phone: parentForm.parent1_phone, email: parentForm.parent1_email },
    { label: 'הורה 2', name: parentForm.parent2_name, phone: parentForm.parent2_phone, email: parentForm.parent2_email }
  ];
  const hasParentDetails = parents.some(parent => parent.name || parent.phone);

  return (
    <Card dir="rtl" className="max-w-full overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          פרטי הורים
        </CardTitle>
        <p className="text-xs text-muted-foreground">פרטי קשר משפחתיים לשימוש צוות מורשה בלבד.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-full">
          {parents.map((parent, index) => (
            <div key={parent.label} className="min-w-0 rounded-2xl border bg-muted/20 p-3 space-y-3">
              <p className="text-sm font-semibold text-foreground">{parent.label}</p>

              <div className="space-y-3 w-full">
                <div className="space-y-1">
                  <Label className="block">שם</Label>
                  <Input
                    value={index === 0 ? parentForm.parent1_name : parentForm.parent2_name}
                    onChange={e => setParentField(index === 0 ? 'parent1_name' : 'parent2_name', e.target.value)}
                    placeholder="שם מלא"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="block">טלפון</Label>
                  <Input
                    type="tel"
                    value={index === 0 ? parentForm.parent1_phone : parentForm.parent2_phone}
                    onChange={e => setParentField(index === 0 ? 'parent1_phone' : 'parent2_phone', e.target.value)}
                    placeholder="0547683142"
                  />
                  {(index === 0 ? parentForm.parent1_phone : parentForm.parent2_phone) && (
                    <div className="flex flex-col gap-2 mt-2">
                      <a href={`tel:${normalizePhone(index === 0 ? parentForm.parent1_phone : parentForm.parent2_phone)}`} className="w-full">
                        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs w-full">
                          <Phone className="w-3.5 h-3.5" />שיחה
                        </Button>
                      </a>
                      <a href={`https://wa.me/${whatsappPhone(index === 0 ? parentForm.parent1_phone : parentForm.parent2_phone)}`} target="_blank" rel="noreferrer" className="w-full">
                        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs w-full">
                          <MessageCircle className="w-3.5 h-3.5" />וואטסאפ
                        </Button>
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="block">מייל</Label>
                  <Input
                    type="email"
                    value={index === 0 ? parentForm.parent1_email : parentForm.parent2_email}
                    onChange={e => setParentField(index === 0 ? 'parent1_email' : 'parent2_email', e.target.value)}
                    placeholder="example@mail.com"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {!hasParentDetails && (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground text-center">
            לא הוזנו פרטי הורים עדיין
          </div>
        )}

        <Button onClick={handleSaveParents} className="w-full sm:w-auto">
          שמור פרטי הורים
        </Button>
      </CardContent>
    </Card>
  );
}