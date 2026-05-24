import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { AlertTriangle, FileUp, Loader2 } from 'lucide-react';
import SelectedFileNotice from '@/components/import/SelectedFileNotice';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

const normalizeDay = (value = '') => {
  const text = String(value).replace('יום', '').trim();
  return DAYS.find(day => text.includes(day)) || 'ראשון';
};

// Normalize class names like י"ב 8, י''ב 8, יב' 8, י"ב8 → a comparable form
const normalizeClassName = (value = '') => {
  return String(value)
    .replace(/["'`׳״]/g, '')
    .replace(/\s+/g, '')
    .trim();
};

// Does a lesson belong to the target class? matches against the comma-separated class list in the lesson text.
const lessonBelongsToClass = (lessonClasses = '', targetClassName = '') => {
  if (!targetClassName) return true;
  const target = normalizeClassName(targetClassName);
  if (!target) return true;
  const haystack = normalizeClassName(lessonClasses);
  return haystack.includes(target);
};

const emptyRow = {
  day: 'ראשון',
  period: 1,
  start_time: '',
  end_time: '',
  subject: '',
  teacher: '',
  room: '',
  notes: ''
};

export default function ImportScheduleDialog({ open, onOpenChange, onImported, classId, className = '' }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const hasMissingRequired = rows.some(row => !row.subject || !row.day || !row.period);

  const updateRow = (index, field, value) => {
    setRows(prev => prev.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  };

  const removeRow = (index) => {
    setRows(prev => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const clearSelectedFile = () => {
    if (!window.confirm('להסיר את הקובץ שנבחר?')) return;
    setFileName('');
    setRows([]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parsePdfFile = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const schema = {
      type: 'object',
      properties: {
        class_name: { type: 'string', description: 'שם הכיתה שעבורה הופקה המערכת, מתוך כותרת הדוח (למשל "י\"ב 8")' },
        lessons: {
          type: 'array',
          description: 'כל השיעורים בכל התאים של הטבלה. בכל תא יכולים להופיע מספר שיעורים מקבילים מופרדים בקו "----------". כל שיעור הוא רשומה נפרדת.',
          items: {
            type: 'object',
            properties: {
              day: { type: 'string', description: 'יום בשבוע: ראשון/שני/שלישי/רביעי/חמישי/שישי - לפי העמודה בטבלה' },
              period: { type: 'number', description: 'מספר השיעור 1-12 - לפי השורה בטבלה (העמודה הימנית ביותר עם המספר)' },
              subject: { type: 'string', description: 'שם המקצוע בלבד (למשל "מתמטיקה", "אנגלית", "תנך-מורחב")' },
              teacher: { type: 'string', description: 'שם המורה המלא (שם משפחה ושם פרטי, למשל "חגאי מיכל")' },
              classes: { type: 'string', description: 'רשימת הכיתות שאליהן השיעור משויך, מופיעה אחרי שם המקצוע (למשל "י\"ב 1 י\"ב 2 י\"ב 7 י\"ב 8")' },
              level: { type: 'string', description: 'רמת לימוד אם קיימת בסוגריים (למשל "3 יח\"ל", "5 יח\"ל", "תגבור לבגרות")' },
              room: { type: 'string', description: 'חדר - הטקסט שאחרי "חדר:" (למשל "יב\' 1", "מקלט תקשורת", "חדר תקשורת")' }
            },
            required: ['day', 'period', 'subject']
          }
        }
      }
    };
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema: schema });
    if (result.status !== 'success') throw new Error(result.details || 'נכשל חילוץ הנתונים מה-PDF');

    const allLessons = result.output?.lessons || [];
    const targetClass = className || result.output?.class_name || '';

    return allLessons
      .filter(row => row.subject && lessonBelongsToClass(row.classes, targetClass))
      .map(row => ({
        ...emptyRow,
        day: normalizeDay(row.day),
        period: Number(row.period || 1),
        start_time: '',
        end_time: '',
        subject: String(row.subject || '').trim(),
        teacher: String(row.teacher || '').trim(),
        room: String(row.room || '').trim(),
        notes: String(row.level || '').trim()
      }));
  };

  // Parse a single lesson text block, e.g.:
  //   "חגאי מיכל, מתמטיקה,  י\"ב 1 י\"ב 2 י\"ב 8 (רמה: 3 יח``ל)\nחדר: יב' 1"
  // Returns { teacher, subject, classes, level, room } or null.
  const parseLessonBlock = (block) => {
    const text = String(block || '').trim();
    if (!text) return null;

    // Extract room (line starting with "חדר:")
    let room = '';
    const roomMatch = text.match(/חדר:\s*(.+?)(?:\n|$)/);
    if (roomMatch) room = roomMatch[1].trim();

    // Remove the room line for the rest of the parsing
    const withoutRoom = text.replace(/חדר:\s*.+?(?:\n|$)/g, '').trim();

    // Extract level "(רמה: X)"
    let level = '';
    const levelMatch = withoutRoom.match(/\(רמה:\s*([^)]+)\)/);
    if (levelMatch) level = levelMatch[1].replace(/`/g, '').trim();
    const withoutLevel = withoutRoom.replace(/\(רמה:[^)]+\)/, '').trim();

    // The remaining structure is: "teacher, subject, classes"
    const parts = withoutLevel.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) return null;

    const teacher = parts[0];
    const subject = parts[1];
    const classes = parts.slice(2).join(' ').trim();

    return { teacher, subject, classes, level, room };
  };

  // Split a cell into parallel lesson blocks (separated by lines of dashes)
  const splitLessonBlocks = (cellValue) => {
    return String(cellValue || '')
      .split(/\n?-{5,}\n?/)
      .map(s => s.trim())
      .filter(Boolean);
  };

  const parseSpreadsheetFile = async (file) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!grid || grid.length === 0) return [];

    // 1) Locate the header row containing day names; map column index → day name
    let headerRowIdx = -1;
    let dayCols = {}; // colIndex -> day name
    let periodCol = -1;
    for (let r = 0; r < Math.min(grid.length, 10); r++) {
      const row = grid[r] || [];
      const foundDays = {};
      row.forEach((cell, c) => {
        const day = DAYS.find(d => String(cell).trim() === d);
        if (day) foundDays[c] = day;
      });
      if (Object.keys(foundDays).length >= 3) {
        headerRowIdx = r;
        dayCols = foundDays;
        // Period column: the one that is NOT a day column and has numeric values in following rows
        const allCols = row.length;
        for (let c = 0; c < allCols; c++) {
          if (dayCols[c]) continue;
          // Check if the column contains numbers in subsequent rows
          let numericCount = 0;
          for (let rr = r + 1; rr < grid.length; rr++) {
            const v = (grid[rr] || [])[c];
            if (v !== '' && v != null && !isNaN(Number(v))) numericCount++;
          }
          if (numericCount >= 3) { periodCol = c; break; }
        }
        break;
      }
    }

    // Fallback to legacy column-name based parsing
    if (headerRowIdx === -1) {
      const data = XLSX.utils.sheet_to_json(sheet);
      return data.map((row, index) => ({
        ...emptyRow,
        day: normalizeDay(row['יום'] || row['day'] || row['Day']),
        period: Number(row['שיעור'] || row['שיעור מספר'] || row['period'] || index + 1),
        start_time: String(row['שעת התחלה'] || row['start_time'] || row['start'] || ''),
        end_time: String(row['שעת סיום'] || row['end_time'] || row['end'] || ''),
        subject: String(row['מקצוע'] || row['subject'] || ''),
        teacher: String(row['מורה'] || row['teacher'] || ''),
        room: String(row['חדר'] || row['room'] || ''),
        notes: String(row['הערות'] || row['notes'] || '')
      })).filter(row => row.subject);
    }

    // 2) For each data row, read period number and each day column's lesson blocks
    const results = [];
    for (let r = headerRowIdx + 1; r < grid.length; r++) {
      const row = grid[r] || [];
      const periodValue = periodCol >= 0 ? row[periodCol] : (r - headerRowIdx);
      const period = Number(periodValue);
      if (!period || isNaN(period)) continue;

      for (const colIndex of Object.keys(dayCols)) {
        const day = dayCols[colIndex];
        const cellValue = row[Number(colIndex)];
        const blocks = splitLessonBlocks(cellValue);
        for (const block of blocks) {
          const parsed = parseLessonBlock(block);
          if (!parsed) continue;
          if (!lessonBelongsToClass(parsed.classes, className)) continue;
          results.push({
            ...emptyRow,
            day,
            period,
            start_time: '',
            end_time: '',
            subject: parsed.subject,
            teacher: parsed.teacher,
            room: parsed.room,
            notes: parsed.level
          });
        }
      }
    }
    return results;
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setRows([]);
    setError('');
    setIsParsing(true);

    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      const mappedRows = isPdf ? await parsePdfFile(file) : await parseSpreadsheetFile(file);

      if (mappedRows.length === 0) {
        setError('לא נמצאו שיעורים בקובץ. ודאו שהקובץ מכיל מערכת שעות עם מקצועות.');
      } else {
        setRows(mappedRows);
      }
    } catch (e) {
      setError(e.message || 'אירעה שגיאה בקריאת הקובץ.');
    }

    setIsParsing(false);
  };

  const handleConfirmImport = async () => {
    if (hasMissingRequired) {
      setError('יש להשלים יום, מספר שיעור ומקצוע בכל השורות לפני הייבוא.');
      return;
    }

    setIsImporting(true);
    await base44.entities.ScheduleSlot.bulkCreate(rows.map(row => ({
      class_id: classId,
      day: row.day,
      period: Number(row.period),
      start_time: row.start_time,
      end_time: row.end_time,
      subject: row.subject,
      teacher: row.teacher,
      room: row.room,
      notes: row.notes
    })));

    toast.success('מערכת השעות יובאה בהצלחה');
    setIsImporting(false);
    onImported?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>ייבוא מערכת שעות מקובץ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-right">
          <div className="rounded-xl border border-dashed border-border p-5 bg-muted/30">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.pdf" onChange={handleFileChange} className="hidden" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium">העלאת קובץ Excel, CSV או PDF</p>
                <p className="text-sm text-muted-foreground mt-1">
                  קבצי PDF (דוחות מערכת שעות) נקראים אוטומטית — השיעורים מסוננים לפי כיתה
                  {className ? ` "${className}"` : ''}.
                  בקובץ Excel/CSV: עמודות יום, שיעור, מקצוע, מורה, חדר.
                </p>
                <SelectedFileNotice fileName={fileName} onRemove={clearSelectedFile} disabled={isParsing || isImporting} />
              </div>
              <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={isParsing}>
                {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                {isParsing ? 'קורא קובץ...' : 'בחר קובץ'}
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
              <h3 className="font-semibold">תצוגה מקדימה ({rows.length} שיעורים שנמצאו)</h3>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[850px] text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="p-2 text-right">יום *</th>
                      <th className="p-2 text-right">שיעור *</th>
                      <th className="p-2 text-right">התחלה</th>
                      <th className="p-2 text-right">סיום</th>
                      <th className="p-2 text-right">מקצוע *</th>
                      <th className="p-2 text-right">מורה</th>
                      <th className="p-2 text-right">חדר</th>
                      <th className="p-2 text-right">פעולה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index} className="border-t align-top">
                        <td className="p-2">
                          <Select value={row.day} onValueChange={value => updateRow(index, 'day', value)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{DAYS.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-2"><Input type="number" min="1" value={row.period} onChange={e => updateRow(index, 'period', e.target.value)} /></td>
                        <td className="p-2"><Input type="time" value={row.start_time} onChange={e => updateRow(index, 'start_time', e.target.value)} /></td>
                        <td className="p-2"><Input type="time" value={row.end_time} onChange={e => updateRow(index, 'end_time', e.target.value)} /></td>
                        <td className="p-2"><Input value={row.subject} onChange={e => updateRow(index, 'subject', e.target.value)} className={!row.subject ? 'border-red-400' : ''} /></td>
                        <td className="p-2"><Input value={row.teacher} onChange={e => updateRow(index, 'teacher', e.target.value)} /></td>
                        <td className="p-2"><Input value={row.room} onChange={e => updateRow(index, 'room', e.target.value)} /></td>
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