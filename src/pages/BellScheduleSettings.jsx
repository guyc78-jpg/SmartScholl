import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PageHeader from '@/components/ui/PageHeader';
import { Plus, Trash2, Save, RotateCcw, Bell, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  loadBellSchedule, saveBellSchedule,
  DEFAULT_SUN_THU, DEFAULT_FRI
} from '@/lib/bellSchedule';
import { hasApprovedRole } from '@/lib/roleUtils';

const KIND_LABEL = {
  pre_bell: 'צלצול מקדים',
  homeroom: 'בוקר טוב מחנך',
  lesson: 'שיעור',
  break: 'הפסקה',
};

function PeriodEditor({ periods, onChange }) {
  const setField = (idx, field, value) => {
    const next = periods.map((p, i) => i === idx ? { ...p, [field]: value } : p);
    onChange(next);
  };
  const remove = (idx) => onChange(periods.filter((_, i) => i !== idx));
  const add = () => onChange([...periods, { kind: 'lesson', label: 'שיעור', start_time: '08:00', end_time: '08:45' }]);

  return (
    <div className="space-y-2" dir="rtl">
      {periods.map((p, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 rounded-lg border border-border bg-card">
          <div className="col-span-12 sm:col-span-3">
            <Label className="text-xs">סוג</Label>
            <Select value={p.kind} onValueChange={(v) => setField(i, 'kind', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(KIND_LABEL).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-6 sm:col-span-2">
            <Label className="text-xs">מס׳ שיעור</Label>
            <Input
              type="number"
              min="1"
              value={p.period ?? ''}
              onChange={(e) => setField(i, 'period', e.target.value ? Number(e.target.value) : undefined)}
              disabled={p.kind !== 'lesson'}
              className="h-9"
            />
          </div>
          <div className="col-span-12 sm:col-span-3">
            <Label className="text-xs">תיאור</Label>
            <Input value={p.label || ''} onChange={(e) => setField(i, 'label', e.target.value)} className="h-9" />
          </div>
          <div className="col-span-6 sm:col-span-1.5">
            <Label className="text-xs">התחלה</Label>
            <Input type="time" value={p.start_time || ''} onChange={(e) => setField(i, 'start_time', e.target.value)} className="h-9" />
          </div>
          <div className="col-span-6 sm:col-span-1.5">
            <Label className="text-xs">סיום</Label>
            <Input type="time" value={p.end_time || ''} onChange={(e) => setField(i, 'end_time', e.target.value)} className="h-9" />
          </div>
          <div className="col-span-12 sm:col-span-1 flex sm:justify-end">
            <Button variant="ghost" size="icon" onClick={() => remove(i)} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={add} className="gap-2">
        <Plus className="w-4 h-4" /> הוסף שורה
      </Button>
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

  if (loading) return <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>;

  return (
    <div className="p-4 lg:p-6 space-y-4 text-right" dir="rtl">
      <PageHeader
        title="צלצולים והפסקות"
        subtitle="הגדר את שעות השיעורים, הצלצולים וההפסקות. הנתונים מסתנכרנים אוטומטית עם דשבורד התלמיד והמחנך."
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> לוח צלצולים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab} dir="rtl">
            <TabsList className="mb-4">
              <TabsTrigger value="sun_thu">ימים א׳–ה׳</TabsTrigger>
              <TabsTrigger value="fri">יום ו׳</TabsTrigger>
            </TabsList>
            <TabsContent value="sun_thu" className="space-y-3">
              <PeriodEditor periods={sunThu} onChange={setSunThu} />
              <div className="flex items-center gap-2 pt-2">
                <Button onClick={() => handleSave('sun_thu')} disabled={saving} className="gap-2">
                  <Save className="w-4 h-4" /> שמור
                </Button>
                <Button variant="outline" onClick={() => reset('sun_thu')} className="gap-2">
                  <RotateCcw className="w-4 h-4" /> ברירת מחדל
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="fri" className="space-y-3">
              <PeriodEditor periods={fri} onChange={setFri} />
              <div className="flex items-center gap-2 pt-2">
                <Button onClick={() => handleSave('fri')} disabled={saving} className="gap-2">
                  <Save className="w-4 h-4" /> שמור
                </Button>
                <Button variant="outline" onClick={() => reset('fri')} className="gap-2">
                  <RotateCcw className="w-4 h-4" /> ברירת מחדל
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}