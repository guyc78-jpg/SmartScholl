import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { getLocalDateString } from '@/lib/attendanceScope';

const REINFORCEMENT_TYPES = [
  'עזרה לחבר',
  'שיפור בהתנהגות',
  'השקעה בלמידה',
  'אחריות',
  'תרומה לכיתה',
  'עמידה במשימה',
  'אחר'
];

export default function PositiveReinforcementDialog({
  student,
  classId,
  user,
  onClose,
  onSuccess
}) {
  const [reinforcementType, setReinforcementType] = useState('');
  const [note, setNote] = useState('');
  const [sendToParent, setSendToParent] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = getLocalDateString();
  const hasParentContact = student?.parent1_email || student?.parent1_phone;

  async function handleSave() {
    if (!reinforcementType || !note.trim()) {
      toast.error('יש למלא סוג חיזוק והערה');
      return;
    }

    setSaving(true);
    try {
      // Save as TeacherNote under "צמיחה"
      const noteData = {
        student_id: student.id,
        student_name: student.full_name || student.firstName + ' ' + student.lastName,
        class_id: classId,
        date: today,
        content: `[חיזוק חיובי - ${reinforcementType}] ${note}`,
        category: 'צמיחה',
        is_private: false
      };
      await base44.entities.TeacherNote.create(noteData);

      // If parent contact enabled and available, prepare WhatsApp message
      if (sendToParent && hasParentContact) {
        const parentPhone = student.parent1_phone?.replace(/\D/g, '') || '';
        const message = `שלום, רציתי לשתף אתכם חיזוק חיובי על ${student.full_name || student.firstName}: ${note}`;
        
        if (parentPhone) {
          // Open WhatsApp with prefilled message
          const whatsappUrl = `https://wa.me/${parentPhone}?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_blank');
        } else if (student.parent1_email) {
          toast.info('אין מספר טלפון זמין. ניתן לשלוח דוא"ל ישירות.');
        }
      }

      toast.success('חיזוק חיובי נשמר בהצלחה!');
      onSuccess();
      onClose();
    } catch (e) {
      toast.error('שגיאה בשמירה');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-1">
        <Label>סוג חיזוק</Label>
        <Select value={reinforcementType} onValueChange={setReinforcementType}>
          <SelectTrigger>
            <SelectValue placeholder="בחר סוג חיזוק" />
          </SelectTrigger>
          <SelectContent>
            {REINFORCEMENT_TYPES.map(type => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>הערה</Label>
        <Textarea
          placeholder="תאר את ההשגה או ההתנהגות החיובית..."
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>

      {hasParentContact && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
          <Checkbox
            id="send-to-parent"
            checked={sendToParent}
            onCheckedChange={setSendToParent}
          />
          <Label htmlFor="send-to-parent" className="cursor-pointer text-sm flex-1 text-right mb-0">
            שלח הודעה להורה בוואטסאפ
          </Label>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleSave}
          disabled={saving || !reinforcementType || !note.trim()}
          className="flex-1"
        >
          {saving ? 'שומר...' : 'שמור'}
        </Button>
        <Button variant="outline" onClick={onClose} className="flex-1">
          ביטול
        </Button>
      </div>
    </div>
  );
}