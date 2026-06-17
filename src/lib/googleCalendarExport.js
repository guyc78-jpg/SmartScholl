function compactDate(date) {
  return String(date || '').replace(/-/g, '');
}

function addOneHour(time) {
  const [hour = '0', minute = '0'] = String(time || '08:00').split(':');
  const nextHour = (Number(hour) + 1) % 24;
  return `${String(nextHour).padStart(2, '0')}${String(minute).padStart(2, '0')}00`;
}

function compactTime(time) {
  const [hour = '8', minute = '0'] = String(time || '08:00').split(':');
  return `${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}00`;
}

export function buildGoogleCalendarExamUrl(exam) {
  const date = compactDate(exam?.date);
  const start = exam?.time ? `${date}T${compactTime(exam.time)}` : date;
  const end = exam?.time ? `${date}T${exam?.end_time ? compactTime(exam.end_time) : addOneHour(exam.time)}` : date;
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