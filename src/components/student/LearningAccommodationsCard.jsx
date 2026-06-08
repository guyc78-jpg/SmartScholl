import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { normalizeAccommodationList } from '@/lib/accommodations';
import { Shield, Save, Pencil, Eye, History } from 'lucide-react';
import { toast } from 'sonner';

const GROUPS = [
  { title: 'זמן והיבחנות', keys: ['extra_time_25', 'adapted_exam'] },
  { title: 'הקראה/השמעה', keys: ['questionnaire_audio', 'digital_english'] },
  { title: 'כתיבה/הקלדה', keys: ['typing', 'computer_recording', 'ignore_errors'] },
  { title: 'התאמות תוכן', keys: ['extended_formula_sheet'] },
];

const chipClass = 'inline-flex h-7 items-center rounded-full border border-amber-200/80 bg-amber-50 px-3 text-xs font-medium leading-none text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100';

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
}

function groupItems(items, activeOnly = false) {
  const byKey = new Map(items.map(item => [item.key, item]));
  return GROUPS.map(group => ({
    ...group,
    items: group.keys.map(key => byKey.get(key)).filter(item => item && (!activeOnly || item.enabled)),
  })).filter(group => group.items.length > 0);
}

function MiniToggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${checked ? 'border-primary bg-primary' : 'border-border bg-muted'}`}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-all duration-200"
        style={{ insetInlineStart: checked ? '1.375rem' : '0.125rem' }}
      />
    </button>
  );
}

function AccommodationChip({ children }) {
  return <span className={chipClass}>{children}</span>;
}

export default function LearningAccommodationsCard({ studentId, studentName, readOnly = false }) {
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const normalized = useMemo(() => normalizeAccommodationList(draft), [draft]);
  const active = normalized.filter(item => item.enabled);
  const preview = active.slice(0, 3);
  const extraCount = Math.max(active.length - preview.length, 0);
  const history = record?.history || [];
  const editable = canEdit && !readOnly;
  const activeGroups = groupItems(normalized, true);
  const editGroups = groupItems(normalized, false);

  return (
    <>
      <Card className="border-amber-200/60 bg-amber-50/25 text-right transition-colors hover:bg-amber-50/45 dark:border-amber-900/40 dark:bg-amber-950/10 dark:hover:bg-amber-950/20" dir="rtl">
        <button type="button" onClick={() => setDialogOpen(true)} className="w-full p-4 text-right">
          <div className="flex items-start justify-between gap-4" dir="rtl">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-200">
                <Shield className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-2 text-right">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">התאמות לימודיות</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {loading ? 'טוען התאמות...' : error ? error : active.length ? `${active.length} התאמות פעילות` : 'אין התאמות פעילות'}
                  </p>
                </div>
                {!loading && !error && (
                  <div className="flex flex-wrap justify-start gap-2" dir="rtl">
                    {preview.length > 0 ? preview.map(item => (
                      <AccommodationChip key={item.key}>{item.label}</AccommodationChip>
                    )) : <span className="text-xs text-muted-foreground">לא הוגדרו התאמות עבור {studentName}</span>}
                    {extraCount > 0 && <AccommodationChip><span className="force-ltr">+{extraCount}</span></AccommodationChip>}
                  </div>
                )}
              </div>
            </div>
            <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground">
              {editable ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {editable ? 'ערוך התאמות' : 'הצג הכל'}
            </span>
          </div>
        </button>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center justify-start gap-2 text-right">
              <span>התאמות לימודיות</span>
              <Shield className="h-4 w-4 text-amber-600" />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 text-right" dir="rtl">
            {loading ? (
              <p className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">טוען התאמות...</p>
            ) : error ? (
              <p className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{error}</p>
            ) : editable ? (
              <>
                <div className="space-y-4">
                  {editGroups.map(group => (
                    <section key={group.title} className="space-y-2" dir="rtl">
                      <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
                      <div className="space-y-2 rounded-2xl bg-muted/25 p-2">
                        {group.items.map(item => (
                          <div key={item.key} className="rounded-xl bg-background px-3 py-3" dir="rtl">
                            <div className="flex items-center justify-between gap-3">
                              <span className="min-w-0 flex-1 text-right text-sm font-medium text-foreground">{item.label}</span>
                              <MiniToggle checked={item.enabled} onChange={checked => updateItem(item.key, { enabled: checked })} />
                            </div>
                            {item.enabled && (
                              <Input
                                value={item.detail || ''}
                                onChange={event => updateItem(item.key, { detail: event.target.value })}
                                placeholder="פירוט קצר לפי מקצוע/צורך"
                                className="mt-3 h-9 text-right"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>

                <div className="flex justify-start pt-1">
                  <Button onClick={save} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'שומר...' : 'שמור התאמות'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {activeGroups.length === 0 ? (
                  <p className="rounded-xl bg-muted/35 px-4 py-3 text-sm text-muted-foreground">אין התאמות מאושרות להצגה.</p>
                ) : activeGroups.map(group => (
                  <section key={group.title} className="space-y-2" dir="rtl">
                    <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
                    <div className="space-y-2 rounded-2xl bg-muted/25 p-2">
                      {group.items.map(item => (
                        <div key={item.key} className="rounded-xl bg-background px-3 py-2.5 text-right">
                          <div className="text-sm font-medium text-foreground">{item.label}</div>
                          {item.detail && <div className="mt-1 text-xs text-muted-foreground">{item.detail}</div>}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {record?.last_updated_at && !loading && !error && (
              <p className="text-xs text-muted-foreground">
                עודכן לאחרונה על ידי {record.last_updated_by_name || 'משתמש'} · {formatDateTime(record.last_updated_at)}
              </p>
            )}

            {canViewHistory && history.length > 0 && !loading && !error && (
              <details className="rounded-2xl bg-muted/25 p-3 text-right" dir="rtl">
                <summary className="flex cursor-pointer list-none items-center justify-start gap-2 text-sm font-semibold">
                  <History className="h-4 w-4 text-muted-foreground" />
                  היסטוריית שינויים
                </summary>
                <div className="mt-3 space-y-2">
                  {history.slice().reverse().slice(0, 6).map((item, index) => (
                    <div key={`${item.at}-${index}`} className="rounded-xl bg-background px-3 py-2 text-xs">
                      <div className="font-medium text-foreground">{item.by_name || 'משתמש'} · {formatDateTime(item.at)}</div>
                      <div className="mt-0.5 text-muted-foreground">{item.summary}</div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}