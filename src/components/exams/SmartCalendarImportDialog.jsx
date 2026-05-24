import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, FileUp, Loader2, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AudienceEditor from './AudienceEditor';
import { EVENT_TYPES, normalizeEventType } from './eventConstants';
import ImportStepIndicator from './import/ImportStepIndicator';
import ImportReviewSummary from './import/ImportReviewSummary';

const emptyRow = {
  title: '',
  subject: '',
  type: 'אחר',
  date: '',
  time: '',
  end_time: '',
  class_or_grade: '',
  teacher: '',
  material: '',
  notes: '',
  audience_scope: 'grade',
  audience_grades: ['יב'],
  audience_classes: [],
  audience_subjects: [],
  audience_tracks: [],
  audience_group_label: ''
};

const toList = (value) => String(value || '').split(/[,.،;|\n]/).map(v => v.trim()).filter(Boolean);

const inferAudience = (row) => {
  const text = `${row.class_or_grade || ''} ${row.title || ''} ${row.notes || ''}`;
  const classes = Array.from(new Set(text.match(/(?:י|יא|יב)[׳'״"]?\s?\d+/g) || []));
  const grades = Array.from(new Set(text.match(/\b(?:י|יא|יב)\b/g) || []));
  const tracks = toList(row.track || row.audience_tracks);

  if (classes.length) return { audience_scope: 'class', audience_classes: classes };
  if (tracks.length) return { audience_scope: 'track', audience_tracks: tracks };
  if (row.subject) return { audience_scope: 'subject', audience_subjects: [row.subject] };
  if (grades.length) return { audience_scope: 'grade', audience_grades: grades };
  return { audience_scope: 'grade', audience_grades: ['יב'] };
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
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const errorsCount = rows.reduce((sum, row) => sum + (getRowErrors(row).length ? 1 : 0), 0);
  const valid = rows.length > 0 && errorsCount === 0;
  const currentStep = !fileName ? 0 : loading ? 2 : rows.length === 0 ? 1 : errorsCount ? 3 : 4;

  const updateRow = (index, patch) => setRows(prev => prev.map((row, i) => i === index ? { ...row, ...patch } : row));
  const removeRow = index => setRows(prev => prev.filter((_, i) => i !== index));

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setError('');
    setRows([]);
    setFileName(file.name);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.InvokeLLM({
      file_urls: [file_url],
      prompt: `חלץ מהקובץ את כל האירועים ללוח שכבתי חכם: מבחנים, בגרויות, מתכונות, מועדי ב׳, חזרות, ריקודים, משחקים, טקסים, חגים, ועדות, צילומים וכל פעילות שכבתית. לכל אירוע החזר: title, subject, type, date בפורמט YYYY-MM-DD, time בפורמט HH:MM אם קיים, end_time אם קיים, class_or_grade, teacher, material, notes, audience_grades, audience_classes, audience_tracks, audience_subjects, audience_group_label. סווג type לאחד מהערכים: ${EVENT_TYPES.join(', ')}. אם יש ספק בתאריך או בכותרת השאר ריק כדי שהמשתמש יתקן לפני פרסום.`,
      response_json_schema: {
        type: 'object',
        properties: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                subject: { type: 'string' },
                type: { type: 'string' },
                date: { type: 'string' },
                time: { type: 'string' },
                end_time: { type: 'string' },
                class_or_grade: { type: 'string' },
                teacher: { type: 'string' },
                material: { type: 'string' },
                notes: { type: 'string' },
                audience_grades: { type: 'array', items: { type: 'string' } },
                audience_classes: { type: 'array', items: { type: 'string' } },
                audience_tracks: { type: 'array', items: { type: 'string' } },
                audience_subjects: { type: 'array', items: { type: 'string' } },
                audience_group_label: { type: 'string' }
              }
            }
          }
        },
        required: ['events']
      }
    });

    const detected = (result?.events || []).map(row => {
      const withBase = {
        ...emptyRow,
        ...row,
        audience_grades: row.audience_grades || [],
        audience_classes: row.audience_classes || [],
        audience_tracks: row.audience_tracks || [],
        audience_subjects: row.audience_subjects || [],
        type: normalizeEventType(`${row.type || ''} ${row.title || ''}`)
      };
      return { ...withBase, ...inferAudience(withBase) };
    });

    setRows(detected);
    if (!detected.length) setError('לא נמצאו אירועים בקובץ. נסו קובץ ברור יותר.');
    setLoading(false);
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
      time: row.time,
      end_time: row.end_time,
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
              <p className="text-sm text-muted-foreground">המערכת תזהה אירועים, תסווג אותם ותציג הכול לאישור לפני פרסום.</p>
              {fileName && <p className="text-xs mt-2 text-primary">קובץ: {fileName}</p>}
            </div>
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg" onChange={e => handleFile(e.target.files?.[0])} />
            <Button onClick={() => fileInputRef.current?.click()} disabled={loading} className="self-start sm:self-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
              {loading ? 'מזהה ומסווג...' : 'בחר קובץ'}
            </Button>
          </div>

          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

          {rows.length > 0 && (
            <div className="space-y-4">
              <ImportReviewSummary rows={rows} errorsCount={errorsCount} />

              <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold mb-1">2-5. תצוגה מקדימה, סיווג, תיקון ורלוונטיות</h3>
                <p className="text-sm text-muted-foreground">עברו על השורות, תקנו שגיאות וסמנו למי כל אירוע רלוונטי לפי כיתה, מגמה, מקצוע או קבוצה.</p>
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

  return (
    <div className={`rounded-xl border bg-card p-3 space-y-3 ${rowErrors.length ? 'border-destructive/40' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-muted-foreground">אירוע #{index + 1}</p>
          {rowErrors.length > 0 && <p className="text-xs text-destructive mt-1">{rowErrors.join(' · ')}</p>}
        </div>
        <Button variant="ghost" size="sm" className="text-destructive self-start sm:self-auto" onClick={() => removeRow(index)}><Trash2 className="w-4 h-4" />הסר</Button>
      </div>

      <div className="grid md:grid-cols-6 gap-2">
        <Input value={row.title} onChange={e => updateRow(index, { title: e.target.value })} placeholder="כותרת *" className={!row.title ? 'border-destructive' : ''} />
        <Input type="date" value={row.date} onChange={e => updateRow(index, { date: e.target.value })} className={!row.date ? 'border-destructive' : ''} />
        <Input type="time" value={row.time} onChange={e => updateRow(index, { time: e.target.value })} />
        <Select value={row.type} onValueChange={type => updateRow(index, { type })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{EVENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={row.subject} onChange={e => updateRow(index, { subject: e.target.value })} placeholder="מקצוע/תחום" />
        <Input value={row.class_or_grade} onChange={e => updateRow(index, { class_or_grade: e.target.value })} placeholder="כיתה/שכבה" />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">רלוונטיות לפי כיתה / מגמה / מקצוע / קבוצה</Label>
          <AudienceEditor value={row} onChange={updated => updateRow(index, updated)} />
        </div>
        <Textarea value={row.material} onChange={e => updateRow(index, { material: e.target.value })} placeholder="חומר / הכנה" rows={4} />
        <Textarea value={row.notes} onChange={e => updateRow(index, { notes: e.target.value })} placeholder="הערות" rows={4} />
      </div>
    </div>
  );
}