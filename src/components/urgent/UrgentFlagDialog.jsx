import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CATEGORIES, PRIORITIES, STATUSES } from './urgentFlagUtils';

const empty = {
  title: '',
  category: 'אחר',
  priority: 'רגיל',
  status: 'פתוח',
  due_date: '',
  reminder_date: '',
  note: '',
  is_pinned: false,
};

export default function UrgentFlagDialog({ open, onOpenChange, classId, flag, user, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(flag ? { ...empty, ...flag } : empty);
  }, [open, flag]);

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error('יש להזין כותרת לדגש');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      class_id: classId,
      created_by_name: form.created_by_name || user?.full_name || '',
      resolved_at: form.status === 'טופל' && !flag?.resolved_at ? new Date().toISOString() : (form.status !== 'טופל' ? '' : flag?.resolved_at),
    };
    if (flag?.id) {
      await base44.entities.UrgentFlag.update(flag.id, payload);
      toast.success('הדגש עודכן');
    } else {
      await base44.entities.UrgentFlag.create(payload);
      toast.success('הדגש נוסף');
    }
    setSaving(false);
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{flag ? 'עריכת דגש' : 'דגש חדש לטיפול מיידי'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">כותרת *</Label>
            <Input
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="לדוגמה: תיאום הסעות לטיול"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">קטגוריה</Label>
              <Select value={form.category} onValueChange={v => setField('category', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">עדיפות</Label>
              <Select value={form.priority} onValueChange={v => setField('priority', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">תאריך יעד</Label>
              <Input
                type="date"
                value={form.due_date || ''}
                onChange={e => setField('due_date', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">תזכורת</Label>
              <Input
                type="date"
                value={form.reminder_date || ''}
                onChange={e => setField('reminder_date', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {flag && (
            <div>
              <Label className="text-xs">סטטוס</Label>
              <Select value={form.status} onValueChange={v => setField('status', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs">הערה חופשית</Label>
            <Textarea
              value={form.note || ''}
              onChange={e => setField('note', e.target.value)}
              placeholder="פרטים נוספים, צעדים לטיפול, מי מעורב..."
              rows={3}
              className="mt-1"
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.is_pinned}
              onChange={e => setField('is_pinned', e.target.checked)}
              className="accent-primary w-4 h-4"
            />
            <span>הצמד לראש הרשימה</span>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'שומר...' : (flag ? 'שמור שינויים' : 'הוסף דגש')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}