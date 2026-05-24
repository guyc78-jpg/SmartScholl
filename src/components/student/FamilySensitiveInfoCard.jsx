import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert } from 'lucide-react';
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

  if (loading) {
    return (
      <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10" dir="rtl">
        <CardContent className="py-6 text-sm text-muted-foreground">טוען מידע רגיש...</CardContent>
      </Card>
    );
  }

  const hasSensitiveInfo = statuses.length > 0 || note.trim().length > 0;
  const showNoInfoState = noSensitiveInfo || !hasSensitiveInfo;

  return (
    <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10" dir="rtl">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              מידע משפחתי רגיש
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">מוצג רק למחנך/ת, רכז/ת שכבה ומנהל מערכת. נשמר בנפרד ואינו נכלל בדוחות או בייצוא כללי.</p>
          </div>
          {canEdit && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              עריכה/פתיחה
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isEditing ? (
          <div className="rounded-xl border bg-card/70 p-3">
            {showNoInfoState ? (
              <p className="text-sm font-medium text-muted-foreground">אין מידע רגיש מתועד</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {statuses.map(status => (
                    <Badge key={status} variant="secondary" className="rounded-full">{status}</Badge>
                  ))}
                </div>
                {note.trim() && (
                  <p className="text-sm leading-6 text-foreground whitespace-pre-wrap">{note}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Label className="flex items-center gap-2 rounded-xl border bg-card/70 p-3 text-sm cursor-pointer">
              <Checkbox
                checked={noSensitiveInfo}
                disabled={!canEdit || saving}
                onCheckedChange={(checked) => handleNoSensitiveChange(checked === true)}
              />
              <span>אין מידע רגיש</span>
            </Label>

            {!noSensitiveInfo && (
              <>
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
              </>
            )}

            {canEdit && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleSave} disabled={saving} size="sm">
                  {saving ? 'שומר...' : 'שמור מידע רגיש'}
                </Button>
                <Button variant="outline" onClick={() => loadSensitiveInfo()} disabled={saving} size="sm">
                  ביטול
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}