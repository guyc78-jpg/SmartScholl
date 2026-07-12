export const SCHOOL_TIME_ZONE = 'Asia/Jerusalem';

function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
}

export function getLocalDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const { year, month, day } = values;
  return `${year}-${month}-${day}`;
}

export function getSchoolTimeString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SCHOOL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}

export function formatSchoolDate(value, options = {}) {
  if (!value) return '';
  const date = parseDateOnly(value) || new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('he-IL', {
    ...options,
    timeZone: SCHOOL_TIME_ZONE,
  }).format(date);
}

export function getSchoolWeekdayIndex(value = new Date()) {
  const date = parseDateOnly(value) || new Date(value);
  if (Number.isNaN(date.getTime())) return -1;
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_TIME_ZONE,
    weekday: 'short',
  }).format(date);
  return ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 })[weekday] ?? -1;
}

export function differenceInDateStrings(later, earlier) {
  const toUtc = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : Number.NaN;
  };
  const difference = toUtc(later) - toUtc(earlier);
  return Number.isFinite(difference) ? Math.round(difference / 86_400_000) : Number.NaN;
}

export function addDaysToDateString(dateString, days) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString || ''));
  if (!match) return '';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}
