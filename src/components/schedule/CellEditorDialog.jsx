import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, AlertTriangle } from 'lucide-react';
import { SUBJECT_COLORS, normalizeSubjectName } from '@/lib/scheduleSubjects';
import ScheduleSubjectPicker from '@/components/schedule/ScheduleSubjectPicker';

const DEFAULT_SUBJECTS = [
  'מתמטיקה','עברית','ספרות','אנגלית','היסטוריה','גיאוגרפיה',
  'פיזיקה','כימיה','ביולוגיה','חינוך גופני','אמנות','שעת חינוך',
  'תנ"ך','מחשבים','מדעים','אזרחות'
];

// Cell editor — add / edit / delete a single ScheduleSlot
export default function CellEditorDialog({ open, onOpenChange, slot, day, period, periodTime, onSave, onDelete, subjects = [] }) {
  const isEdit = !!slot?.id;
  const [form, setForm] = useState({ subject: '', teacher: '', room: '', group: '', notes: '', customSubject: '', subjectColor: SUBJECT_COLORS[0] });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    if (open) {
      const slotSubject = slot?.subject || '';
      const knownSubjects = new Set([
        ...subjects.filter(subject => subject.is_active !== false).map(subject => subject.name),
        ...DEFAULT_SUBJECTS,
      ]);
      const isCustomSubject = Boolean(slotSubject && !knownSubjects.has(slotSubject));
      setForm({
        subject: isCustomSubject ? 'אחר' : slotSubject,
        customSubject: isCustomSubject ? slotSubject : '',
        subjectColor: subjects.find(subject => subject.id === slot?.subject_id || subject.normalized_key === normalizeSubjectName(slot?.subject))?.color || SUBJECT_COLORS[0],
        teacher: slot?.teacher || '',
        room: slot?.room || '',
        // "group" stored in notes prefix to avoid schema change: "[קבוצה: X] ..."
        group: extractGroup(slot?.notes),
        notes: stripGroup(slot?.notes),
      });
      setConfirmDelete(false);
      setShowColorPicker(false);
    }
  }, [open, slot, subjects]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const activeSubjects = subjects.filter(subject => subject.is_active !== false);
  const subjectOptions = [...activeSubjects.map(subject => subject.name), ...DEFAULT_SUBJECTS]
    .filter((name, index, list) => name && list.indexOf(name) === index);
  const selectSubject = (value) => {
    const subject = activeSubjects.find(item => item.normalized_key === normalizeSubjectName(value));
    setForm(prev => ({ ...prev, subject: value, subjectColor: subject?.color || prev.subjectColor || SUBJECT_COLORS[0] }));
    setShowColorPicker(false);
  };

  function handleSubmit() {
    const combinedNotes = form.group
      ? `[קבוצה: ${form.group}]${form.notes ? ' ' + form.notes : ''}`
      : (form.notes || '');
    const finalSubject = form.subject === 'אחר' ? (form.customSubject || '') : form.subject;
    onSave({
      subject: finalSubject,
      teacher: form.teacher,
      room: form.room,
      notes: combinedNotes,
      subject_color: form.subjectColor,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-3 p-4 sm:max-w-md sm:p-5" dir="rtl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-right">
            {isEdit ? 'עריכת שיעור' : 'הוספת שיעור'}
          </DialogTitle>
          <div className="flex items-center justify-center gap-3 rounded-lg bg-muted/40 py-1.5">
            <span className="text-sm font-semibold text-foreground">יום {day}</span>
            <span className="text-sm font-semibold text-foreground">שיעור {period}</span>
            {periodTime && <span className="force-ltr text-base font-bold text-primary">{periodTime}</span>}
          </div>
        </DialogHeader>

        <div className="space-y-2.5 text-right">
          <div className="space-y-1">
            <Label className="text-xs">מקצוע *</Label>
            {form.subject === 'אחר' ? (
              <Input value={form.subject === 'אחר' ? form.customSubject || '' : form.subject}
                onChange={e => set('customSubject', e.target.value)}
                placeholder="הזן מקצוע" />
            ) : (
              <ScheduleSubjectPicker value={form.subject} options={[...subjectOptions, 'אחר']} onChange={selectSubject} />
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/35 px-3 py-2" dir="rtl">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-4 w-4 rounded-full border border-foreground/10" style={{ backgroundColor: form.subjectColor }} />
              <span>צבע המקצוע</span>
            </div>
            <button type="button" onClick={() => setShowColorPicker(value => !value)} className="text-xs font-semibold text-primary hover:underline">
              {showColorPicker ? 'סגור' : 'שינוי צבע'}
            </button>
          </div>
          {showColorPicker && (
            <div className="grid grid-cols-8 gap-1.5" dir="rtl">
              {SUBJECT_COLORS.slice(0, 16).map(color => (
                <button key={color} type="button" onClick={() => set('subjectColor', color)} className="h-7 rounded-full border-2 transition-all" style={{ backgroundColor: color, borderColor: form.subjectColor === color ? 'hsl(var(--foreground))' : 'transparent' }} aria-label={`בחר צבע ${color}`} />
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="space-y-1">
              <Label className="text-xs">מורה</Label>
              <Input value={form.teacher} onChange={e => set('teacher', e.target.value)} placeholder="שם המורה" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">חדר</Label>
              <Input value={form.room} onChange={e => set('room', e.target.value)} placeholder="מספר חדר" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">קבוצה</Label>
            <Input value={form.group} onChange={e => set('group', e.target.value)} placeholder="לדוגמה: קבוצה א׳ / 5 יח׳" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">הערות</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="חופשי" />
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 -mx-4 -mb-4 mt-1 flex-row gap-2 border-t border-border/50 bg-card/95 px-4 py-3 backdrop-blur-sm sm:-mx-5 sm:-mb-5 sm:px-5 sm:justify-between">
          {isEdit ? (
            <Button variant="ghost" className="text-destructive hover:text-destructive gap-2" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="w-4 h-4" /> מחק
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
            <Button onClick={handleSubmit} disabled={!form.subject || (form.subject === 'אחר' && !form.customSubject)}>{isEdit ? 'עדכן' : 'הוסף'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Confirm delete dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">מחיקת שיעור</DialogTitle>
            <DialogDescription className="text-center pt-1">
              האם אתה בטוח שברצונך למחוק את השיעור
              {slot?.subject ? <> <span className="font-semibold text-foreground">"{slot.subject}"</span></> : null}
              {' '}ביום {day}, שיעור {period}?
              <br />
              פעולה זו אינה ניתנת לביטול.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} className="flex-1 sm:flex-none">
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={() => { setConfirmDelete(false); onDelete(slot.id); }}
              className="flex-1 sm:flex-none gap-2"
            >
              <Trash2 className="w-4 h-4" /> אישור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function extractGroup(notes = '') {
  if (!notes) return '';
  const m = notes.match(/^\[קבוצה: ([^\]]+)\]/);
  return m ? m[1] : '';
}
function stripGroup(notes = '') {
  if (!notes) return '';
  return notes.replace(/^\[קבוצה: [^\]]+\]\s*/, '');
}