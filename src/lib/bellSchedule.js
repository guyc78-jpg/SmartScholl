// Bell schedule helpers — defaults match the school's official לוח צלצולים תשפ״ג
// and runtime helpers for "now / next" detection.

import { base44 } from '@/api/base44Client';
import { SCHOOL_TIME_ZONE } from '@/lib/dateUtils';

export const DEFAULT_SUN_THU = [
  { kind: 'pre_bell', label: 'צלצול מקדים', start_time: '08:10', end_time: '08:15' },
  { kind: 'homeroom', label: 'בוקר טוב מחנך', start_time: '08:15', end_time: '08:25' },
  { kind: 'lesson', period: 1, label: 'שיעור 1', start_time: '08:15', end_time: '09:05' },
  { kind: 'lesson', period: 2, label: 'שיעור 2', start_time: '09:05', end_time: '09:50' },
  { kind: 'break', label: 'הפסקה', start_time: '09:50', end_time: '10:15' },
  { kind: 'lesson', period: 3, label: 'שיעור 3', start_time: '10:15', end_time: '11:00' },
  { kind: 'lesson', period: 4, label: 'שיעור 4', start_time: '11:00', end_time: '11:45' },
  { kind: 'break', label: 'הפסקה', start_time: '11:45', end_time: '12:05' },
  { kind: 'lesson', period: 5, label: 'שיעור 5', start_time: '12:05', end_time: '12:50' },
  { kind: 'lesson', period: 6, label: 'שיעור 6', start_time: '12:50', end_time: '13:35' },
  { kind: 'break', label: 'הפסקה', start_time: '13:35', end_time: '13:45' },
  { kind: 'lesson', period: 7, label: 'שיעור 7', start_time: '13:45', end_time: '14:30' },
  { kind: 'break', label: 'הפסקה', start_time: '14:30', end_time: '14:35' },
  { kind: 'lesson', period: 8, label: 'שיעור 8', start_time: '14:35', end_time: '15:20' },
  { kind: 'break', label: 'הפסקה', start_time: '15:20', end_time: '15:25' },
  { kind: 'lesson', period: 9, label: 'שיעור 9', start_time: '15:25', end_time: '16:10' },
  { kind: 'lesson', period: 10, label: 'שיעור 10', start_time: '16:10', end_time: '16:55' },
  { kind: 'lesson', period: 11, label: 'שיעור 11', start_time: '16:55', end_time: '17:40' },
  { kind: 'lesson', period: 12, label: 'שיעור 12', start_time: '17:40', end_time: '18:25' },
];

export const DEFAULT_FRI = [
  { kind: 'pre_bell', label: 'צלצול מקדים', start_time: '08:10', end_time: '08:15' },
  { kind: 'homeroom', label: 'בוקר טוב מחנך', start_time: '08:15', end_time: '08:25' },
  { kind: 'lesson', period: 1, label: 'שיעור 1', start_time: '08:15', end_time: '09:05' },
  { kind: 'lesson', period: 2, label: 'שיעור 2', start_time: '09:05', end_time: '09:50' },
  { kind: 'break', label: 'הפסקה', start_time: '09:50', end_time: '10:15' },
  { kind: 'lesson', period: 3, label: 'שיעור 3', start_time: '10:15', end_time: '11:00' },
  { kind: 'lesson', period: 4, label: 'שיעור 4', start_time: '11:00', end_time: '11:45' },
  { kind: 'break', label: 'הפסקה', start_time: '11:45', end_time: '11:50' },
  { kind: 'lesson', period: 5, label: 'שיעור 5', start_time: '11:50', end_time: '12:35' },
  { kind: 'lesson', period: 6, label: 'שיעור 6', start_time: '12:35', end_time: '13:20' },
  { kind: 'break', label: 'הפסקה', start_time: '13:20', end_time: '13:25' },
  { kind: 'lesson', period: 7, label: 'שיעור 7', start_time: '13:25', end_time: '14:10' },
];

export const HEBREW_DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// 5 = Friday, 6 = Saturday — Friday uses special schedule
function getSchoolWeekday(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_TIME_ZONE,
    weekday: 'short',
  }).format(date);
}

function getSchoolClockMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, Number(part.value)]));
  return values.hour * 60 + values.minute;
}

export function getTodayDayType(date = new Date()) {
  const weekday = getSchoolWeekday(date);
  if (weekday === 'Sat') return 'closed';
  return weekday === 'Fri' ? 'fri' : 'sun_thu';
}

export function getTodayHebrewName(date = new Date()) {
  const indexByWeekday = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return HEBREW_DAY_NAMES[indexByWeekday[getSchoolWeekday(date)]];
}

// HH:MM -> minutes since midnight
export function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToHHMM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function formatRemaining(mins) {
  if (mins <= 0) return 'הסתיים';
  if (mins < 1) return 'פחות מדקה';
  if (mins < 60) return `${mins} ד׳`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}:${m.toString().padStart(2, '0')} שע׳` : `${h} שע׳`;
}

// Returns { current, next, remainingMins } from a periods list at a given Date.
export function getNowAndNext(periods, now = new Date()) {
  if (getTodayDayType(now) === 'closed') return { current: null, next: null, remainingMins: 0 };
  if (!periods || periods.length === 0) return { current: null, next: null, remainingMins: 0 };
  const nowMins = getSchoolClockMinutes(now);

  // Sort lessons + breaks (skip pre_bell/homeroom for "current lesson" framing? we still include all)
  const sorted = [...periods].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  let current = null;
  let next = null;

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const start = timeToMinutes(p.start_time);
    const end = timeToMinutes(p.end_time || p.start_time);
    if (nowMins >= start && nowMins < end) {
      current = p;
      // Next = next lesson after this one (prefer lesson over break)
      const afterCurrent = sorted.slice(i + 1);
      next = afterCurrent.find(x => x.kind === 'lesson') || afterCurrent[0] || null;
      return { current, next, remainingMins: end - nowMins };
    }
    if (nowMins < start && !next) {
      next = p;
    }
  }
  // No current — return time-to-next
  if (next) {
    const remainingMins = timeToMinutes(next.start_time) - nowMins;
    return { current: null, next, remainingMins };
  }
  return { current: null, next: null, remainingMins: 0 };
}

// Load schedule from DB; fallback to defaults if not configured yet.
let _cache = {
  sun_thu: { periods: null, ts: 0 },
  fri: { periods: null, ts: 0 },
};
const CACHE_TTL = 30_000;

export async function loadBellSchedule(dayType) {
  const now = Date.now();
  const cached = _cache[dayType];
  if (cached?.periods && now - cached.ts < CACHE_TTL) return cached.periods;
  const records = await base44.entities.BellSchedule.filter({ day_type: dayType }).catch(() => []);
  let periods;
  if (records && records[0] && Array.isArray(records[0].periods) && records[0].periods.length > 0) {
    periods = records[0].periods;
  } else {
    periods = dayType === 'fri' ? DEFAULT_FRI : DEFAULT_SUN_THU;
  }
  _cache[dayType] = { periods, ts: now };
  return periods;
}

export function invalidateBellCache() {
  _cache = {
    sun_thu: { periods: null, ts: 0 },
    fri: { periods: null, ts: 0 },
  };
}

// Save (upsert) — admin only
export async function saveBellSchedule(dayType, periods, label) {
  const existing = await base44.entities.BellSchedule.filter({ day_type: dayType });
  const data = { day_type: dayType, periods, label: label || (dayType === 'fri' ? 'יום ו׳' : 'ימים א׳-ה׳') };
  if (existing[0]) {
    await base44.entities.BellSchedule.update(existing[0].id, data);
  } else {
    await base44.entities.BellSchedule.create(data);
  }
  invalidateBellCache();
}

// Merge a lesson period from BellSchedule with the user's ScheduleSlot for that period,
// to enrich "current lesson" with subject/teacher/room.
export function findSlotForPeriod(slots, period) {
  if (!slots || !period) return null;
  return slots.find(s => Number(s.period) === Number(period)) || null;
}
