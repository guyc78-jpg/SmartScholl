import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PageHeader from '@/components/ui/PageHeader';
import { Plus, Trash2, Save, RotateCcw, Bell, BookOpen, Coffee, Sunrise, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  loadBellSchedule, saveBellSchedule,
  DEFAULT_SUN_THU, DEFAULT_FRI
} from '@/lib/bellSchedule';
import { hasApprovedRole } from '@/lib/roleUtils';

const KIND_META = {
  lesson:   { label: 'שיעור',         icon: BookOpen, color: 'text-primary'      },
  break:    { label: 'הפסקה',         icon: Coffee,   color: 'text-amber-600 dark:text-amber-400' },
  homeroom: { label: 'בוקר טוב',      icon: Sunrise,  color: 'text-sky-600 dark:text-sky-400' },
  pre_bell: { label: 'צלצול מקדים',   icon: Bell,     color: 'text-muted-foreground' },
};

function KindChip({ value, onChange }) {
  const meta = KIND_META[value] || KIND_META.lesson;
  const Icon = meta.icon;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          'h-7 w-[92px] sm:w-28 px-2 rounded-full border bg-muted/60 hover:bg-muted',
          'text-[11px] sm:text-[12px] font-medium gap-1 [&>svg:last-child]:hidden'
        )}
      >
        <div className="flex items-center gap-1 min-w-0 flex-1 justify-center">
          <Icon className={cn('w-3 h-3 flex-shrink-0', meta.color)} />
          <span className="truncate">{meta.label}</span>
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

function PeriodRow({ period, index, onChange, onRemove }) {
  const set = (field, value) => onChange({ ...period, [field]: value });
  const isLesson = period.kind === 'lesson';

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 py-1 rounded-md hover:bg-muted/40 group transition-colors">
      {/* Row number */}
      <div className="w-5 text-center text-[10px] sm:text-[11px] font-bold text-muted-foreground/60 tabular-nums flex-shrink-0">
        {index + 1}
      </div>

      {/* Kind chip - uniform size */}
      <KindChip value={period.kind} onChange={(v) => set('kind', v)} />

      {/* Label - flexible */}
      <Input
        value={period.label || ''}
        onChange={(e) => set('label', e.target.value)}
        placeholder={isLesson ? `שיעור ${period.period || ''}` : KIND_META[period.kind]?.label}
        className="h-7 text-[12px] flex-1 min-w-0 px-2"
      />

      {/* Start time */}
      <Input
        type="time"
        value={period.start_time || ''}
        onChange={(e) => set('start_time', e.target.value)}
        className="h-7 w-[72px] sm:w-[82px] text-[11px] sm:text-[12px] force-ltr px-1.5 flex-shrink-0"
      />

      {/* End time */}
      <Input
        type="time"
        value={period.end_time || ''}
        onChange={(e) => set('end_time', e.target.value)}
        className="h-7 w-[72px] sm:w-[82px] text-[11px] sm:text-[12px] force-ltr px-1.5 flex-shrink-0"
      />

      {/* Delete */}
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

function PeriodEditor({ periods, onChange }) {
  const update = (idx, next) => onChange(periods.map((p, i) => i === idx ? next : p));
  const remove = (idx) => onChange(periods.filter((_, i) => i !== idx));
  const add = () => onChange([
    ...periods,
    { kind: 'lesson', label: '', start_time: '08:00', end_time: '08:45' }
  ]);

  return (
    <div className="space-y-0.5" dir="rtl">
      {periods.map((p, i) => (
        <PeriodRow
          key={i}
          period={p}
          index={i}
          onChange={(next) => update(i, next)}
          onRemove={() => remove(i)}
        />
      ))}
      <button
        onClick={add}
        className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 hover:text-primary text-muted-foreground text-[12px] font-medium transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> הוסף שורה
      </button>
    </div>
  );
}

function DayPanel({ dayType, periods, onChange, onSave, onReset, saving }) {
  return (
    <div className="space-y-3">
      <PeriodEditor periods={periods} onChange={onChange} />
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
        <Button variant="ghost" onClick={onReset} className="h-8 text-[12px] gap-1.5 text-muted-foreground hover:text-foreground">
          <RotateCcw className="w-3.5 h-3.5" /> ברירת מחדל
        </Button>
        <Button onClick={onSave} disabled={saving} className="h-8 text-[12px] gap-1.5">
          <Save className="w-3.5 h-3.5" /> שמור שינויים
        </Button>
      </div>
    </div>
  );
}

export default function BellScheduleSettings({ user, role }) {
  const isAdmin = role === 'admin' || hasApprovedRole(user, 'admin');
  const [sunThu, setSunThu] = useState([]);
  const [fri, setFri] = useState([]);
  const [tab, setTab] = useState('sun_thu');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

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

  return (
    <div className="p-3 lg:p-5 max-w-3xl mx-auto space-y-3 text-right" dir="rtl">
      <PageHeader
        title="צלצולים והפסקות"
        subtitle="הגדר שעות שיעורים, צלצולים והפסקות. הנתונים מסונכרנים אוטומטית בכל המערכת."
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Tabs value={tab} onValueChange={setTab} dir="rtl">
          <div className="px-3 pt-3">
            <TabsList className="h-9 p-0.5 bg-muted/60">
              <TabsTrigger value="sun_thu" className="h-8 px-4 text-[12px]">ימים א׳–ה׳</TabsTrigger>
              <TabsTrigger value="fri" className="h-8 px-4 text-[12px]">יום ו׳</TabsTrigger>
            </TabsList>
          </div>
          <div className="p-3">
            <TabsContent value="sun_thu" className="mt-0">
              <DayPanel
                dayType="sun_thu"
                periods={sunThu}
                onChange={setSunThu}
                onSave={() => handleSave('sun_thu')}
                onReset={() => reset('sun_thu')}
                saving={saving}
              />
            </TabsContent>
            <TabsContent value="fri" className="mt-0">
              <DayPanel
                dayType="fri"
                periods={fri}
                onChange={setFri}
                onSave={() => handleSave('fri')}
                onReset={() => reset('fri')}
                saving={saving}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}