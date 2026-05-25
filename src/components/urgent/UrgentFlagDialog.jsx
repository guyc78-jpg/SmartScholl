import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Bell } from 'lucide-react';
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

const fieldWrap = 'space-y-2';
const labelCls = 'block text-sm font-semibold text-foreground/85';
const inputCls = 'h-11 rounded-xl border border-input bg-background px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-primary/25';
const selectTriggerCls = 'h-11 rounded-xl border border-input bg-background px-3 text-sm shadow-none focus:ring-2 focus:ring-primary/25';
const dateInputCls = 'h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-primary/25 [color-scheme:light] dark:[color-scheme:dark]';

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
      <DialogContent dir="rtl" className="w-[calc(100vw-2rem)] max-w-xl rounded-2xl p-0 overflow-hidden bg-card">
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-4 border-b border-border/70 text-right">
          <DialogTitle className="text-lg font-bold text-foreground">
            {flag ? 'עריכת דגש' : 'דגש חדש לטיפול מיידי'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            הוסיפו פריט חשוב למעקב וטיפול של הצוות.
          </p>
        </DialogHeader>

        <div className="px-5 sm:px-6 py-5 space-y-5 max-h-[72vh] overflow-y-auto">
          <div className={fieldWrap}>
            <Label className={labelCls}>כותרת *</Label>
            <Input
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="לדוגמה: תיאום הסעות לטיול"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={fieldWrap}>
              <Label className={labelCls}>קטגוריה</Label>
              <Select value={form.category} onValueChange={v => setField('category', v)}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className={fieldWrap}>
              <Label className={labelCls}>עדיפות</Label>
              <Select value={form.priority} onValueChange={v => setField('priority', v)}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={fieldWrap}>
              <Label className={labelCls}>תאריך יעד</Label>
              <div className="relative h-11">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                <Input
                  type="date"
                  value={form.due_date || ''}
                  onChange={e => setField('due_date', e.target.value)}
                  className={`${dateInputCls} pr-10`}
                />
              </div>
            </div>

            <div className={fieldWrap}>
              <Label className={labelCls}>תזכורת</Label>
              <div className="relative h-11">
                <Bell className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                <Input
                  type="date"
                  value={form.reminder_date || ''}
                  onChange={e => setField('reminder_date', e.target.value)}
                  className={`${dateInputCls} pr-10`}
                />
              </div>
            </div>
          </div>

          {flag && (
            <div className={fieldWrap}>
              <Label className={labelCls}>סטטוס</Label>
              <Select value={form.status} onValueChange={v => setField('status', v)}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className={fieldWrap}>
            <Label className={labelCls}>הערה חופשית</Label>
            <Textarea
              value={form.note || ''}
              onChange={e => setField('note', e.target.value)}
              placeholder="פרטים נוספים, צעדים לטיפול, מי מעורב..."
              rows={4}
              className="min-h-28 rounded-xl border-border bg-background px-3 py-3 text-sm shadow-none resize-none focus-visible:ring-2 focus-visible:ring-primary/25"
            />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-border bg-muted/35 px-4 py-3 text-sm font-medium text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.is_pinned}
              onChange={e => setField('is_pinned', e.target.checked)}
              className="w-4 h-4 shrink-0 accent-primary"
            />
            <span className="leading-none">הצמד לראש הרשימה</span>
          </label>
        </div>

        <DialogFooter className="px-5 sm:px-6 py-4 border-t border-border/70 bg-muted/25 gap-2 sm:justify-start">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto h-10 rounded-xl px-5 font-semibold"
          >
            {saving ? 'שומר...' : (flag ? 'שמור שינויים' : 'הוסף דגש')}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-10 rounded-xl px-5"
          >
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}