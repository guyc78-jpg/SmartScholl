import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, Pencil, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatStudentName } from '@/lib/studentName';

const severityOptions = ['קלה', 'בינונית', 'חמורה'];
const categoryOptions = ['התנהגות', 'למידה', 'נוכחות', 'תקשורת', 'אחר'];
const statusOptions = ['פתוח', 'בטיפול', 'סגור'];

const severityStyle = {
  'קלה': 'bg-primary/10 text-primary border-primary/20',
  'בינונית': 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
  'חמורה': 'bg-destructive/10 text-destructive border-destructive/20',
};

const EMPTY_FORM = {
  category: '',
  severity: '',
  description: '',
  treatment: '',
  status: '',
};

export default function DisciplineEventDialog({ event, open, onOpenChange, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM }));

  useEffect(() => {
    if (!event) return;
    setEditing(false);
    setForm({
      category: event.category || 'התנהגות',
      severity: event.severity || 'קלה',
      description: event.description || '',
      treatment: event.treatment || '',
      status: event.status || 'פתוח',
    });
  }, [event?.id]);

  if (!event) return null;

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const save = async (data = form) => {
    setSaving(true);
    await base44.entities.DisciplineEvent.update(event.id, data);
    toast.success('אירוע המשמעת עודכן');
    setSaving(false);
    setEditing(false);
    onChanged?.();
  };

  const markHandled = async () => {
    await save({ ...form, status: 'סגור' });
  };

  const remove = async () => {
    setSaving(true);
    await base44.entities.DisciplineEvent.delete(event.id);
    toast.success('אירוע המשמעת נמחק');
    setSaving(false);
    setDeleteOpen(false);
    onOpenChange(false);
    onChanged?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent dir="rtl" className="w-[calc(100vw-1rem)] max-w-2xl max-h-[88vh] overflow-y-auto text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">טיפול באירוע משמעת</DialogTitle>
            <DialogDescription className="text-right">
              מקור מרכזי לאירוע פתוח: פרטים, סטטוס ופעולות טיפול.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4" dir="rtl">
            <div className="rounded-xl border bg-card p-4 text-right">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-sm text-muted-foreground">תלמיד/ה</p>
                  <h3 className="text-lg font-bold leading-tight">{formatStudentName(event.student_name)}</h3>
                  <p className="text-xs text-muted-foreground mt-1 force-ltr">{event.date || 'ללא תאריך'} {event.time ? `· ${event.time}` : ''}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge variant="outline" className={severityStyle[event.severity] || severityStyle['קלה']}>
                    {event.severity || 'קלה'}
                  </Badge>
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                    {event.status || 'פתוח'}
                  </Badge>
                </div>
              </div>
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select value={form.category} onChange={e => set('category', e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-right">
                    {categoryOptions.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select value={form.severity} onChange={e => set('severity', e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-right">
                    {severityOptions.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select value={form.status} onChange={e => set('status', e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-right">
                    {statusOptions.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">תיאור האירוע</p>
                  <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="resize-none" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">פעולות טיפול</p>
                  <Textarea value={form.treatment} onChange={e => set('treatment', e.target.value)} rows={3} className="resize-none" placeholder="מה בוצע / מה נדרש להמשך..." />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl bg-muted/50 p-3 text-right">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">סוג האירוע</p>
                  <p className="text-sm font-medium">{event.category || 'לא צוין'}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3 text-right">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">תיאור</p>
                  <p className="text-sm whitespace-pre-wrap">{event.description || 'לא נוסף תיאור'}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3 text-right">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">פעולות טיפול</p>
                  <p className="text-sm whitespace-pre-wrap">{event.treatment || 'טרם תועד טיפול'}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {editing ? (
                <>
                  <Button onClick={() => save()} disabled={saving}>
                    <Save className="w-4 h-4" />
                    שמור
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                    <X className="w-4 h-4" />
                    ביטול
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={markHandled} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle2 className="w-4 h-4" />
                    סמן כטופל
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(true)} disabled={saving}>
                    <Pencil className="w-4 h-4" />
                    ערוך
                  </Button>
                  <Button variant="outline" onClick={() => setDeleteOpen(true)} disabled={saving} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                    מחק
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">למחוק את אירוע המשמעת?</AlertDialogTitle>
            <AlertDialogDescription className="text-right">האירוע יימחק ולא יוצג עוד בדשבורד.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
