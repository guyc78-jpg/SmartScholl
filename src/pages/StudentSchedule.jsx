import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { getStudentClassId, getStudentClassName } from '@/lib/studentProfile';
import { findClassRoomByName } from '@/lib/classAssignment';
import PageHeader from '@/components/ui/PageHeader';
import NowNextCard from '@/components/schedule/NowNextCard';
import WeeklyScheduleGrid from '@/components/schedule/WeeklyScheduleGrid';
import { loadBellSchedule, getTodayDayType, HEBREW_DAY_NAMES, getNowAndNext } from '@/lib/bellSchedule';

// בניית שורות שיעורים מתוך לוח הצלצולים — זהה לעמוד מערכת השעות של הצוות
function buildPeriodRows(bellPeriods) {
  const lessons = (bellPeriods || []).filter(p => p.kind === 'lesson').sort((a, b) => a.period - b.period);
  if (lessons.length === 0) {
    return Array.from({ length: 12 }, (_, i) => ({ period: i + 1, start_time: '', end_time: '', label: `שיעור ${i + 1}` }));
  }
  const max = Math.max(12, lessons[lessons.length - 1].period);
  const map = new Map(lessons.map(l => [l.period, l]));
  return Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    const found = map.get(n);
    return found
      ? { period: n, start_time: found.start_time, end_time: found.end_time, label: found.label || `שיעור ${n}` }
      : { period: n, start_time: '', end_time: '', label: `שיעור ${n}` };
  });
}

export default function StudentSchedule({ user }) {
  const classId = getStudentClassId(user, CLASS_ID);
  const fallbackClassName = getStudentClassName(user);
  const [slots, setSlots] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [activeClassId, setActiveClassId] = useState('');
  const [className, setClassName] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const todayDayName = HEBREW_DAY_NAMES[new Date().getDay()];

  // הדגשת השיעור הנוכחי — מתעדכן כל 30 שניות
  useEffect(() => {
    if (periods.length === 0) return;
    const fullPeriods = periods.filter(p => p.start_time).map(p => ({ ...p, kind: 'lesson' }));
    const tick = () => {
      const { current } = getNowAndNext(fullPeriods);
      setCurrentPeriod(current?.period || null);
    };
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [periods]);

  useEffect(() => { load(); }, [classId]);

  async function load() {
    setLoading(true);
    const dayType = getTodayDayType();
    const [bellPeriods, classRooms] = await Promise.all([
      loadBellSchedule(dayType === 'fri' ? 'sun_thu' : dayType),
      base44.entities.ClassRoom.list('-updated_date', 200),
    ]);
    const classRoom = classRooms.find(room => room.id === classId) || findClassRoomByName(classRooms, fallbackClassName);
    const resolvedClassId = classRoom?.id || classId;
    const data = await base44.entities.ScheduleSlot.filter({ class_id: resolvedClassId });
    setActiveClassId(resolvedClassId);
    setSlots(data);
    setPeriods(buildPeriodRows(bellPeriods));
    setClassName(classRoom?.name || fallbackClassName || '');
    setLoading(false);
  }

  const slotsByKey = useMemo(() => {
    const map = {};
    slots.forEach(s => { map[`${s.day}|${Number(s.period)}`] = s; });
    return map;
  }, [slots]);

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6 space-y-4" dir="rtl">
      <PageHeader
        title="מערכת שעות"
        subtitle={`לוח שבועי לפי הצלצולים — ימים א׳–ה׳${className ? ` · כיתה ${className}` : ''}`}
      />

      {/* כרטיס חכם מסונכרן עם הצלצולים */}
      <NowNextCard classId={activeClassId || classId} />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <WeeklyScheduleGrid
          periods={periods}
          slotsByKey={slotsByKey}
          todayDayName={todayDayName}
          currentPeriod={currentPeriod}
          canEdit={false}
          onCellClick={() => {}}
        />
      )}
    </div>
  );
}