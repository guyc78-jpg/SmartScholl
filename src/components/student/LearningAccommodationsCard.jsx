import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ACCOMMODATION_DETAIL_EXAMPLES, normalizeAccommodationList } from '@/lib/accommodations';
import { ChevronDown, Shield, History, Save } from 'lucide-react';
import { toast } from 'sonner';

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
}

export default function LearningAccommodationsCard({ studentId, studentName, readOnly = false }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [record, setRecord] = useState(null);
  const [draft, setDraft] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const [canViewHistory, setCanViewHistory] = useState(false);

  useEffect(() => {
    loadAccommodations();
  }, [studentId]);

  async function loadAccommodations() {
    if (!studentId) return;
    setLoading(true);
    setError('');
    try {
      const response = await base44.functions.invoke('learningAccommodations', {
        action: 'getForStudent',
        student_id: studentId,
      });
      const nextRecord = response.data.record;
      setRecord(nextRecord);
      setDraft(normalizeAccommodationList(nextRecord.accommodations));
      setCanEdit(!readOnly && !!response.data.can_edit);
      setCanViewHistory(!!response.data.can_view_history);
    } catch {
      setError('אין הרשאה לצפות בהתאמות של תלמיד/ה זה/זו');
      setCanEdit(false);
      setCanViewHistory(false);
    }
    setLoading(false);
  }

  function updateItem(key, updates) {
    setDraft(prev => prev.map(item => item.key === key ? { ...item, ...updates } : item));
  }

  async function save() {
    setSaving(true);
    try {
      const response = await base44.functions.invoke('learningAccommodations', {
        action: 'saveForStudent',
        student_id: studentId,
        accommodations: draft,
      });
      const nextRecord = response.data.record;
      setRecord(nextRecord);
      setDraft(normalizeAccommodationList(nextRecord.accommodations));
      toast.success('ההתאמות נשמרו');
    } catch {
      toast.error('אין הרשאה לשמור התאמות עבור תלמיד/ה זה/זו');
    }
    setSaving(false);
  }

  const active = normalizeAccommodationList(draft).filter(item => item.enabled);
  const history = record?.history || [];

  return (
    <Card className="border-amber-200/70 dark:border-amber-900/40 bg-amber-50/35 dark:bg-amber-950/10 text-right" dir="rtl">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between gap-3 p-4 text-right"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">התאמות לימודיות</h3>
            <p className="text-xs text-muted-foreground truncate">מידע רגיש · {active.length ? `${active.length} התאמות פעילות` : 'אין התאמות פעילות'}</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <CardContent className="pt-0 space-y-4">
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">טוען התאמות...</div>
          ) : error ? (
            <div className="py-4 text-sm text-muted-foreground text-right">{error}</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 justify-end">
                {active.length === 0 ? (
                  <span className="text-sm text-muted-foreground">לא הוגדרו התאמות עבור {studentName}</span>
                ) : active.map(item => (
                  <Badge key={item.key} variant="outline" className="bg-background/80 border-amber-200 dark:border-amber-900 text-right">
                    {item.label}{item.detail ? ` · ${item.detail}` : ''}
                  </Badge>
                ))}
              </div>

              {canEdit && (
                <div className="rounded-xl border bg-background/70 p-3 space-y-3">
                  <div className="text-xs text-muted-foreground">דוגמאות פירוט: {ACCOMMODATION_DETAIL_EXAMPLES.join(' · ')}</div>
                  {draft.map(item => (
                    <div key={item.key} className="grid grid-cols-1 sm:grid-cols-[1fr,220px,auto] gap-2 items-center border-b last:border-b-0 pb-2 last:pb-0" dir="rtl">
                      <div className="flex items-center gap-2 justify-end text-right">
                        <Switch checked={item.enabled} onCheckedChange={checked => updateItem(item.key, { enabled: checked })} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <Input
                        value={item.detail || ''}
                        onChange={event => updateItem(item.key, { detail: event.target.value })}
                        placeholder="פירוט קצר לפי מקצוע/צורך"
                        className="text-right"
                        disabled={!item.enabled}
                      />
                      <span className="text-xs text-muted-foreground text-right">{item.enabled ? 'פעיל' : 'כבוי'}</span>
                    </div>
                  ))}
                  <div className="flex justify-start">
                    <Button onClick={save} disabled={saving} className="gap-2">
                      <Save className="w-4 h-4" />
                      {saving ? 'שומר...' : 'שמור התאמות'}
                    </Button>
                  </div>
                </div>
              )}

              {record?.last_updated_at && (
                <p className="text-xs text-muted-foreground">
                  עודכן לאחרונה על ידי {record.last_updated_by_name || 'משתמש'} · {formatDateTime(record.last_updated_at)}
                </p>
              )}

              {canViewHistory && history.length > 0 && (
                <div className="rounded-xl border bg-background/70 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <History className="w-4 h-4 text-muted-foreground" />
                    היסטוריית שינויים
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pe-1">
                    {history.slice().reverse().slice(0, 12).map((item, index) => (
                      <div key={`${item.at}-${index}`} className="text-xs border-b last:border-b-0 pb-2 last:pb-0">
                        <div className="font-medium text-foreground">{item.by_name || 'משתמש'} · {formatDateTime(item.at)}</div>
                        <div className="text-muted-foreground">{item.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}