import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';

export default function ImportStudentsModal({ classId, onClose, onSuccess }) {
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState('upload'); // upload | preview | done

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { default: XLSX } = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      const mapped = rows.map(row => ({
        full_name: row['שם מלא'] || row['name'] || '',
        student_number: String(row['מספר תלמיד'] || row['id'] || ''),
        phone: String(row['טלפון'] || row['phone'] || ''),
        email: row['מייל'] || row['email'] || '',
        parent1_name: row['הורה 1'] || row['parent1'] || '',
        parent1_phone: String(row['טלפון הורה 1'] || row['parent1_phone'] || ''),
        grade: 'י', gender: row['מין'] || 'זכר',
        class_id: classId, class_name: 'י׳1',
        status: 'פעיל', community_service_goal: 60, community_service_done: 0,
        community_service_status: 'לא התחיל'
      })).filter(r => r.full_name);
      setPreview(mapped);
      setStep('preview');
    } catch (err) {
      toast.error('שגיאה בקריאת הקובץ. ודא שהקובץ הוא Excel תקין');
    }
  }

  async function handleImport() {
    setImporting(true);
    let success = 0;
    for (const student of preview) {
      try {
        await base44.entities.Student.create(student);
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
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              </label>
            </div>
            <div className="bg-muted rounded-xl p-4">
              <p className="text-sm font-medium mb-2">עמודות נדרשות בקובץ:</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                {['שם מלא', 'מספר תלמיד', 'טלפון', 'מייל', 'הורה 1', 'טלפון הורה 1', 'מין'].map(c => (
                  <span key={c}>• {c}</span>
                ))}
              </div>
            </div>
          </div>
        )}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-medium">נמצאו {preview.length} תלמידים לייבוא</span>
            </div>
            <div className="max-h-64 overflow-y-auto border rounded-xl divide-y">
              {preview.slice(0, 20).map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                    {s.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.full_name}</p>
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