import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, FileUp, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AudienceEditor from './AudienceEditor';
import { EVENT_TYPES, normalizeEventType } from './eventConstants';

const emptyRow = { title: '', subject: '', type: 'אחר', date: '', time: '', end_time: '', class_or_grade: '', teacher: '', material: '', notes: '', audience_scope: 'grade', audience_grades: ['יב'], audience_classes: [], audience_subjects: [], audience_tracks: [], audience_group_label: '' };

export default function SmartCalendarImportDialog({ open, onOpenChange, classId, onImported }) {
  const fileInputRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateRow = (index, patch) => setRows(prev => prev.map((row, i) => i === index ? { ...row, ...patch } : row));
  const removeRow = index => setRows(prev => prev.filter((_, i) => i !== index));
  const valid = rows.length > 0 && rows.every(row => row.title && row.date);

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true); setError(''); setRows([]); setFileName(file.name);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.InvokeLLM({
      file_urls: [file_url],
      prompt: `חלץ מהקובץ את כל האירועים השכבתיים ללא יוצא מן הכלל: מבחנים, בגרויות, מתכונות, מועדי ב׳, חזרות, ריקודים, משחקים, טקסים, חגים, ועדות, צילומים וכל פעילות שכבתית. החזר לכל פריט: title, subject, type, date YYYY-MM-DD, time HH:MM אם קיים, end_time אם קיים, class_or_grade, teacher, material, notes. סווג type לאחד מהערכים: ${EVENT_TYPES.join(', ')}.`,
      response_json_schema: {
        type: 'object',
        properties: {
          events: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, subject: { type: 'string' }, type: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' }, end_time: { type: 'string' }, class_or_grade: { type: 'string' }, teacher: { type: 'string' }, material: { type: 'string' }, notes: { type: 'string' } } } }
        },
        required: ['events']
      }
    });
    const detected = (result?.events || []).map(row => ({ ...emptyRow, ...row, type: normalizeEventType(`${row.type || ''} ${row.title || ''}`) }));
    setRows(detected);
    if (!detected.length) setError('לא נמצאו אירועים בקובץ. נסו קובץ ברור יותר.');
    setLoading(false);
  };

  const save = async () => {
    if (!valid) { setError('יש להשלים כותרת ותאריך לכל אירוע לפני שמירה.'); return; }
    setSaving(true);
    await base44.entities.Exam.bulkCreate(rows.map(row => ({ ...row, class_id: classId })));
    toast.success(`${rows.length} אירועים נשמרו בלוח`);
    setSaving(false);
    onImported?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader><DialogTitle>ייבוא ללוח שנה שכבתי חכם</DialogTitle></DialogHeader>
        <div className="space-y-4 text-right">
          <div className="rounded-xl border border-dashed p-5 bg-muted/30 flex flex-col sm:flex-row justify-between gap-3">
            <div><p className="font-medium">בחרו קובץ לייבוא</p><p className="text-sm text-muted-foreground">לא נשמור כלום לפני אישור ידני בתצוגה המקדימה.</p>{fileName && <p className="text-xs mt-2 text-primary">קובץ: {fileName}</p>}</div>
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={e => handleFile(e.target.files?.[0])} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />} {loading ? 'מזהה אירועים...' : 'בחר קובץ'}</Button>
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

          {rows.length > 0 && <div className="space-y-3">
            <h3 className="font-semibold">תצוגה מקדימה ועריכה ({rows.length})</h3>
            <div className="space-y-3">{rows.map((row, index) => <PreviewRow key={index} row={row} index={index} updateRow={updateRow} removeRow={removeRow} />)}</div>
            <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button><Button onClick={save} disabled={!valid || saving}>{saving && <Loader2 className="w-4 h-4 animate-spin" />} אשר ושמור בלוח</Button></div>
          </div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewRow({ row, index, updateRow, removeRow }) {
  return (
    <div className="rounded-xl border bg-card p-3 space-y-3">
      <div className="grid md:grid-cols-6 gap-2">
        <Input value={row.title} onChange={e => updateRow(index, { title: e.target.value })} placeholder="כותרת *" className={!row.title ? 'border-red-300' : ''} />
        <Input type="date" value={row.date} onChange={e => updateRow(index, { date: e.target.value })} className={!row.date ? 'border-red-300' : ''} />
        <Input type="time" value={row.time} onChange={e => updateRow(index, { time: e.target.value })} />
        <Select value={row.type} onValueChange={type => updateRow(index, { type })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EVENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select>
        <Input value={row.subject} onChange={e => updateRow(index, { subject: e.target.value })} placeholder="מקצוע/תחום" />
        <Button variant="ghost" className="text-red-600" onClick={() => removeRow(index)}><Trash2 className="w-4 h-4" />הסר</Button>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <div className="space-y-1"><Label className="text-xs">קהל יעד</Label><AudienceEditor value={row} onChange={updated => updateRow(index, updated)} /></div>
        <Textarea value={row.material} onChange={e => updateRow(index, { material: e.target.value })} placeholder="חומר / הכנה" rows={4} />
        <Textarea value={row.notes} onChange={e => updateRow(index, { notes: e.target.value })} placeholder="הערות" rows={4} />
      </div>
    </div>
  );
}