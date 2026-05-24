import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit2 } from 'lucide-react';
import { toast } from 'sonner';

const FAMILY_OPTIONS = ['הורים גרושים', 'הורה יחיד', 'קשר רק עם הורה אחד', 'אפוטרופוס אחר', 'אחר'];

export default function FamilySensitiveInfoCard({ student, canEdit }) {
  const [record, setRecord] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [note, setNote] = useState('');
  const [noSensitiveInfo, setNoSensitiveInfo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
    setNoSensitiveInfo(existing?.no_sensitive_info === true);
    setIsEditing(false);
    setLoading(false);
  };

  const toggleStatus = (status, checked) => {
    setNoSensitiveInfo(false);
    setStatuses(prev => checked ? [...prev, status] : prev.filter(item => item !== status));
  };

  const handleNoSensitiveChange = (checked) => {
    setNoSensitiveInfo(checked);
    if (checked) {
      setStatuses([]);
      setNote('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      student_id: student.id,
      student_name: student.full_name,
      no_sensitive_info: noSensitiveInfo,
      statuses: noSensitiveInfo ? [] : statuses,
      note: noSensitiveInfo ? '' : note.trim()
    };

    if (record?.id) {
      await base44.entities.FamilySensitiveInfo.update(record.id, payload);
      setRecord({ ...record, ...payload });
    } else {
      const created = await base44.entities.FamilySensitiveInfo.create(payload);
      setRecord(created);
    }

    setSaving(false);
    setIsEditing(false);
    toast.success('המידע המשפחתי הרגיש נשמר בפרטיות');
  };

  const hasSensitiveInfo = statuses.length > 0 || note.trim().length > 0;
  const displayValue = noSensitiveInfo 
    ? 'אין מידע רגיש מתועד' 
    : statuses.length > 0 
    ? statuses.join(', ')
    : 'לא צוין';

  if (loading) {
    return (
      <Card className="max-w-full overflow-hidden border-0 bg-transparent" dir="rtl">
        <CardContent className="px-0 py-2 text-xs text-muted-foreground/50">טוען...</CardContent>
      </Card>
    );
  }

  if (!isEditing) {
    return (
      <Card className="max-w-full overflow-hidden border-0 bg-transparent hover:bg-muted/20 transition-colors rounded-lg" dir="rtl">
        <CardContent className="px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="text-xs font-medium text-muted-foreground/70 flex-shrink-0">מידע משפחתי:</span>
                <span className="text-sm text-foreground/80 break-words">{displayValue}</span>
              </div>
              {note.trim() && (
                <p className="text-xs text-muted-foreground/60 mt-1.5 leading-4 break-words">הערה: {note}</p>
              )}
            </div>
            {canEdit && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-7 h-7 flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/40" 
                onClick={() => setIsEditing(true)}
                aria-label="עריכת מידע משפחתי"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-full overflow-hidden border border-border/30 bg-muted/10" dir="rtl">
      <CardContent className="px-4 py-3.5 space-y-3">
        <div className="space-y-2">
          <Label className="flex items-center gap-2.5 text-sm cursor-pointer py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors">
            <Checkbox
              checked={noSensitiveInfo}
              disabled={!canEdit || saving}
              onCheckedChange={(checked) => handleNoSensitiveChange(checked === true)}
            />
            <span className="text-foreground/90 text-sm">אין מידע רגיש</span>
          </Label>
        </div>

        {!noSensitiveInfo && (
          <>
            <div className="space-y-2 pt-1">
              <div className="text-xs font-medium text-muted-foreground/70">בחר מצבים משפחתיים</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {FAMILY_OPTIONS.map(option => (
                  <Label key={option} className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/15 px-3 py-2 text-sm cursor-pointer hover:bg-muted/30 hover:border-border/50 transition-colors">
                    <Checkbox
                      checked={statuses.includes(option)}
                      disabled={!canEdit || saving}
                      onCheckedChange={(checked) => toggleStatus(option, checked === true)}
                    />
                    <span className="text-foreground/85 text-sm">{option}</span>
                  </Label>
                ))}
              </div>
            </div>

            {statuses.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="sensitive-note" className="text-xs font-medium text-muted-foreground/70">הערה (אופציונלי)</Label>
                <Textarea
                  id="sensitive-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 150))}
                  disabled={!canEdit || saving}
                  rows={2}
                  placeholder="הערה קצרה לצוות המורשה"
                  className="text-xs border-border/40 resize-none"
                />
                <div className="text-[10px] text-muted-foreground/50 text-left">{note.length}/150</div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 pt-1">
          <Button onClick={handleSave} disabled={saving} size="sm" className="text-xs h-8 px-3">
            {saving ? 'שומר...' : 'שמור'}
          </Button>
          <Button variant="outline" onClick={() => loadSensitiveInfo()} disabled={saving} size="sm" className="text-xs h-8 px-3">
            ביטול
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}