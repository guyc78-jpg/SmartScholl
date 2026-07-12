import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addDaysToDateString,
  differenceInDateStrings,
  formatSchoolDate,
  getLocalDateString,
  getSchoolTimeString,
  getSchoolWeekdayIndex,
} from '../src/lib/dateUtils.js';
import { detectConflicts } from '../src/lib/examConflicts.js';
import { buildGoogleCalendarExamUrl } from '../src/lib/googleCalendarExport.js';
import { validateImageFile } from '../src/lib/fileValidation.js';

test('school date is calculated in Asia/Jerusalem, not in the device time zone', () => {
  assert.equal(getLocalDateString(new Date('2026-07-11T20:30:00.000Z')), '2026-07-11');
  assert.equal(getLocalDateString(new Date('2026-07-11T21:30:00.000Z')), '2026-07-12');
});

test('school clock and date formatting use Asia/Jerusalem', () => {
  const instant = new Date('2026-07-11T21:30:00.000Z');
  assert.equal(getSchoolTimeString(instant), '00:30');
  assert.match(formatSchoolDate('2026-07-12'), /12\.7\.2026/);
  assert.equal(formatSchoolDate('not-a-date'), '');
  assert.equal(getSchoolWeekdayIndex('2026-07-12'), 0);
  assert.equal(differenceInDateStrings('2026-07-12', '2026-07-10'), 2);
});

test('date-only arithmetic remains stable across month and leap-year boundaries', () => {
  assert.equal(addDaysToDateString('2026-01-31', 1), '2026-02-01');
  assert.equal(addDaysToDateString('2024-02-28', 1), '2024-02-29');
  assert.equal(addDaysToDateString('invalid', 1), '');
});

test('all-day Google Calendar events use an exclusive end date', () => {
  const url = new URL(buildGoogleCalendarExamUrl({ date: '2026-07-12', title: 'מבחן' }));
  assert.equal(url.searchParams.get('dates'), '20260712/20260713');
  assert.equal(url.searchParams.get('ctz'), 'Asia/Jerusalem');
});

test('timed Google Calendar events crossing midnight advance the end date', () => {
  const url = new URL(buildGoogleCalendarExamUrl({
    date: '2026-07-12',
    title: 'אירוע לילה',
    time: '23:30',
    end_time: '00:15',
  }));
  assert.equal(url.searchParams.get('dates'), '20260712T233000/20260713T001500');
});

test('timed events without an explicit end last one hour', () => {
  const url = new URL(buildGoogleCalendarExamUrl({
    date: '2026-07-12',
    title: 'מבחן',
    time: '08:30',
  }));
  assert.equal(url.searchParams.get('dates'), '20260712T083000/20260712T093000');
});

test('school-wide exams conflict with a scoped exam on the same day', () => {
  const warnings = detectConflicts({
    id: 'candidate',
    title: 'מבחן מתמטיקה',
    type: 'מבחן',
    date: '2026-07-12',
    audience_classes: ['י1'],
  }, [{
    id: 'school-exam',
    title: 'מבחן בית ספרי',
    type: 'מבחן',
    date: '2026-07-12',
    audience_scope: 'school',
  }]);

  assert.ok(warnings.some(warning => warning.type === 'same_day'));
});

test('weekly overload is calculated from date-only values', () => {
  const candidate = {
    id: 'candidate',
    title: 'מבחן שלישי',
    type: 'מבחן',
    date: '2026-07-16',
    audience_grades: ['י'],
  };
  const existing = [
    { id: 'one', title: 'מבחן ראשון', type: 'מבחן', date: '2026-07-12', audience_grades: ['י'] },
    { id: 'two', title: 'מבחן שני', type: 'מבחן', date: '2026-07-14', audience_grades: ['י'] },
  ];

  const warnings = detectConflicts(candidate, existing);
  assert.ok(warnings.some(warning => warning.type === 'week_overload'));
});

test('profile uploads reject non-image and oversized files', () => {
  assert.equal(validateImageFile({ size: 1_000, type: 'image/png' }), '');
  assert.match(validateImageFile({ size: 1_000, type: 'image/svg+xml' }), /JPG/);
  assert.match(validateImageFile({ size: 4 * 1024 * 1024, type: 'image/png' }), /3MB/);
});
