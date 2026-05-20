import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, FileUp, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPTED_TYPES = '.xlsx,.xls,.doc,.docx,.pdf,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const emptyRow = {
  title: '',
  subject: '',
  type: 'מבחן',
  date: '',
  time: '',
  class_or_grade: '',
  notes: ''
};

export default function ImportExamsDialog({ open, onOpenChange, onImported, classId }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const hasMissingDates = rows.some(row => !row.date);
  const hasMissingRequired = rows.some(row => !row.title || !row.subject || !row.date);

  const updateRow = (index, field, value) => {
    setRows(prev => prev.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  };

  const removeRow = (index) => {
    setRows(prev => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setRows([]);
    setError('');
    setIsParsing(true);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.InvokeLLM({
      file_urls: [file_url],
      prompt: `חלץ מקובץ זה לוח מבחנים בעברית. החזר רק מבחנים/בחנים/עבודות/פרויקטים/הגשות שמופיעים בקובץ. חובה להמיר תאריכים לפורמט YYYY-MM-DD ושעות לפורמט HH:MM אם קיימות. אם לא ניתן לזהות תאריך, השאר date ריק. אם סוג לא ברור, השתמש ב"מבחן".`,
      response_json_schema: {
        type: 'object',
        properties: {
          exams: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                subject: { type: 'string' },
                type: { type: 'string' },
                date: { type: 'string' },
                time: { type: 'string' },
                class_or_grade: { type: 'string' },
                notes: { type: 'string' }
              }
            }
          }
        },
        required: ['exams']
      }
    });

    const detectedRows = (result?.exams || []).map(row => ({ ...emptyRow, ...row }));
    if (detectedRows.length === 0) {
      setError('לא הצלחנו לקרוא מהקובץ לוח מבחנים. נסו קובץ ברור יותר עם תאריכים ושמות מבחנים.');
    } else {
      setRows(detectedRows);
      if (detectedRows.some(row => !row.date)) {
        setError('חסרים תאריכים בחלק מהשורות. יש להשלים אותם לפני אישור הייבוא.');
      }
    }

    setIsParsing(false);
  };

  const handleConfirmImport = async () => {
    if (hasMissingRequired) {
      setError('יש להשלים שם מבחן, מקצוע ותאריך בכל השורות לפני אישור הייבוא.');
      return;
    }

    setIsImporting(true);
    await base44.entities.Exam.bulkCreate(rows.map(row => ({
      class_id: classId,
      title: row.title,
      subject: row.subject,
      type: row.type || 'מבחן',
      date: row.date,
      time: row.time,
      notes: [row.class_or_grade ? `שכבה/כיתה: ${row.class_or_grade}` : '', row.notes || ''].filter(Boolean).join('\n')
    })));

    toast.success('הייבוא הושלם בהצלחה');
    setIsImporting(false);
    onImported?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>ייבוא לוח מבחנים מקובץ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-right">
          <div className="rounded-xl border border-dashed border-border p-5 bg-muted/30">
            <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} onChange={handleFileChange} className="hidden" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium">העלאת קובץ Excel, Word או PDF</p>
                <p className="text-sm text-muted-foreground mt-1">לא יתבצע ייבוא עד ללחיצה על “אשר ייבוא”.</p>
                {fileName && <p className="text-xs text-muted-foreground mt-2">קובץ נבחר: {fileName}</p>}
              </div>
              <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={isParsing}>
                {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                {isParsing ? 'מזהה נתונים...' : 'בחר קובץ'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">תצוגה מקדימה ({rows.length} שורות)</h3>
                {!hasMissingDates && <span className="inline-flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="w-4 h-4" />כל התאריכים זוהו</span>}
              </div>

              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[950px] text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="p-2 text-right">שם מבחן *</th>
                      <th className="p-2 text-right">מקצוע/פרויקט *</th>
                      <th className="p-2 text-right">תאריך *</th>
                      <th className="p-2 text-right">שעה</th>
                      <th className="p-2 text-right">שכבה/כיתה</th>
                      <th className="p-2 text-right">הערות</th>
                      <th className="p-2 text-right">פעולה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index} className="border-t align-top">
                        <td className="p-2"><Input value={row.title} onChange={e => updateRow(index, 'title', e.target.value)} /></td>
                        <td className="p-2"><Input value={row.subject} onChange={e => updateRow(index, 'subject', e.target.value)} /></td>
                        <td className="p-2"><Input type="date" value={row.date} onChange={e => updateRow(index, 'date', e.target.value)} className={!row.date ? 'border-red-400' : ''} /></td>
                        <td className="p-2"><Input type="time" value={row.time} onChange={e => updateRow(index, 'time', e.target.value)} /></td>
                        <td className="p-2"><Input value={row.class_or_grade} onChange={e => updateRow(index, 'class_or_grade', e.target.value)} /></td>
                        <td className="p-2"><Textarea value={row.notes} onChange={e => updateRow(index, 'notes', e.target.value)} rows={1} /></td>
                        <td className="p-2"><Button variant="ghost" size="sm" className="text-red-600" onClick={() => removeRow(index)}>הסר</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <Button onClick={handleConfirmImport} disabled={isImporting || hasMissingRequired} className="gap-2">
                  {isImporting && <Loader2 className="w-4 h-4 animate-spin" />}
                  אשר ייבוא
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}