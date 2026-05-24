import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, FileUp, Loader2, Send, Trash2, CalendarDays, Clock } from 'lucide-react';
import { toast } from 'sonner';
import AudienceEditor from './AudienceEditor';
import { EVENT_TYPES, normalizeEventType, TYPE_STYLES } from './eventConstants';
import ImportStepIndicator from './import/ImportStepIndicator';
import ImportReviewSummary from './import/ImportReviewSummary';
import NeedsReviewPanel from './import/NeedsReviewPanel';
import { parseWordCalendarFile, isWordFile } from '@/lib/wordCalendarParser';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const emptyRow = {
  title: '',
  subject: '',
  type: 'אחר',
  date: '',
  day_of_week: '',
  time: '',
  end_time: '',
  is_all_day: false,
  class_or_grade: '',
  teacher: '',
  material: '',
  notes: '',
  raw_text: '',
  audience_scope: 'grade',
  audience_grades: ['יב'],
  audience_classes: [],
  audience_subjects: [],
  audience_tracks: [],
  audience_group_label: ''
};

const HEB_DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const dayFromDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return HEB_DAY_NAMES[d.getDay()] || '';
  } catch { return ''; }
};

const formatDateLabel = (iso) => {
  if (!iso) return '';
  try { return format(new Date(iso), 'EEEE · d בMMMM', { locale: he }); } catch { return iso; }
};

const getRowErrors = (row) => {
  const errors = [];
  if (!row.title) errors.push('חסרה כותרת');
  if (!row.date) errors.push('חסר תאריך');
  if (!row.audience_scope) errors.push('חסר קהל יעד');
  return errors;
};

export default function SmartCalendarImportDialog({ open, onOpenChange, classId, onImported }) {
  const fileInputRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [reviewItems, setReviewItems] = useState([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const errorsCount = rows.reduce((sum, row) => sum + (getRowErrors(row).length ? 1 : 0), 0);
  const valid = rows.length > 0 && errorsCount === 0;
  const currentStep = !fileName ? 0 : loading ? 2 : rows.length === 0 && reviewItems.length === 0 ? 1 : errorsCount ? 3 : 4;

  const updateRow = (index, patch) => setRows(prev => prev.map((row, i) => i === index ? { ...row, ...patch } : row));
  const removeRow = (index) => setRows(prev => prev.filter((_, i) => i !== index));

  const promoteReviewItem = (index) => {
    setReviewItems(prev => {
      const item = prev[index];
      if (item) {
        setRows(rows => [...rows, {
          ...emptyRow,
          title: item.raw_text,
          raw_text: item.raw_text,
          type: normalizeEventType(item.raw_text)
        }]);
      }
      return prev.filter((_, i) => i !== index);
    });
  };
  const dismissReviewItem = (index) => setReviewItems(prev => prev.filter((_, i) => i !== index));

  const enrichRow = (row) => ({
    ...emptyRow,
    ...row,
    type: normalizeEventType(`${row.type || ''} ${row.title || ''}`),
    day_of_week: row.day_of_week || dayFromDate(row.date),
    is_all_day: row.is_all_day ?? !row.time,
    audience_grades: row.audience_grades || [],
    audience_classes: row.audience_classes || [],
    audience_tracks: row.audience_tracks || [],
    audience_subjects: row.audience_subjects || []
  });

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setError('');
    setRows([]);
    setReviewItems([]);
    setFileName(file.name);

    try {
      let detected = [];
      let review = [];

      // קבצי Word — פירסור מקומי של טבלת השבועות
      if (isWordFile(file)) {
        const parsed = await parseWordCalendarFile(file);
        detected = parsed.events.map(enrichRow);
        review = parsed.needsReview;
      }

      // אם הפירסור המקומי החזיר ריק (לא Word, או שאין טבלה) — חוזרים ל-LLM
      if (detected.length === 0 && review.length === 0) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const result = await base44.integrations.Core.InvokeLLM({
          file_urls: [file_url],
          prompt: `חלץ מהקובץ את כל האירועים ללוח שכבתי חכם: מבחנים, בגרויות, מתכונות, מועדי ב׳, חזרות, ריקודים, משחקים, טקסים, חגים, ועדות, צילומים וכל פעילות שכבתית. אל תתעלם מאף פריט, גם אם הוא לא מבחן. לכל אירוע החזר: title, subject, type, date (YYYY-MM-DD), time (HH:MM), end_time, class_or_grade, teacher, material, notes, audience_grades, audience_classes, audience_tracks, audience_subjects. סווג type לאחד מהערכים: ${EVENT_TYPES.join(', ')}.`,
          response_json_schema: {
            type: 'object',
            properties: {
              events: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' }, subject: { type: 'string' }, type: { type: 'string' },
                    date: { type: 'string' }, time: { type: 'string' }, end_time: { type: 'string' },
                    class_or_grade: { type: 'string' }, teacher: { type: 'string' },
                    material: { type: 'string' }, notes: { type: 'string' },
                    audience_grades: { type: 'array', items: { type: 'string' } },
                    audience_classes: { type: 'array', items: { type: 'string' } },
                    audience_tracks: { type: 'array', items: { type: 'string' } },
                    audience_subjects: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            },
            required: ['events']
          }
        });
        detected = (result?.events || []).map(enrichRow);
      }

      setRows(detected);
      setReviewItems(review);
      if (!detected.length && !review.length) setError('לא נמצאו אירועים בקובץ. נסו קובץ ברור יותר.');
    } catch (e) {
      setError(`שגיאה בקריאת הקובץ: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!valid) {
      setError('יש לתקן את השורות המסומנות לפני פרסום ללוח.');
      return;
    }
    setSaving(true);
    await base44.entities.Exam.bulkCreate(rows.map(row => ({
      class_id: classId,
      title: row.title,
      subject: row.subject,
      type: row.type,
      date: row.date,
      time: row.is_all_day ? '' : row.time,
      end_time: row.is_all_day ? '' : row.end_time,
      class_or_grade: row.class_or_grade,
      teacher: row.teacher,
      material: row.material,
      notes: row.notes,
      audience_scope: row.audience_scope,
      audience_grades: row.audience_grades,
      audience_classes: row.audience_classes,
      audience_tracks: row.audience_tracks,
      audience_subjects: row.audience_subjects,
      audience_group_label: row.audience_group_label
    })));
    toast.success(`${rows.length} אירועים פורסמו בלוח`);
    setSaving(false);
    onImported?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>ייבוא לוח מקובץ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-right">
          <ImportStepIndicator currentStep={saving ? 5 : currentStep} />

          <div className="rounded-xl border border-dashed p-5 bg-muted/30 flex flex-col sm:flex-row justify-between gap-3">
            <div>
              <p className="font-medium">1. העלאת קובץ</p>
              <p className="text-sm text-muted-foreground">תומך ב-Word (טבלת שבועות), Excel, PDF ועוד. כל תא בטבלה יפורק לאירועים נפרדים.</p>
              {fileName && <p className="text-xs mt-2 text-primary">קובץ: {fileName}</p>}
            </div>
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg" onChange={e => handleFile(e.target.files?.[0])} />
            <Button onClick={() => fileInputRef.current?.click()} disabled={loading} className="self-start sm:self-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
              {loading ? 'מזהה ומסווג...' : 'בחר קובץ'}
            </Button>
          </div>

          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

          <NeedsReviewPanel items={reviewItems} onPromote={promoteReviewItem} onDismiss={dismissReviewItem} />

          {rows.length > 0 && (
            <div className="space-y-4">
              <ImportReviewSummary rows={rows} errorsCount={errorsCount} />

              <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold mb-1">2-5. תצוגה מקדימה, סיווג, תיקון ורלוונטיות</h3>
                <p className="text-sm text-muted-foreground">עברו על השורות, תקנו שגיאות וסמנו למי כל אירוע רלוונטי. הפרסום ללוח יקרה רק לאחר אישור.</p>
              </div>

              <div className="space-y-3">
                {rows.map((row, index) => <PreviewRow key={index} row={row} index={index} updateRow={updateRow} removeRow={removeRow} />)}
              </div>

              <div className="sticky bottom-0 bg-background/95 backdrop-blur border rounded-xl p-3 flex flex-col sm:flex-row justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {valid ? 'כל האירועים מוכנים לפרסום ללוח.' : `${errorsCount} אירועים דורשים תיקון לפני פרסום.`}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
                  <Button onClick={save} disabled={!valid || saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    אשר פרסום ללוח
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewRow({ row, index, updateRow, removeRow }) {
  const rowErrors = getRowErrors(row);
  const typeClass = TYPE_STYLES[row.type] || TYPE_STYLES['אחר'];

  return (
    <div className={`rounded-xl border bg-card p-3 space-y-3 ${rowErrors.length ? 'border-destructive/40' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
          <span className={`text-xs px-2 py-0.5 rounded-md border ${typeClass}`}>{row.type}</span>
          {row.date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />{formatDateLabel(row.date)}
            </span>
          )}
          {row.is_all_day ? (
            <span className="text-xs text-muted-foreground">יום מלא</span>
          ) : row.time ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />{row.time}{row.end_time && `-${row.end_time}`}
            </span>
          ) : null}
          {rowErrors.length > 0 && <span className="text-xs text-destructive">· {rowErrors.join(' · ')}</span>}
        </div>
        <Button variant="ghost" size="sm" className="text-destructive self-start sm:self-auto" onClick={() => removeRow(index)}><Trash2 className="w-4 h-4" />הסר</Button>
      </div>

      <div className="grid md:grid-cols-6 gap-2">
        <Input value={row.title} onChange={e => updateRow(index, { title: e.target.value })} placeholder="כותרת *" className={!row.title ? 'border-destructive' : ''} />
        <Input type="date" value={row.date} onChange={e => updateRow(index, { date: e.target.value, day_of_week: dayFromDate(e.target.value) })} className={!row.date ? 'border-destructive' : ''} />
        <Input type="time" value={row.time} onChange={e => updateRow(index, { time: e.target.value, is_all_day: !e.target.value })} placeholder="התחלה" />
        <Input type="time" value={row.end_time} onChange={e => updateRow(index, { end_time: e.target.value })} placeholder="סיום" />
        <Select value={row.type} onValueChange={type => updateRow(index, { type })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{EVENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={row.subject} onChange={e => updateRow(index, { subject: e.target.value })} placeholder="מקצוע/תחום" />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">רלוונטיות לפי כיתה / מגמה / מקצוע / קבוצה</Label>
          <AudienceEditor value={row} onChange={updated => updateRow(index, updated)} />
        </div>
        <Textarea value={row.material} onChange={e => updateRow(index, { material: e.target.value })} placeholder="חומר / הכנה" rows={3} />
        <Textarea value={row.notes} onChange={e => updateRow(index, { notes: e.target.value })} placeholder={row.raw_text ? `מקור: ${row.raw_text}` : 'הערות'} rows={3} />
      </div>
    </div>
  );
}