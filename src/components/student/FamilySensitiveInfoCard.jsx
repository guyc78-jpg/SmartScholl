import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const FAMILY_OPTIONS = ['הורים גרושים', 'הורה יחיד', 'קשר רק עם הורה אחד', 'אפוטרופוס אחר', 'אחר'];

export default function FamilySensitiveInfoCard({ student, canEdit }) {
  const [record, setRecord] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSensitiveInfo();
  }, [student?.id]);

  const loadSensitiveInfo = async () => {
    setLoading(true);
    const records = await base44.entities.FamilySensitiveInfo.filter({ student_id: student.id });
    const existing = records[0] || null;
    setRecord(existing);
    setStatuses(existing?.statuses || []);
    setNote(existing?.note || '');
    setLoading(false);
  };

  const toggleStatus = (status, checked) => {
    setStatuses(prev => checked ? [...prev, status] : prev.filter(item => item !== status));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      student_id: student.id,
      student_name: student.full_name,
      statuses,
      note: note.trim()
    };

    if (record?.id) {
      await base44.entities.FamilySensitiveInfo.update(record.id, payload);
    } else {
      const created = await base44.entities.FamilySensitiveInfo.create(payload);
      setRecord(created);
    }

    setSaving(false);
    toast.success('המידע המשפחתי הרגיש נשמר בפרטיות');
  };

  if (loading) {
    return (
      <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10">
        <CardContent className="py-6 text-sm text-muted-foreground">טוען מידע רגיש...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          מידע משפחתי רגיש
        </CardTitle>
        <p className="text-xs text-muted-foreground">מוצג רק למחנך/ת, רכז/ת שכבה ומנהל מערכת. נשמר בנפרד ואינו נכלל בדוחות או בייצוא כללי.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FAMILY_OPTIONS.map(option => (
            <Label key={option} className="flex items-center gap-2 rounded-xl border bg-card/70 p-3 text-sm cursor-pointer">
              <Checkbox
                checked={statuses.includes(option)}
                disabled={!canEdit || saving}
                onCheckedChange={(checked) => toggleStatus(option, checked === true)}
              />
              <span>{option}</span>
            </Label>
          ))}
        </div>

        <div className="space-y-1">
          <Label>הערה קצרה</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 180))}
            disabled={!canEdit || saving}
            rows={3}
            placeholder="הערה פנימית קצרה לצוות המורשה בלבד"
          />
          <div className="text-[11px] text-muted-foreground text-left">{note.length}/180</div>
        </div>

        {canEdit && (
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'שומר...' : 'שמור מידע רגיש'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}