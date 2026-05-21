import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import PageHeader from '@/components/ui/PageHeader';
import { Plus, Trash2, Save, RotateCcw, Bell, BookOpen, Coffee, Sunrise, AlertTriangle, Copy, CircleDot } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  loadBellSchedule, saveBellSchedule,
  DEFAULT_SUN_THU, DEFAULT_FRI
} from '@/lib/bellSchedule';
import { hasApprovedRole } from '@/lib/roleUtils';

const KIND_META = {
  lesson:   { label: 'שיעור',       icon: BookOpen, color: 'text-primary' },
  break:    { label: 'הפסקה',       icon: Coffee,   color: 'text-amber-600 dark:text-amber-400' },
  homeroom: { label: 'בוקר טוב',    icon: Sunrise,  color: 'text-sky-600 dark:text-sky-400' },
  pre_bell: { label: 'צלצול מקדים', icon: Bell,     color: 'text-muted-foreground' },
};

function KindChip({ value, onChange }) {
  const meta = KIND_META[value] || KIND_META.lesson;
  const Icon = meta.icon;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          'h-7 w-[118px] sm:w-[132px] px-2.5 rounded-full border bg-muted/60 hover:bg-muted',
          'text-[11px] font-medium gap-1 [&>svg:last-child]:hidden'
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center">
          <span className="whitespace-nowrap">{meta.label}</span>
          <Icon className={cn('w-3 h-3 flex-shrink-0', meta.color)} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(KIND_META).map(([k, m]) => {
          const I = m.icon;
          return (
            <SelectItem key={k} value={k}>
              <div className="flex items-center gap-2">
                <I className={cn('w-3.5 h-3.5', m.color)} />
                <span>{m.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

// Compute lesson number for a given row (only counts kind="lesson" rows)
function computeLessonNumber(periods, idx) {
  if (periods[idx]?.kind !== 'lesson') return null;
  let n = 0;
  for (let i = 0; i <= idx; i++) if (periods[i]?.kind === 'lesson') n++;
  return n;
}

function PeriodRow({ period, lessonNumber, isActive, onChange, onRemove }) {
  const set = (field, value) => onChange({ ...period, [field]: value });

  return (
    <div
      className={cn(
        'relative flex items-center gap-1.5 sm:gap-2 px-1.5 h-10 rounded-md transition-colors',
        isActive
          ? 'bg-primary/10 ring-1 ring-primary/40 shadow-sm'
          : 'hover:bg-muted/40'
      )}
    >
      {isActive && (
        <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary" />
      )}

      {/* Row index — lesson number, or live dot when active */}
      <div className={cn(
        'w-6 flex items-center justify-center text-[11px] font-bold tabular-nums flex-shrink-0',
        isActive ? 'text-primary' : (lessonNumber ? 'text-primary' : 'text-transparent')
      )}>
        {isActive ? (
          <CircleDot className="w-3.5 h-3.5 text-primary animate-pulse" />
        ) : (
          lessonNumber ?? '·'
        )}
      </div>

      <KindChip value={period.kind} onChange={(v) => set('kind', v)} />

      <div className="flex-1 min-w-0" />

      <Input
        type="time"
        value={period.start_time || ''}
        onChange={(e) => set('start_time', e.target.value)}
        className="h-7 w-[72px] sm:w-[82px] text-[11px] sm:text-[12px] force-ltr px-1.5 flex-shrink-0"
      />

      <Input
        type="time"
        value={period.end_time || ''}
        onChange={(e) => set('end_time', e.target.value)}
        className="h-7 w-[72px] sm:w-[82px] text-[11px] sm:text-[12px] force-ltr px-1.5 flex-shrink-0"
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function ColumnHeaders() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 pb-1.5 mb-1 border-b border-border/60 text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
      <div className="w-6 text-center flex-shrink-0">מס׳</div>
      <div className="w-[118px] sm:w-[132px] text-center flex-shrink-0">סוג</div>
      <div className="flex-1 min-w-0" />
      <div className="w-[72px] sm:w-[82px] text-center flex-shrink-0">התחלה</div>
      <div className="w-[72px] sm:w-[82px] text-center flex-shrink-0">סיום</div>
      <div className="w-7 text-center flex-shrink-0">מחק</div>
    </div>
  );
}

function PeriodEditor({ periods, onChange, activeIndex, onRequestRemove }) {
  const update = (idx, next) => onChange(periods.map((p, i) => i === idx ? next : p));
  const add = () => onChange([
    ...periods,
    { kind: 'lesson', start_time: '08:00', end_time: '08:45' }
  ]);

  return (
    <div dir="rtl">
      <ColumnHeaders />
      <div className="space-y-0.5">
        {periods.map((p, i) => (
          <PeriodRow
            key={i}
            period={p}
            lessonNumber={computeLessonNumber(periods, i)}
            isActive={activeIndex === i}
            onChange={(next) => update(i, next)}
            onRemove={() => onRequestRemove(i)}
          />
        ))}
      </div>
      <button
        onClick={add}
        className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 hover:text-primary text-muted-foreground text-[12px] font-medium transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> הוסף שורה
      </button>
    </div>
  );
}

// Find currently active row by clock (HH:MM within [start,end))
function findActiveIndex(periods) {
  if (!periods?.length) return -1;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  return periods.findIndex(p => p.start_time && p.end_time && hhmm >= p.start_time && hhmm < p.end_time);
}

function DayPanel({ periods, onChange, onSave, onReset, saving, isCurrentDay, onRequestRemove }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isCurrentDay) return;
    const t = setInterval(() => setTick(x => x + 1), 30000);
    return () => clearInterval(t);
  }, [isCurrentDay]);
  const activeIndex = useMemo(
    () => isCurrentDay ? findActiveIndex(periods) : -1,
    [periods, isCurrentDay, tick]
  );

  return (
    <div className="space-y-3">
      <PeriodEditor
        periods={periods}
        onChange={onChange}
        activeIndex={activeIndex}
        onRequestRemove={onRequestRemove}
      />
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/60">
        <Button onClick={onSave} disabled={saving} className="h-9 text-[12px] font-semibold gap-1.5">
          <Save className="w-4 h-4" /> שמור שינויים
        </Button>
        <Button variant="outline" onClick={onReset} className="h-9 text-[12px] font-medium gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> ברירת מחדל
        </Button>
      </div>
    </div>
  );
}

export default function BellScheduleSettings({ user, role }) {
  const isAdmin = role === 'admin' || hasApprovedRole(user, 'admin');
  const [sunThu, setSunThu] = useState([]);
  const [fri, setFri] = useState([]);
  const [tab, setTab] = useState('sun_thu'); // Default to sun_thu
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null); // { dayType, index, period }
  const [confirmDuplicate, setConfirmDuplicate] = useState(null); // { from, to }

  useEffect(() => { load(); }, []);

  // Current day is Friday in JS getDay() === 5
  const today = new Date().getDay();
  const isCurrentDay = (dayType) =>
    (dayType === 'fri' && today === 5) || (dayType === 'sun_thu' && today >= 0 && today <= 4);

  async function load() {
    setLoading(true);
    const [a, b] = await Promise.all([
      loadBellSchedule('sun_thu'),
      loadBellSchedule('fri'),
    ]);
    setSunThu(a);
    setFri(b);
    setLoading(false);
  }

  async function handleSave(dayType) {
    setSaving(true);
    const periods = dayType === 'fri' ? fri : sunThu;
    await saveBellSchedule(dayType, periods);
    toast.success('לוח הצלצולים נשמר');
    setSaving(false);
  }

  function reset(dayType) {
    if (dayType === 'fri') setFri([...DEFAULT_FRI]);
    else setSunThu([...DEFAULT_SUN_THU]);
    toast.info('שוחזרה ברירת המחדל (לא נשמר עדיין)');
  }

  function requestRemove(dayType, index) {
    const list = dayType === 'fri' ? fri : sunThu;
    setConfirmDelete({ dayType, index, period: list[index] });
  }

  function confirmRemove() {
    if (!confirmDelete) return;
    const { dayType, index } = confirmDelete;
    if (dayType === 'fri') setFri(fri.filter((_, i) => i !== index));
    else setSunThu(sunThu.filter((_, i) => i !== index));
    setConfirmDelete(null);
  }

  function requestDuplicate(from) {
    const to = from === 'sun_thu' ? 'fri' : 'sun_thu';
    setConfirmDuplicate({ from, to });
  }

  function performDuplicate() {
    if (!confirmDuplicate) return;
    const { from, to } = confirmDuplicate;
    const source = from === 'fri' ? fri : sunThu;
    const copy = source.map(p => ({ ...p }));
    if (to === 'fri') setFri(copy); else setSunThu(copy);
    toast.success('הצלצולים שוכפלו (זכור לשמור)');
    setConfirmDuplicate(null);
    setTab(to);
  }

  const dayLabel = (d) => d === 'fri' ? 'יום ו׳' : 'ימים א׳–ה׳';

  if (!isAdmin) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 text-center" dir="rtl">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-lg font-semibold mb-1">גישה מוגבלת</h2>
        <p className="text-muted-foreground text-sm">מסך זה זמין למנהל בלבד.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/>
      </div>
    );
  }

  const deleteMeta = confirmDelete ? KIND_META[confirmDelete.period?.kind] : null;

  return (
    <div className="p-3 lg:p-5 max-w-3xl mx-auto space-y-3 text-right" dir="rtl">
      <PageHeader
        title="צלצולים והפסקות"
        subtitle="הגדר שעות שיעורים, צלצולים והפסקות. הנתונים מסונכרנים אוטומטית בכל המערכת."
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
         <Tabs value={tab} onValueChange={setTab} dir="rtl">
           <div className="flex justify-center pt-3 pb-0 px-3">
             <TabsList className="h-9 p-0.5 bg-muted/60 w-fit">
               <TabsTrigger value="fri" className="h-8 px-5 text-[12px] font-medium">יום ו׳</TabsTrigger>
               <TabsTrigger value="sun_thu" className="h-8 px-5 text-[12px] font-medium">ימים א׳–ה׳</TabsTrigger>
             </TabsList>
           </div>
          <div className="p-3">
            <TabsContent value="sun_thu" className="mt-0">
              <DayPanel
                periods={sunThu}
                onChange={setSunThu}
                onSave={() => handleSave('sun_thu')}
                onReset={() => reset('sun_thu')}
                onRequestRemove={(i) => requestRemove('sun_thu', i)}
                saving={saving}
                isCurrentDay={isCurrentDay('sun_thu')}
              />
            </TabsContent>
            <TabsContent value="fri" className="mt-0">
              <DayPanel
                periods={fri}
                onChange={setFri}
                onSave={() => handleSave('fri')}
                onReset={() => reset('fri')}
                onRequestRemove={(i) => requestRemove('fri', i)}
                saving={saving}
                isCurrentDay={isCurrentDay('fri')}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">מחיקת שורה</DialogTitle>
            <DialogDescription className="text-center pt-1">
              האם למחוק את{' '}
              <span className="font-semibold text-foreground">
                {deleteMeta?.label || 'השורה'}
              </span>
              {confirmDelete?.period?.start_time && (
                <> בשעה <span className="force-ltr font-semibold text-foreground">{confirmDelete.period.start_time}</span></>
              )}
              ?<br />פעולה זו אינה ניתנת לביטול.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="flex-1 sm:flex-none">
              ביטול
            </Button>
            <Button variant="destructive" onClick={confirmRemove} className="flex-1 sm:flex-none gap-2">
              <Trash2 className="w-4 h-4" /> מחק
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate day confirmation */}
      <Dialog open={!!confirmDuplicate} onOpenChange={(o) => !o && setConfirmDuplicate(null)}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Copy className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-center">שכפול לוח צלצולים</DialogTitle>
            <DialogDescription className="text-center pt-1">
              להעתיק את כל הצלצולים מ
              <span className="font-semibold text-foreground"> {dayLabel(confirmDuplicate?.from)} </span>
              אל
              <span className="font-semibold text-foreground"> {dayLabel(confirmDuplicate?.to)}</span>?<br />
              הצלצולים הקיימים ביעד יוחלפו.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setConfirmDuplicate(null)} className="flex-1 sm:flex-none">
              ביטול
            </Button>
            <Button onClick={performDuplicate} className="flex-1 sm:flex-none gap-2">
              <Copy className="w-4 h-4" /> שכפל
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}