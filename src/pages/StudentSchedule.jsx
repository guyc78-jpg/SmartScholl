import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { getStudentClassId, getStudentClassName } from '@/lib/studentProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import NowNextCard from '@/components/schedule/NowNextCard';
import { Calendar } from 'lucide-react';

const WEEK_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function StudentSchedule({ user }) {
  const classId = getStudentClassId(user, CLASS_ID);
  const className = getStudentClassName(user);
  const [slots, setSlots] = useState(null);
  const todayName = dayNames[new Date().getDay()];

  useEffect(() => {
    base44.entities.ScheduleSlot.filter({ class_id: classId }).then(setSlots);
  }, [classId]);

  if (!slots) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const byDay = WEEK_DAYS
    .map(day => ({ day, items: slots.filter(s => s.day === day).sort((a, b) => a.period - b.period) }))
    .filter(d => d.items.length > 0);

  return (
    <div className="p-4 lg:p-6 space-y-4 text-right max-w-3xl mx-auto" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">מערכת שעות</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{className ? `כיתה ${className}` : 'המערכת השבועית שלי'}</p>
      </div>

      <NowNextCard classId={classId} />

      {byDay.length === 0 && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">עדיין לא הוזנה מערכת שעות לכיתה.</CardContent></Card>
      )}

      {byDay.map(({ day, items }) => (
        <Card key={day} className={day === todayName ? 'border-primary/50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              יום {day}
              {day === todayName && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">היום</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {items.map(slot => (
                <div key={slot.id} className="flex items-center gap-3 py-1.5">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">{slot.period}</span>
                  <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{slot.start_time}–{slot.end_time}</span>
                  <span className="text-sm font-medium">{slot.subject}</span>
                  {slot.teacher && <span className="text-xs text-muted-foreground">· {slot.teacher}</span>}
                  {slot.room && <span className="text-xs text-muted-foreground">חדר {slot.room}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}