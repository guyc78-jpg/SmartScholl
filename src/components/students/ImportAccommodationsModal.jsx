import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { ACCOMMODATION_TYPES, normalizeAccommodationList } from '@/lib/accommodations';
import SelectedFileNotice from '@/components/import/SelectedFileNotice';
import { Upload, FileText, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { validateFileSize } from '@/lib/fileValidation';

export default function ImportAccommodationsModal({ onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState('upload');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const fileError = validateFileSize(file);
    if (fileError) { setError(fileError); return; }
    setLoading(true);
    setError('');
    setFileName(file.name);
    try {
      const upload = await base44.integrations.Core.UploadFile({ file });
      const response = await base44.functions.invoke('learningAccommodations', {
        action: 'parseImport',
        file_url: upload.file_url,
        file_name: file.name,
      });
      const parsed = (response.data.rows || []).map(row => ({
        ...row,
        accommodations: normalizeAccommodationList(row.accommodations),
      }));
      if (!parsed.length) {
        setError('לא נמצאו התאמות בקובץ. ודא שיש טבלה עם שם תלמיד, כיתה ועמודות התאמות.');
        toast.error('לא נמצאו התאמות בקובץ');
      }
      setRows(parsed);
      setStep('preview');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'שגיאה בקריאת הקובץ');
      toast.error('שגיאה בקריאת הקובץ');
    }
    setLoading(false);
  }

  function updateRow(index, updates) {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, ...updates } : row));
  }

  function updateAccommodation(rowIndex, key, updates) {
    setRows(prev => prev.map((row, i) => {
      if (i !== rowIndex) return row;
      return {
        ...row,
        accommodations: normalizeAccommodationList(row.accommodations).map(item => item.key === key ? { ...item, ...updates } : item),
      };
    }));
  }

  function removeRow(index) {
    setRows(prev => prev.filter((_, i) => i !== index));
  }

  function clearFile() {
    setFileName('');
    setRows([]);
    setError('');
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function applyImport() {
    setImporting(true);
    const response = await base44.functions.invoke('learningAccommodations', {
      action: 'applyImport',
      rows,
    });
    const { success, failures } = response.data;
    if (failures?.length) toast.warning(`יובאו ${success}, ${failures.length} שורות לא נשמרו`);
    else toast.success(`יובאו ${success} רשומות התאמות`);
    setImporting(false);
    onSuccess?.();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[88vh] overflow-y-auto text-right" dir="rtl">
        <DialogHeader>
          <DialogTitle>ייבוא התאמות לימודיות</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground mb-1">בחר קובץ Word או Excel</p>
              <p className="text-sm text-muted-foreground mb-4">המערכת מזהה כותרות חוזרות, שורות ריקות וכיתה שמופיעה בתחילת קבוצה</p>
              <label className="cursor-pointer">
                <Button variant="outline" asChild disabled={loading}><span>{loading ? 'קורא קובץ...' : 'בחר קובץ'}</span></Button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.docx" className="hidden" onChange={handleFile} />
              </label>
              <SelectedFileNotice fileName={fileName} onRemove={clearFile} disabled={loading} />
              {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
            <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">כללי זיהוי:</p>
              <p>סימן + יישמר כהתאמה פעילה. טקסט בתא יישמר כפירוט ההתאמה.</p>
              <p>אם כיתה ריקה בשורת תלמיד, התלמיד ישויך לכיתה האחרונה שזוהתה מעליו.</p>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-primary" />
                <span className="font-medium">נמצאו {rows.length} שורות לבדיקה</span>
              </div>
              <SelectedFileNotice fileName={fileName} onRemove={clearFile} disabled={importing} />
            </div>

            <div className="space-y-3 max-h-[52vh] overflow-y-auto pe-1">
              {rows.map((row, index) => {
                const activeCount = normalizeAccommodationList(row.accommodations).filter(item => item.enabled).length;
                return (
                  <div key={index} className="rounded-xl border bg-card p-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr,140px,auto] gap-2 items-center">
                      <Input value={row.student_name || ''} onChange={event => updateRow(index, { student_name: event.target.value })} placeholder="שם תלמיד" className="text-right" />
                      <Input value={row.class_name || ''} onChange={event => updateRow(index, { class_name: event.target.value })} placeholder="כיתה" className="text-right" />
                      <Button variant="ghost" size="icon" onClick={() => removeRow(index)} className="text-destructive justify-self-start">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <Badge variant="outline">{activeCount} פעילות</Badge>
                      {ACCOMMODATION_TYPES.map(type => {
                        const item = normalizeAccommodationList(row.accommodations).find(accommodation => accommodation.key === type.key);
                        return (
                          <div key={type.key} className="rounded-lg border bg-background/60 px-2 py-1.5 space-y-1 min-w-[180px]">
                            <div className="flex items-center gap-2 justify-between">
                              <span className="text-xs font-medium">{type.label}</span>
                              <Switch checked={!!item?.enabled} onCheckedChange={checked => updateAccommodation(index, type.key, { enabled: checked })} />
                            </div>
                            <Input
                              value={item?.detail || ''}
                              onChange={event => updateAccommodation(index, type.key, { detail: event.target.value })}
                              placeholder="פירוט"
                              className="h-8 text-xs text-right"
                              disabled={!item?.enabled}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 justify-start">
              <Button onClick={applyImport} disabled={importing || rows.length === 0} className="gap-2">
                <Check className="w-4 h-4" />
                {importing ? 'מייבא...' : `אשר ייבוא (${rows.length})`}
              </Button>
              <Button variant="outline" onClick={() => setStep('upload')} disabled={importing}>חזור</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
