import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSchoolTimeString } from '@/lib/dateUtils';

const LATE_OPTIONS = [5, 10, 15, 20];
const ABSENCE_REASONS = ['ללא סיבה', 'מחלה', 'אישור הורים', 'פעילות בית ספרית', 'אחר'];

export default function ExceptionDetailDialog({ open, onClose, student, status, initial, onSave }) {
  const [minutes, setMinutes] = useState(/** @type {number | 'other'} */ (10));
  const [customMinutes, setCustomMinutes] = useState('');
  const [reason, setReason] = useState('ללא סיבה');
  const [releaseTime, setReleaseTime] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setMinutes(initial?.minutes ?? 10);
    setCustomMinutes(initial?.customMinutes ?? '');
    setReason(initial?.reason || 'ללא סיבה');
    setReleaseTime(initial?.releaseTime || getSchoolTimeString());
    setNote(initial?.note || '');
  }, [open, initial]);

  if (!student) return null;

  const handleSave = () => {
    const data = { status };
    if (status === 'מאחר/ת') {
      const mins = minutes === 'other' ? (parseInt(customMinutes, 10) || 0) : minutes;
      data.minutes = mins;
      data.note = note || `איחור ${mins} דקות`;
    } else if (status === 'נעדר/ת') {
      data.reason = reason;
      data.note = note ? `${reason} · ${note}` : reason;
    } else if (status === 'שוחרר/ת') {
      data.releaseTime = releaseTime;
      data.note = note ? `שחרור בשעה ${releaseTime} · ${note}` : `שחרור בשעה ${releaseTime}`;
    }
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">
            {status === 'מאחר/ת' && `סימון איחור: ${student.full_name}`}
            {status === 'נעדר/ת' && `סימון היעדרות: ${student.full_name}`}
            {status === 'שוחרר/ת' && `סימון שחרור: ${student.full_name}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-right" dir="rtl">
          {status === 'מאחר/ת' && (
            <div className="space-y-2">
              <Label className="text-right block">משך האיחור (דקות)</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {LATE_OPTIONS.map(m => (
                  <button key={m} type="button" onClick={() => setMinutes(m)}
                    className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                      minutes === m ? 'bg-amber-500 text-white border-amber-500' : 'border-border hover:bg-amber-50 dark:hover:bg-amber-900/20'
                    }`}>
                    {m}
                  </button>
                ))}
                <button type="button" onClick={() => setMinutes('other')}
                  className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                    minutes === 'other' ? 'bg-amber-500 text-white border-amber-500' : 'border-border hover:bg-amber-50 dark:hover:bg-amber-900/20'
                  }`}>
                  אחר
                </button>
              </div>
              {minutes === 'other' && (
                <Input type="number" value={customMinutes} onChange={e => setCustomMinutes(e.target.value)}
                  placeholder="מספר דקות" className="text-right" />
              )}
            </div>
          )}

          {status === 'נעדר/ת' && (
            <div className="space-y-2">
              <Label className="text-right block">סיבת ההיעדרות</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {ABSENCE_REASONS.map(r => (
                  <button key={r} type="button" onClick={() => setReason(r)}
                    className={`py-2 px-2 rounded-lg border text-sm font-medium transition-all ${
                      reason === r ? 'bg-red-500 text-white border-red-500' : 'border-border hover:bg-red-50 dark:hover:bg-red-900/20'
                    }`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {status === 'שוחרר/ת' && (
            <div className="space-y-2">
              <Label htmlFor="releaseTime" className="text-right block">שעת שחרור</Label>
              <Input id="releaseTime" type="time" value={releaseTime}
                onChange={e => setReleaseTime(e.target.value)} className="text-right" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="note" className="text-right block">הערה (אופציונלי)</Label>
            <Input id="note" value={note} onChange={e => setNote(e.target.value)}
              placeholder="הערה קצרה..." className="text-right" />
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
          <Button onClick={handleSave}>שמור</Button>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
