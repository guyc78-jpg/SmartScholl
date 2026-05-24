// פירסור לוח שכבתי מקובץ Word (.docx) המסודר כטבלת שבועות.
// כל שורת טבלה = שבוע, כל תא = יום עם תאריך + מספר שורות אירועים.
import mammoth from 'mammoth';
import { normalizeEventType } from '@/components/exams/eventConstants';

const HEB_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const HEB_MONTHS = {
  'ינואר': 1, 'פברואר': 2, 'מרץ': 3, 'מארס': 3, 'אפריל': 4, 'מאי': 5, 'יוני': 6,
  'יולי': 7, 'אוגוסט': 8, 'ספטמבר': 9, 'אוקטובר': 10, 'נובמבר': 11, 'דצמבר': 12
};

// תאריך בפורמטים שונים: 24/5, 24.5.2026, 24-05-2026
const DATE_RE = /(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/;
const HEB_DATE_RE = new RegExp(`(\\d{1,2})\\s*ב?(${Object.keys(HEB_MONTHS).join('|')})\\s*(\\d{2,4})?`);

const TIME_RANGE_RE = /(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/;
const TIME_SINGLE_RE = /(\d{1,2}):(\d{2})/;

const cleanText = (s) => String(s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

const pad = (n) => String(n).padStart(2, '0');

function toISODate(d, m, y) {
  const year = y ? (String(y).length === 2 ? 2000 + Number(y) : Number(y)) : new Date().getFullYear();
  if (!d || !m) return '';
  return `${year}-${pad(m)}-${pad(d)}`;
}

function extractDateFromText(text) {
  const heb = text.match(HEB_DATE_RE);
  if (heb) return toISODate(heb[1], HEB_MONTHS[heb[2]], heb[3]);
  const m = text.match(DATE_RE);
  if (m) return toISODate(m[1], m[2], m[3]);
  return '';
}

function extractDayOfWeek(text) {
  for (const day of HEB_DAYS) {
    if (new RegExp(`יום\\s+${day}|^${day}\\b|\\s${day}\\b`).test(text)) return day;
  }
  return '';
}

function extractTimes(text) {
  const range = text.match(TIME_RANGE_RE);
  if (range) {
    return {
      time: `${pad(range[1])}:${range[2]}`,
      end_time: `${pad(range[3])}:${range[4]}`,
      cleaned: text.replace(range[0], '').trim()
    };
  }
  const single = text.match(TIME_SINGLE_RE);
  if (single) {
    return {
      time: `${pad(single[1])}:${single[2]}`,
      end_time: '',
      cleaned: text.replace(single[0], '').trim()
    };
  }
  return { time: '', end_time: '', cleaned: text };
}

// פיצול שורות בתוך תא לפי <br>, פסקאות, נקודות, מקפים
function splitCellLines(html) {
  const withBreaks = html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return withBreaks
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean);
}

function inferAudienceFromText(text) {
  const classes = Array.from(new Set((text.match(/(?:י|יא|יב)[׳'״"]?\s?\d+/g) || [])));
  if (classes.length) return { audience_scope: 'class', audience_classes: classes, audience_grades: [] };
  if (/\bיב\b/.test(text)) return { audience_scope: 'grade', audience_grades: ['יב'], audience_classes: [] };
  if (/\bיא\b/.test(text)) return { audience_scope: 'grade', audience_grades: ['יא'], audience_classes: [] };
  if (/\bי\b/.test(text)) return { audience_scope: 'grade', audience_grades: ['י'], audience_classes: [] };
  return { audience_scope: 'grade', audience_grades: ['יב'], audience_classes: [] };
}

function buildEvent({ rawLine, isoDate, dayOfWeek }) {
  const { time, end_time, cleaned } = extractTimes(rawLine);
  const title = cleaned || rawLine;
  const type = normalizeEventType(title);
  const audience = inferAudienceFromText(title);
  return {
    title,
    type,
    date: isoDate,
    day_of_week: dayOfWeek,
    time,
    end_time,
    subject: '',
    class_or_grade: '',
    teacher: '',
    material: '',
    notes: '',
    raw_text: rawLine,
    is_all_day: !time,
    audience_subjects: [],
    audience_tracks: [],
    audience_group_label: '',
    ...audience
  };
}

// נקה שורה משאריות תאריך כדי לא לקבל "24/5" כאירוע
function isJustDate(text) {
  const stripped = text.replace(DATE_RE, '').replace(HEB_DATE_RE, '').replace(/יום\s+\S+/, '').trim();
  return stripped.length < 2;
}

// פירסור תא לרשימת אירועים + תאים "דורשים בדיקה"
function parseCell(cellHtml) {
  const lines = splitCellLines(cellHtml);
  if (!lines.length) return { events: [], needsReview: [] };

  const joined = lines.join(' ');
  const isoDate = extractDateFromText(joined);
  const dayOfWeek = extractDayOfWeek(joined);

  const events = [];
  const needsReview = [];

  for (const line of lines) {
    if (isJustDate(line)) continue;
    if (HEB_DAYS.includes(line)) continue;

    if (!isoDate) {
      needsReview.push({ raw_text: line, reason: 'לא נמצא תאריך לתא' });
      continue;
    }

    events.push(buildEvent({ rawLine: line, isoDate, dayOfWeek }));
  }

  return { events, needsReview };
}

// פירסור HTML של mammoth → כל תאי הטבלאות
function parseTablesHtml(html) {
  const events = [];
  const needsReview = [];

  // חילוץ תאים: גם td וגם th
  const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let match;
  while ((match = cellRe.exec(html)) !== null) {
    const { events: cellEvents, needsReview: cellReview } = parseCell(match[1]);
    events.push(...cellEvents);
    needsReview.push(...cellReview);
  }

  return { events, needsReview };
}

export async function parseWordCalendarFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
  const { events, needsReview } = parseTablesHtml(html);

  // אם לא נמצאו טבלאות (משתמש הדביק טקסט חופשי) – נחזיר ריק כדי לתת ל-LLM לטפל.
  return { events, needsReview, hasTables: /<table/i.test(html) };
}

export function isWordFile(file) {
  const name = String(file?.name || '').toLowerCase();
  return name.endsWith('.docx') || name.endsWith('.doc');
}