import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, MessageCircle, Users, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function ParentDetailsCard({ student, canEdit, onStudentUpdate }) {
  const [parentForm, setParentForm] = useState({
    parent1_name: '',
    parent1_phone: '',
    parent2_name: '',
    parent2_phone: ''
  });
  const [expanded, setExpanded] = useState([false, false]);

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
      parent2_name: parentForm.parent2_name.trim(),
      parent2_phone: normalizePhone(parentForm.parent2_phone)
    };

    await base44.entities.Student.update(student.id, updatedParents);
    onStudentUpdate(updatedParents);
    toast.success('פרטי ההורים נשמרו בהצלחה');
  }

  const toggleExpanded = (index) => {
    setExpanded(prev => prev.map((v, i) => i === index ? !v : v));
  };

  const parents = [
    { label: 'הורה 1', nameKey: 'parent1_name', phoneKey: 'parent1_phone', name: parentForm.parent1_name, phone: parentForm.parent1_phone },
    { label: 'הורה 2', nameKey: 'parent2_name', phoneKey: 'parent2_phone', name: parentForm.parent2_name, phone: parentForm.parent2_phone }
  ];

  return (
    <Card dir="rtl" className="max-w-full overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center justify-end gap-2">
          <Users className="w-4 h-4 text-primary" />
          פרטי הורים
        </CardTitle>
        <p className="text-xs text-muted-foreground text-right">פרטי קשר משפחתיים לשימוש צוות מורשה בלבד.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {parents.map((parent, index) => {
          const isOpen = expanded[index];
          const phone = parent.phone;
          const name = parent.name;

          return (
            <div key={parent.label} className="rounded-xl border bg-muted/20 overflow-hidden" dir="rtl">
              {/* Collapsible header */}
              <button
                type="button"
                onClick={() => toggleExpanded(index)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-right hover:bg-muted/30 transition-colors"
              >
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                />
                <div className="flex items-center gap-2 flex-1 justify-end">
                  {(name || phone) ? (
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">{phone || ''}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">לא הוזן</span>
                  )}
                  <span className="text-sm font-semibold text-foreground">{name || parent.label}</span>
                </div>
              </button>

              {/* Expandable content */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                      <div className="space-y-1">
                        <Label className="block text-right">שם</Label>
                        <Input
                          dir="rtl"
                          value={parentForm[parent.nameKey]}
                          onChange={e => setParentField(parent.nameKey, e.target.value)}
                          placeholder="שם מלא"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="block text-right">טלפון</Label>
                        <div className="flex flex-row-reverse items-center gap-2">
                          <Input
                            dir="ltr"
                            type="tel"
                            value={parentForm[parent.phoneKey]}
                            onChange={e => setParentField(parent.phoneKey, e.target.value)}
                            placeholder="0547683142"
                            className="flex-1"
                          />
                          {phone && (
                            <div className="flex gap-1 flex-row-reverse">
                              <a href={`tel:${normalizePhone(phone)}`} className="flex-shrink-0">
                                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10" title="שיחה">
                                  <Phone className="w-4 h-4 text-primary" />
                                </Button>
                              </a>
                              <a href={`https://wa.me/${whatsappPhone(phone)}`} target="_blank" rel="noreferrer" className="flex-shrink-0">
                                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10" title="וואטסאפ">
                                  <MessageCircle className="w-4 h-4 text-primary" />
                                </Button>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <Button onClick={handleSaveParents} className="w-full sm:w-auto mt-1">
          שמור פרטי הורים
        </Button>
      </CardContent>
    </Card>
  );
}