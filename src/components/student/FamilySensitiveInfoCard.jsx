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
      <Card className="max-w-full overflow-hidden" dir="rtl">
        <CardContent className="py-4 text-sm text-muted-foreground/60">טוען...</CardContent>
      </Card>
    );
  }

  const hasSensitiveInfo = statuses.length > 0 || note.trim().length > 0;
  const showNoInfoState = noSensitiveInfo || !hasSensitiveInfo;
  const displaySummary = noSensitiveInfo 
    ? 'אין מידע רגיש מתועד' 
    : statuses.length > 0 
    ? statuses.join(', ') 
    : null;

  return (
    <Card className="max-w-full overflow-hidden border border-border/40 bg-background/40 backdrop-blur-sm hover:border-border/60 transition-colors" dir="rtl">
      <CardHeader className="pb-2.5 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldAlert className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
            <CardTitle className="text-sm font-medium text-foreground">מידע משפחתי רגיש</CardTitle>
          </div>
          {canEdit && !isEditing && (
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2.5 flex-shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setIsEditing(true)}>
              עריכה
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        {!isEditing ? (
          <div className="space-y-2">
            {displaySummary ? (
              <p className="text-sm text-foreground/75">{displaySummary}</p>
            ) : (
              <p className="text-sm text-muted-foreground/70">אין מידע רגיש מתועד</p>
            )}
            {note.trim() && !isEditing && (
              <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
                <p className="text-xs text-muted-foreground/60 font-medium">הערה:</p>
                <p className="text-xs text-foreground/70 leading-5 whitespace-pre-wrap break-words">{note}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="space-y-2">
              <Label className="flex items-center gap-2.5 text-sm cursor-pointer py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors">
                <Checkbox
                  checked={noSensitiveInfo}
                  disabled={!canEdit || saving}
                  onCheckedChange={(checked) => handleNoSensitiveChange(checked === true)}
                />
                <span className="text-foreground/90">אין מידע רגיש</span>
              </Label>
            </div>

            {!noSensitiveInfo && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground/70">בחר מצבים משפחתיים</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="sensitive-note" className="text-xs font-medium text-muted-foreground/70">הערה פנימית (אופציונלי)</Label>
                    <Textarea
                      id="sensitive-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, 180))}
                      disabled={!canEdit || saving}
                      rows={2}
                      placeholder="הערה קצרה לצוות המורשה בלבד"
                      className="text-sm border-border/40 resize-none"
                    />
                    <div className="text-[10px] text-muted-foreground/50 text-left">{note.length}/180</div>
                  </div>
                )}
              </>
            )}

            {canEdit && (
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSave} disabled={saving} size="sm" className="text-xs h-8 px-3">
                  {saving ? 'שומר...' : 'שמור'}
                </Button>
                <Button variant="outline" onClick={() => loadSensitiveInfo()} disabled={saving} size="sm" className="text-xs h-8 px-3">
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