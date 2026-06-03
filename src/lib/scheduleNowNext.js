import { base44 } from '@/api/base44Client';
import { findSlotForPeriod, getTodayDayType, getTodayHebrewName, loadBellSchedule, timeToMinutes } from '@/lib/bellSchedule';

function lessonsFromScheduleSlots(slots, periods) {
  const lessons = (periods || []).filter(period => period.kind === 'lesson');
  return lessons
    .map(period => {
      const slot = findSlotForPeriod(slots, period.period);
      if (!slot?.subject) return null;
      return {
        ...slot,
        start_time: slot.start_time || period.start_time || '',
        end_time: slot.end_time || period.end_time || '',
      };
    })
    .filter(slot => slot?.start_time)
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
}

export function resolveScheduleNowNext(slots, periods, now = new Date()) {
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const lessons = lessonsFromScheduleSlots(slots, periods);

  const current = lessons.find(slot => (
    slot.end_time && nowMins >= timeToMinutes(slot.start_time) && nowMins < timeToMinutes(slot.end_time)
  )) || null;

  const next = lessons.find(slot => timeToMinutes(slot.start_time) > nowMins && slot.id !== current?.id) || null;
  const remainingMins = current?.end_time
    ? timeToMinutes(current.end_time) - nowMins
    : next?.start_time
      ? timeToMinutes(next.start_time) - nowMins
      : 0;

  return { current, next, remainingMins };
}

export async function loadScheduleNowNextData(classId, now = new Date()) {
  if (!classId) return { slots: [], periods: [], current: null, next: null, remainingMins: 0 };

  const todayName = getTodayHebrewName();
  const dayType = getTodayDayType();
  const [slots, periods] = await Promise.all([
    base44.entities.ScheduleSlot.filter({ class_id: classId, day: todayName }),
    loadBellSchedule(dayType),
  ]);

  return {
    slots,
    periods,
    ...resolveScheduleNowNext(slots, periods, now),
  };
}