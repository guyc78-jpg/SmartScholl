import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ConfirmResetCard({ checked, text, disabled, running, onCheckedChange, onTextChange, onExecute }) {
  const ready = checked && text === 'איפוס שנת לימודים' && !disabled;
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-4 text-right" dir="rtl">
      <label className="flex items-start gap-3 justify-start text-right">
        <Checkbox checked={checked} onCheckedChange={onCheckedChange} className="mt-1" />
        <span className="text-sm font-medium">אני מבין/ה שהפעולה תמחק נתונים תפעוליים של השנה ותשאיר תלמידים, הורים, מידע רגיש והתאמות.</span>
      </label>
      <Input value={text} onChange={(e) => onTextChange(e.target.value)} placeholder="הקלד/י: איפוס שנת לימודים" />
      <Button variant="destructive" disabled={!ready || running} onClick={onExecute}>{running ? 'מבצע איפוס...' : 'בצע מעבר ואיפוס'}</Button>
    </div>
  );
}