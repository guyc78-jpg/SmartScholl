import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AlertTriangle, FileUp, Loader2, ChevronDown } from 'lucide-react';
import SelectedFileNotice from '@/components/import/SelectedFileNotice';
import { base44 } from '@/api/base44Client';
import { ensureSubjectForName, normalizeSubjectName } from '@/lib/scheduleSubjects';
import useDeleteConfirm from '@/hooks/useDeleteConfirm';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
const PREVIEW_LIMIT = 10;

const normalizeDay = (value = '') => {
  const text = String(value).replace('יום', '').trim();
  return DAYS.find(day => text.includes(day)) || 'ראשון';
};

const normalizeClassName = (value = '') =>
  String(value)
    .replace(/["'`׳״']/g, '')
    .replace(/\s+/g, '')
    .replace(/יב/g, 'יב')
    .replace(/יא/g, 'יא')
    .replace(/י"/g, 'י')
    .trim();

// Build multiple variants of a class name to try matching against lesson text
const classNameVariants = (name = '') => {
  const clean = String(name).trim();
  const variants = new Set([
    clean,
    normalizeClassName(clean),
    clean.replace(/׳/g, "'").replace(/"/g, '"'),
    clean.replace(/['"׳״`]/g, ''),
    clean.replace(/\s+/g, ''),
  ]);
  // Also try replacing Hebrew abbreviation markers: י"ב → יב, י׳ב → יב etc.
  variants.add(clean.replace(/י["׳]ב/g, 'יב').replace(/י["׳]א/g, 'יא'));
  return [...variants].filter(Boolean);
};

const lessonBelongsToClass = (lessonClasses = '', targetClassName = '') => {
  if (!targetClassName) return true;
  const haystack = String(lessonClasses);
  const haystackNorm = normalizeClassName(haystack);
  for (const variant of classNameVariants(targetClassName)) {
    if (haystackNorm.includes(normalizeClassName(variant))) return true;
    if (haystack.includes(variant)) return true;
  }
  // Fallback: try matching just the numeric part (e.g. "8" in "יב 8")
  const numMatch = targetClassName.match(/(\d+)\s*$/);
  if (numMatch) {
    const grade = targetClassName.replace(/\s*\d+\s*$/, '').trim();
    const gradeNorm = normalizeClassName(grade);
    const num = numMatch[1];
    if (gradeNorm && haystackNorm.includes(gradeNorm) && haystackNorm.includes(num)) return true;
  }
  return false;
};

const emptyRow = { day: 'ראשון', period: 1, start_time: '', end_time: '', subject: '', teacher: '', room: '', notes: '' };

const parseLessonBlock = (block) => {
  const text = String(block || '').trim();
  if (!text) return null;
  let room = '';
  const roomMatch = text.match(/חדר:\s*(.+?)(?:\n|$)/);
  if (roomMatch) room = roomMatch[1].trim();
  const withoutRoom = text.replace(/חדר:\s*.+?(?:\n|$)/g, '').trim();
  let level = '';
  const levelMatch = withoutRoom.match(/\(רמה:\s*([^)]+)\)/);
  if (levelMatch) level = levelMatch[1].replace(/`/g, '').trim();
  const withoutLevel = withoutRoom.replace(/\(רמה:[^)]+\)/, '').trim();
  const parts = withoutLevel.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return { teacher: parts[0], subject: parts[1], classes: parts.slice(2).join(' ').trim(), level, room };
};

const splitLessonBlocks = (cellValue) =>
  String(cellValue || '').split(/\n?-{5,}\n?/).map(s => s.trim()).filter(Boolean);

export default function ImportScheduleDialog({ open, onOpenChange, onImported, classId, className = '' }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { confirmDelete, DeleteConfirm } = useDeleteConfirm();

  const hasMissingRequired = rows.some(row => !row.subject || !row.day || !row.period);
  const visibleRows = showAll ? rows : rows.slice(0, PREVIEW_LIMIT);

  const clearSelectedFile = async () => {
    const approved = await confirmDelete({
      title: 'להסיר את הקובץ שנבחר?',
      description: 'הקובץ יוסר מתהליך הייבוא והנתונים שזוהו ממנו יימחקו מהתצוגה.',
      confirmLabel: 'הסר קובץ',
    });
    if (!approved) return;
    setFileName(''); setRows([]); setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseSpreadsheetFile = async (file) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!grid || grid.length === 0) return [];

    let headerRowIdx = -1, dayCols = {}, periodCol = -1;
    for (let r = 0; r < Math.min(grid.length, 10); r++) {
      const row = grid[r] || [];
      const foundDays = {};
      row.forEach((cell, c) => {
        const day = DAYS.find(d => String(cell).trim() === d);
        if (day) foundDays[c] = day;
      });
      if (Object.keys(foundDays).length >= 3) {
        headerRowIdx = r; dayCols = foundDays;
        for (let c = 0; c < row.length; c++) {
          if (dayCols[c]) continue;
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

    if (headerRowIdx === -1) {
      const data = XLSX.utils.sheet_to_json(sheet);
      return data.map((row, index) => ({
        ...emptyRow,
        day: normalizeDay(row['יום'] || row['day'] || ''),
        period: Number(row['שיעור'] || row['period'] || index + 1),
        start_time: String(row['שעת התחלה'] || row['start_time'] || ''),
        end_time: String(row['שעת סיום'] || row['end_time'] || ''),
        subject: String(row['מקצוע'] || row['subject'] || ''),
        teacher: String(row['מורה'] || row['teacher'] || ''),
        room: String(row['חדר'] || row['room'] || ''),
        notes: String(row['הערות'] || row['notes'] || '')
      })).filter(row => row.subject);
    }

    const results = [];
    for (let r = headerRowIdx + 1; r < grid.length; r++) {
      const row = grid[r] || [];
      const period = Number(periodCol >= 0 ? row[periodCol] : (r - headerRowIdx));
      if (!period || isNaN(period)) continue;
      for (const colIndex of Object.keys(dayCols)) {
        const blocks = splitLessonBlocks(row[Number(colIndex)]);
        for (const block of blocks) {
          const parsed = parseLessonBlock(block);
          if (!parsed || !lessonBelongsToClass(parsed.classes, className)) continue;
          results.push({ ...emptyRow, day: dayCols[colIndex], period, subject: parsed.subject, teacher: parsed.teacher, room: parsed.room, notes: parsed.level });
        }
      }
    }
    return results;
  };

  const parsePdfFile = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const schema = {
      type: 'object',
      required: ['lessons'],
      properties: {
        lessons: {
          type: 'array',
          items: {
            type: 'object',
            required: ['day', 'period', 'subject'],
            properties: {
              day: { type: 'string' },
              period: { type: 'number' },
              subject: { type: 'string' },
              teacher: { type: 'string' },
              room: { type: 'string' },
            }
          }
        }
      }
    };

    const buildPrompt = (strict = false) => `זהו PDF של מערכת שעות בעברית עבור כיתה "${className || 'לא ידוע'}".
קרא את כל 3 העמודים ואת כל השורות 1–12. הטבלה מימין לשמאל: העמודה הימנית ביותר היא מספר שיעור, והימים מימין לשמאל הם ראשון, שני, שלישי, רביעי, חמישי, שישי.
בכל תא עשויים להיות כמה שיעורים מקבילים, מופרדים בקו "----------". כל מקטע כזה הוא שיעור נפרד.

כללי חילוץ חובה:
1. החזר רק שיעורים שבהם רשימת הכיתות כוללת את "${className || ''}" או וריאנט שלו: י"ב 8, יב 8, י``ב 8, י״ב 8.
2. אם בתא אחד יש כמה מקטעים ששייכים לכיתה — החזר את כולם כשורות נפרדות עם אותו day ואותו period.
3. אל תאחד מקצועות, אל תבחר רק מקצוע אחד מתוך תא, ואל תדלג על עמודים.
4. שמות ימים חייבים להיות: ראשון, שני, שלישי, רביעי, חמישי, שישי.
5. החזר subject כמקצוע בלבד, teacher כשם מורה בלבד, room ללא המילה "חדר:".
${strict ? '6. אם נמצאו פחות מ-8 שיעורים, זה כמעט בוודאות חסר — עבור שוב תא-תא, עמוד-עמוד, והשלם את כל השיעורים של הכיתה.' : ''}

החזר JSON בלבד במבנה:
{"lessons":[{"day":"ראשון","period":1,"subject":"תקשורת עיונית","teacher":"חייט רועי","room":"חדר תקשורת"}]}`;

    const normalizeLessons = (result) => {
      const lessons = Array.isArray(result) ? result : (result?.lessons || []);
      const seen = new Set();
      return lessons
        .filter(l => l.subject && l.day && l.period)
        .map(l => ({
          ...emptyRow,
          day: normalizeDay(l.day),
          period: Number(l.period),
          subject: String(l.subject || '').trim(),
          teacher: String(l.teacher || '').trim(),
          room: String(l.room || '').trim(),
          notes: '',
        }))
        .filter(l => {
          const key = `${l.day}|${l.period}|${l.subject}|${l.teacher}|${l.room}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    };

    const firstResult = await base44.integrations.Core.InvokeLLM({
      prompt: buildPrompt(false),
      file_urls: [file_url],
      model: 'gpt_5_4',
      response_json_schema: schema,
    });
    const firstLessons = normalizeLessons(firstResult);
    if (firstLessons.length >= 8) return firstLessons;

    const secondResult = await base44.integrations.Core.InvokeLLM({
      prompt: buildPrompt(true),
      file_urls: [file_url],
      model: 'gpt_5_5',
      response_json_schema: schema,
    });
    const secondLessons = normalizeLessons(secondResult);
    return secondLessons.length > firstLessons.length ? secondLessons : firstLessons;
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setRows([]); setError(''); setIsParsing(true); setShowAll(false);
    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      const mappedRows = isPdf ? await parsePdfFile(file) : await parseSpreadsheetFile(file);
      if (mappedRows.length === 0) setError('לא נמצאו שיעורים בקובץ. ודאו שהקובץ מכיל מערכת שעות עם מקצועות.');
      else setRows(mappedRows);
    } catch (e) {
      setError(e.message || 'אירעה שגיאה בקריאת הקובץ.');
    }
    setIsParsing(false);
  };

  const handleConfirmImport = async () => {
    if (hasMissingRequired) { setError('יש להשלים יום, מספר שיעור ומקצוע בכל השורות לפני הייבוא.'); return; }
    setIsImporting(true);
    let subjects = (await base44.entities.SchoolSubject.list('-updated_date', 500)).filter(subject => subject.is_active !== false);
    const subjectsByKey = {};
    for (const subject of subjects) subjectsByKey[subject.normalized_key] = subject;
    for (const row of rows) {
      const key = normalizeSubjectName(row.subject);
      if (!subjectsByKey[key]) {
        const subject = await ensureSubjectForName(row.subject, subjects);
        subjects = [...subjects, subject];
        subjectsByKey[key] = subject;
      }
    }
    await base44.entities.ScheduleSlot.bulkCreate(rows.map(row => ({
      class_id: classId, day: row.day, period: Number(row.period),
      start_time: row.start_time, end_time: row.end_time,
      subject: row.subject, subject_id: subjectsByKey[normalizeSubjectName(row.subject)]?.id || '', teacher: row.teacher, room: row.room, notes: row.notes
    })));
    toast.success('מערכת השעות יובאה בהצלחה');
    setIsImporting(false);
    onImported?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full flex flex-col max-h-[92vh] p-0 gap-0" dir="rtl">
        {/* Header */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <DialogTitle className="text-base">ייבוא מערכת שעות מקובץ</DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Upload area */}
          <div className="rounded-xl border border-dashed border-border p-4 bg-muted/30">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.pdf" onChange={handleFileChange} className="hidden" />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Excel / CSV / PDF</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  שיעורים יסוננו לפי כיתה{className ? ` "${className}"` : ''}
                </p>
                <SelectedFileNotice fileName={fileName} onRemove={clearSelectedFile} disabled={isParsing || isImporting} />
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={isParsing}>
                {isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
                {isParsing ? 'קורא...' : 'בחר קובץ'}
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview cards */}
          {rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                תצוגה מקדימה — {rows.length} שיעורים
                {hasMissingRequired && <span className="text-red-500 mr-2">· חסרים שדות חובה</span>}
              </p>

              <div className="space-y-2">
                {visibleRows.map((row, index) => (
                  <div
                    key={index}
                    className={`rounded-xl border px-3 py-2.5 text-sm bg-card ${!row.subject ? 'border-red-300 bg-red-50/40 dark:bg-red-900/10' : 'border-border'}`}
                  >
                    {/* Row 1: day + period + times */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{row.day}</span>
                      <span className="text-xs bg-muted rounded px-1.5 py-0.5">שיעור {row.period}</span>
                      {(row.start_time || row.end_time) && (
                        <span className="text-xs text-muted-foreground">
                          {row.start_time}{row.start_time && row.end_time ? '–' : ''}{row.end_time}
                        </span>
                      )}
                    </div>
                    {/* Row 2: subject + teacher + room */}
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      {row.subject
                        ? <span className="font-medium text-foreground">{row.subject}</span>
                        : <span className="text-red-500">חסר מקצוע</span>
                      }
                      {row.teacher && <span>· {row.teacher}</span>}
                      {row.room && <span>· חדר {row.room}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {rows.length > PREVIEW_LIMIT && !showAll && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-primary hover:underline"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  הצג עוד ({rows.length - PREVIEW_LIMIT} שורות נוספות)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Fixed bottom actions — always visible */}
        {rows.length > 0 && (
          <div className="shrink-0 border-t bg-background px-4 py-3 flex gap-2" dir="rtl">
            <Button
              onClick={handleConfirmImport}
              disabled={isImporting || hasMissingRequired}
              className="flex-1 gap-2"
            >
              {isImporting && <Loader2 className="w-4 h-4 animate-spin" />}
              אשר ייבוא
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              ביטול
            </Button>
          </div>
        )}
        {rows.length === 0 && (
          <div className="shrink-0 border-t bg-background px-4 py-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              ביטול
            </Button>
          </div>
        )}
        <DeleteConfirm />
      </DialogContent>
    </Dialog>
  );
}