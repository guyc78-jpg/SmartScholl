import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EVENT_TYPES } from '@/components/exams/eventConstants';
import { formatGrade } from '@/lib/schoolStructure';
import { detectConflicts } from '@/lib/examConflicts';
import ConflictWarnings from './ConflictWarnings';

function emptyForm(grades) {
  return {
    title: '', subject: '', type: 'מבחן', date: '', time: '',
    teacher: '', material: '', notes: '',
    audience_scope: 'grade', audience_grades: grades?.length ? [grades[0]] : [],
    audience_classes: [],
  };
}

export default function DivisionEventFormDialog({ open, onOpenChange, event, onSave, allowedGrades, classes, allEvents }) {
  const [form, setForm] = useState(emptyForm(allowedGrades));
  const [overrideReason, setOverrideReason] = useState('');
  const [confirmedOverride, setConfirmedOverride] = useState(false);

  useEffect(() => {
    setForm(event ? { ...emptyForm(allowedGrades), ...event } : emptyForm(allowedGrades));
    setOverrideReason('');
    setConfirmedOverride(false);
  }, [event, open]);

  const update = patch => { setForm(prev => ({ ...prev, ...patch })); setConfirmedOverride(false); };

  // כיתות לשכבה הנבחרת
  const gradeClasses = useMemo(() => {
    const g = form.audience_grades?.[0];
    return classes.filter(c => c.grade === g);
  }, [classes, form.audience_grades]);

  // אם בוחרים "כל השכבה" -> audience_classes ריק; אחרת בחירת כיתות ספציפיות
  const isWholeGrade = form.audience_scope === 'grade';

  const warnings = useMemo(() => detectConflicts(form, allEvents || []), [form, allEvents]);
  const blocking = warnings.length > 0;

  const canSave = form.title && form.date && form.audience_grades?.length > 0 &&
    (!blocking || (confirmedOverride && overrideReason.trim()));

  const handleSave = () => {
    const payload = { ...form };
    if (blocking && confirmedOverride && overrideReason.trim()) {
      payload.notes = `${form.notes ? form.notes + '\n' : ''}⚠ חריגה מאושרת: ${overrideReason.trim()}`;
    }
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader><DialogTitle>{event ? 'עריכת אירוע שכבתי' : 'הוספת אירוע / מבחן'}</DialogTitle></DialogHeader>
        <div className="space-y-4 text-right">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="כותרת *"><Input value={form.title} onChange={e => update({ title: e.target.value })} /></Field>
            <Field label="סוג">
              <Select value={form.type} onValueChange={type => update({ type })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">{EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="תאריך *"><Input type="date" value={form.date} onChange={e => update({ date: e.target.value })} /></Field>
            <Field label="שעה"><Input type="time" value={form.time} onChange={e => update({ time: e.target.value })} /></Field>
            <Field label="מקצוע/תחום"><Input value={form.subject} onChange={e => update({ subject: e.target.value })} /></Field>
            <Field label="מורה/אחראי"><Input value={form.teacher} onChange={e => update({ teacher: e.target.value })} /></Field>
          </div>

          {/* קהל יעד — שכבה בלבד מתוך החטיבה */}
          <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
            <Field label="שכבה *">
              <Select
                value={form.audience_grades?.[0] || ''}
                onValueChange={g => update({ audience_grades: [g], audience_classes: [] })}
              >
                <SelectTrigger><SelectValue placeholder="בחר/י שכבה" /></SelectTrigger>
                <SelectContent dir="rtl">
                  {allowedGrades.map(g => <SelectItem key={g} value={g}>שכבת {formatGrade(g)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="היקף">
              <Select value={form.audience_scope} onValueChange={scope => update({ audience_scope: scope, audience_classes: [] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="grade">כל כיתות השכבה</SelectItem>
                  <SelectItem value="class">כיתות נבחרות</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {!isWholeGrade && (
              <div className="space-y-1.5">
                <Label className="text-xs">בחירת כיתות</Label>
                <div className="flex flex-wrap gap-2">
                  {gradeClasses.length === 0 && <span className="text-xs text-muted-foreground">אין כיתות לשכבה זו</span>}
                  {gradeClasses.map(c => {
                    const selected = form.audience_classes?.includes(c.name);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => update({
                          audience_classes: selected
                            ? form.audience_classes.filter(n => n !== c.name)
                            : [...(form.audience_classes || []), c.name],
                        })}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors
                          ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'}`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Field label="חומר / הכנה"><Textarea value={form.material} onChange={e => update({ material: e.target.value })} rows={2} /></Field>
          <Field label="הערות"><Textarea value={form.notes} onChange={e => update({ notes: e.target.value })} rows={2} /></Field>

          {/* אזהרות התנגשות */}
          <ConflictWarnings warnings={warnings} />

          {blocking && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={confirmedOverride} onChange={e => setConfirmedOverride(e.target.checked)} className="w-4 h-4" />
                אני מאשר/ת חריגה למרות ההתנגשות
              </label>
              {confirmedOverride && (
                <Input placeholder="סיבת החריגה (חובה)" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
            <Button onClick={handleSave} disabled={!canSave}>{blocking ? 'שמור עם חריגה' : 'שמור'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}