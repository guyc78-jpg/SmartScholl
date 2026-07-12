import { addDaysToDateString } from './dateUtils.js';

function compactDate(date) {
  return String(date || '').replace(/-/g, '');
}

function compactTime(time) {
  const [hour = '8', minute = '0'] = String(time || '08:00').split(':');
  return `${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}00`;
}

function timeToMinutes(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(time || ''));
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function minutesToTime(minutes) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

export function buildGoogleCalendarExamUrl(exam) {
  const dateString = String(exam?.date || '');
  const date = compactDate(dateString);
  const startMinutes = timeToMinutes(exam?.time);
  let start;
  let end;

  if (startMinutes !== null) {
    const explicitEndMinutes = timeToMinutes(exam?.end_time);
    const rawEndMinutes = explicitEndMinutes ?? startMinutes + 60;
    const crossesMidnight = rawEndMinutes <= startMinutes || rawEndMinutes >= 1440;
    const endDate = compactDate(crossesMidnight ? addDaysToDateString(dateString, 1) : dateString);
    start = `${date}T${compactTime(minutesToTime(startMinutes))}`;
    end = `${endDate}T${compactTime(minutesToTime(rawEndMinutes))}`;
  } else {
    // Google Calendar treats the end date of an all-day event as exclusive.
    start = date;
    end = compactDate(addDaysToDateString(dateString, 1));
  }
  const details = [
    exam?.subject ? `מקצוע: ${exam.subject}` : '',
    exam?.material ? `חומר: ${exam.material}` : '',
    exam?.notes ? `הערות: ${exam.notes}` : '',
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: exam?.title || 'מבחן',
    dates: `${start}/${end}`,
    details,
    ctz: 'Asia/Jerusalem',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
