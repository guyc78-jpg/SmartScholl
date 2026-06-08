import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';
import SelectedFileNotice from '@/components/import/SelectedFileNotice';
import { parseStudentsWorksheetRows } from '@/lib/studentImport';
import { formatStudentName } from '@/lib/studentName';

function parseGradeFromClassName(className = '') {
  const clean = String(className).replace(/[\s״"׳']/g, '');
  if (clean.startsWith('יב')) return 'יב';
  if (clean.startsWith('יא')) return 'יא';
  if (clean.startsWith('י')) return 'י';
  if (clean.startsWith('ט')) return 'ט';
  if (clean.startsWith('ח')) return 'ח';
  if (clean.startsWith('ז')) return 'ז';
  return 'י';
}

async function getOrCreateClassRoom(student) {
  const className = student.class_name || '';
  const existing = await base44.entities.ClassRoom.filter({ name: className });
  if (existing[0]) return existing[0];
  return base44.entities.ClassRoom.create({
    name: className,
    grade: student.grade || parseGradeFromClassName(className),
    year: 'תשפ״ו',
    is_active: true
  });
}

export default function ImportStudentsModal({ classId, onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState('upload'); // upload | preview | done
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [classRoom, setClassRoom] = useState(null);

  useEffect(() => {
    async function loadClassRoom() {
      if (!classId || !/^[a-f0-9]{24}$/i.test(classId)) {
        setClassRoom(null);
        return;
      }
      const byId = await base44.entities.ClassRoom.filter({ id: classId });
      setClassRoom(byId[0] || null);
    }
    loadClassRoom();
  }, [classId]);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setFileName(file.name);
      setPreview([]);
      setError('');
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const activeClassId = classRoom?.id || classId;
      const mapped = parseStudentsWorksheetRows(rows, { classId: activeClassId, classRoom });
      if (mapped.length === 0) {
        setError('לא נמצאו תלמידים בקובץ. ודא שיש עמודות שם פרטי ושם משפחה.');
        toast.error('לא נמצאו תלמידים בקובץ');
      }
      setPreview(mapped);
      setStep('preview');
    } catch (err) {
      setError('שגיאה בקריאת הקובץ. ודא שהקובץ הוא Excel תקין');
      toast.error('שגיאה בקריאת הקובץ. ודא שהקובץ הוא Excel תקין');
    }
  }

  function clearSelectedFile() {
    if (!window.confirm('להסיר את הקובץ שנבחר?')) return;
    setFileName('');
    setPreview([]);
    setError('');
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleImport() {
    setImporting(true);
    let success = 0;
    for (const student of preview) {
      try {
        const classForStudent = await getOrCreateClassRoom(student);
        await base44.entities.Student.create({
          ...student,
          class_id: classForStudent.id,
          class_name: classForStudent.name,
          grade: classForStudent.grade || student.grade
        });
        success++;
      } catch {}
    }
    setImporting(false);
    toast.success(`יובאו ${success} תלמידים בהצלחה!`);
    setStep('done');
    setTimeout(() => onSuccess(), 1500);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>ייבוא תלמידים מאקסל</DialogTitle>
        </DialogHeader>
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground mb-1">גרור קובץ אקסל לכאן</p>
              <p className="text-sm text-muted-foreground mb-4">או לחץ לבחירת קובץ</p>
              <label className="cursor-pointer">
                <Button variant="outline" asChild><span>בחר קובץ</span></Button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              </label>
              <SelectedFileNotice fileName={fileName} onRemove={clearSelectedFile} disabled={importing} />
              {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
            <div className="bg-muted rounded-xl p-4">
              <p className="text-sm font-medium mb-2">הייבוא מזהה קבצי תלמידים עם עמודות:</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                {['שם פרטי', 'שם משפחה', 'ת.ז', 'כיתה', 'מין', 'נייד', 'דואל', 'ת.לידה'].map(c => (
                  <span key={c}>• {c}</span>
                ))}
              </div>
            </div>
          </div>
        )}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-primary" />
                <span className="font-medium">נמצאו {preview.length} תלמידים לייבוא</span>
              </div>
              <SelectedFileNotice fileName={fileName} onRemove={clearSelectedFile} disabled={importing} />
            </div>
            <div className="max-h-64 overflow-y-auto border rounded-xl divide-y">
              {preview.slice(0, 20).map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                    {formatStudentName(s).charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{formatStudentName(s)}</p>
                    <p className="text-xs text-muted-foreground">{s.student_number} · {s.phone}</p>
                  </div>
                </div>
              ))}
              {preview.length > 20 && <p className="text-center text-xs text-muted-foreground py-2">ועוד {preview.length - 20}...</p>}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={importing} className="flex-1 gap-2">
                {importing ? 'מייבא...' : <><Upload className="w-4 h-4" />ייבא {preview.length} תלמידים</>}
              </Button>
              <Button variant="outline" onClick={() => setStep('upload')}>חזור</Button>
            </div>
          </div>
        )}
        {step === 'done' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">ייבוא הושלם!</h3>
            <p className="text-muted-foreground text-sm">כל התלמידים יובאו בהצלחה</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}