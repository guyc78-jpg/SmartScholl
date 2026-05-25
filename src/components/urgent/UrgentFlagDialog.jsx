import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Bell, X } from 'lucide-react';
import { CATEGORIES, PRIORITIES, STATUSES } from './urgentFlagUtils';

// Custom date field — shows placeholder when empty, clear button when filled
function DateField({ value, onChange, icon: Icon, placeholder }) {
  const inputRef = useRef(null);

  const formatted = value
    ? new Date(value).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <div
      className="relative flex items-center h-10 w-full rounded-lg border border-input bg-background cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => inputRef.current?.showPicker?.()}
    >
      {/* icon right */}
      <span className="flex items-center pr-2.5 shrink-0">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </span>

      {/* display text */}
      <span className={`flex-1 text-sm select-none ${formatted ? 'text-foreground' : 'text-muted-foreground/70'}`}>
        {formatted || placeholder}
      </span>

      {/* clear button */}
      {value && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onChange(''); }}
          className="flex items-center pl-2.5 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* invisible native date input */}
      <input
        ref={inputRef}
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        style={{ colorScheme: 'light' }}
      />
    </div>
  );
}

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

// Shared field styles — every input/select uses exactly these
const fieldCls = 'space-y-1.5';
const labelCls = 'block text-sm font-semibold text-foreground/80';
const controlBase = 'h-10 w-full rounded-lg border border-input bg-background text-sm shadow-none';
const inputCls = `${controlBase} px-3 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none`;
const selectCls = `${controlBase} px-3 focus:ring-2 focus:ring-primary/25`;

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
      <DialogContent
        dir="rtl"
        className="w-[calc(100vw-1.5rem)] max-w-[28rem] rounded-2xl p-0 overflow-hidden bg-card"
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/60 text-right">
          <DialogTitle className="text-base font-bold text-foreground">
            {flag ? 'עריכת דגש' : 'דגש חדש לטיפול מיידי'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            הוסיפו פריט חשוב למעקב וטיפול של הצוות.
          </p>
        </DialogHeader>

        {/* Form body */}
        <div className="px-5 py-4 space-y-4 max-h-[68vh] overflow-y-auto">

          {/* כותרת */}
          <div className={fieldCls}>
            <Label className={labelCls}>כותרת *</Label>
            <Input
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="לדוגמה: תיאום הסעות לטיול"
              className={inputCls}
            />
          </div>

          {/* קטגוריה + עדיפות */}
          <div className="grid grid-cols-2 gap-3">
            <div className={fieldCls}>
              <Label className={labelCls}>קטגוריה</Label>
              <Select value={form.category} onValueChange={v => setField('category', v)}>
                <SelectTrigger className={selectCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className={fieldCls}>
              <Label className={labelCls}>עדיפות</Label>
              <Select value={form.priority} onValueChange={v => setField('priority', v)}>
                <SelectTrigger className={selectCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* תאריך יעד + תזכורת */}
          <div className="grid grid-cols-2 gap-3">
            <div className={fieldCls}>
              <Label className={labelCls}>תאריך יעד</Label>
              <DateField
                value={form.due_date}
                onChange={v => setField('due_date', v)}
                icon={Calendar}
                placeholder=""
              />
            </div>
            <div className={fieldCls}>
              <Label className={labelCls}>תזכורת</Label>
              <DateField
                value={form.reminder_date}
                onChange={v => setField('reminder_date', v)}
                icon={Bell}
                placeholder=""
              />
            </div>
          </div>

          {/* סטטוס — בעריכה בלבד */}
          {flag && (
            <div className={fieldCls}>
              <Label className={labelCls}>סטטוס</Label>
              <Select value={form.status} onValueChange={v => setField('status', v)}>
                <SelectTrigger className={selectCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* הערה */}
          <div className={fieldCls}>
            <Label className={labelCls}>הערה חופשית</Label>
            <Textarea
              value={form.note || ''}
              onChange={e => setField('note', e.target.value)}
              placeholder="פרטים נוספים, צעדים לטיפול, מי מעורב..."
              rows={3}
              className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-none resize-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none min-h-24"
            />
          </div>

          {/* Checkbox */}
          <label className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.is_pinned}
              onChange={e => setField('is_pinned', e.target.checked)}
              className="w-4 h-4 shrink-0 accent-primary mt-px"
            />
            <span className="text-sm font-medium text-foreground leading-none">הצמד לראש הרשימה</span>
          </label>
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-4 border-t border-border/60 bg-muted/20 flex flex-row-reverse gap-2 sm:justify-start">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none h-9 rounded-lg px-5 text-sm font-semibold"
          >
            {saving ? 'שומר...' : (flag ? 'שמור שינויים' : 'הוסף דגש')}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none h-9 rounded-lg px-4 text-sm"
          >
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}