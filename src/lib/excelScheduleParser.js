import * as XLSX from 'xlsx';
import { getBaseSubjectName, getUnitLabel } from '@/lib/scheduleLessonGrouping';

export const SCHEDULE_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

const DAY_COLUMNS = {
  1: 'ראשון',
  2: 'שני',
  3: 'שלישי',
  4: 'רביעי',
  5: 'חמישי',
  6: 'שישי',
};

const PERIOD_ROW_GROUPS = [
  { period: 1, rows: [5] },
  { period: 2, rows: [6, 7, 8] },
  { period: 3, rows: [9, 10, 11] },
  { period: 4, rows: [12, 13, 14, 15, 16] },
  { period: 5, rows: [17, 18, 19, 20, 21] },
  { period: 6, rows: [22, 23, 24, 25, 26] },
  { period: 7, rows: [27, 28, 29] },
  { period: 8, rows: [30, 31] },
];

const cellAddress = (rowNumber, columnIndex) => XLSX.utils.encode_cell({ r: rowNumber - 1, c: columnIndex });

export const cleanScheduleText = (value = '') => String(value || '')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n\s+/g, '\n')
  .replace(/\s+\n/g, '\n')
  .trim();

export const fixScheduleText = (value = '') => cleanScheduleText(value)
  .replace(/יח``ל/g, 'יח״ל')
  .replace(/יח''ל/g, 'יח״ל')
  .replace(/יח"ל/g, 'יח״ל')
  .replace(/\bיחל\b/g, 'יח״ל')
  .replace(/תנ``ך/g, 'תנ״ך')
  .replace(/תנ''ך/g, 'תנ״ך')
  .replace(/תנך/g, 'תנ״ך');

const splitLessonBlocks = (value = '') => cleanScheduleText(value)
  .split(/\n?-{4,}\n?/)
  .map(block => block.trim())
  .filter(Boolean);

function mergedSourceForCell(sheet, rowNumber, columnIndex) {
  const row = rowNumber - 1;
  for (const range of sheet['!merges'] || []) {
    if (row >= range.s.r && row <= range.e.r && columnIndex >= range.s.c && columnIndex <= range.e.c) {
      return { rowNumber: range.s.r + 1, columnIndex: range.s.c };
    }
  }
  return { rowNumber, columnIndex };
}

function readCellText(sheet, rowNumber, columnIndex) {
  const source = mergedSourceForCell(sheet, rowNumber, columnIndex);
  const cell = sheet[cellAddress(source.rowNumber, source.columnIndex)];
  return { text: cleanScheduleText(cell?.w ?? cell?.v ?? ''), sourceRow: source.rowNumber };
}

function parseLessonBlock(block, sourceRow) {
  const originalText = cleanScheduleText(block);
  const lines = originalText.split('\n').map(line => fixScheduleText(line)).filter(Boolean);
  if (lines.length < 2) return null;

  const rawSubject = lines[0];
  const roomText = lines.slice(2).join(' · ');
  const unitLabel = getUnitLabel({ subject: rawSubject, room: roomText, original_text: originalText });

  return {
    day: '',
    period: 1,
    start_time: '',
    end_time: '',
    subject: getBaseSubjectName(rawSubject),
    teacher: lines[1],
    room: [unitLabel, roomText].filter(Boolean).join(' · '),
    notes: '',
    original_text: originalText,
    source_row: sourceRow,
    is_parallel: false,
  };
}

export async function parseExcelScheduleFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets.schedule || workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { rows: [], diagnostics: { skippedEmptyRows: [], unparsedCells: [], duplicateCount: 0, parallelCount: 0 } };

  const rows = [];
  const unparsedCells = [];
  const skippedEmptyRows = [];
  const seen = new Set();
  let duplicateCount = 0;

  for (const group of PERIOD_ROW_GROUPS) {
    const groupHadContent = group.rows.some(rowNumber =>
      Object.keys(DAY_COLUMNS).some(columnIndex => readCellText(sheet, rowNumber, Number(columnIndex)).text)
    );
    if (!groupHadContent) {
      skippedEmptyRows.push(...group.rows);
      continue;
    }

    for (const rowNumber of group.rows) {
      let rowHadContent = false;
      for (const [columnIndexText, day] of Object.entries(DAY_COLUMNS)) {
        const cell = readCellText(sheet, rowNumber, Number(columnIndexText));
        if (!cell.text) continue;
        rowHadContent = true;
        for (const block of splitLessonBlocks(cell.text)) {
          const parsed = parseLessonBlock(block, cell.sourceRow);
          if (!parsed) {
            unparsedCells.push({ day, period: group.period, source_row: cell.sourceRow, original_text: block });
            continue;
          }
          const row = { ...parsed, day, period: group.period };
          const key = `${row.day}|${row.period}|${row.subject}|${row.teacher}|${row.room}|${row.original_text}`;
          if (seen.has(key)) {
            duplicateCount += 1;
            continue;
          }
          seen.add(key);
          rows.push(row);
        }
      }
      if (!rowHadContent) skippedEmptyRows.push(rowNumber);
    }
  }

  const countsBySlot = rows.reduce((map, row) => {
    const key = `${row.day}|${row.period}`;
    map[key] = (map[key] || 0) + 1;
    return map;
  }, {});

  const markedRows = rows.map(row => ({ ...row, is_parallel: countsBySlot[`${row.day}|${row.period}`] > 1 }));
  markedRows.sort((a, b) => {
    const periodDiff = Number(a.period) - Number(b.period);
    if (periodDiff) return periodDiff;
    return SCHEDULE_DAYS.indexOf(a.day) - SCHEDULE_DAYS.indexOf(b.day);
  });

  return {
    rows: markedRows,
    diagnostics: {
      skippedEmptyRows: [...new Set(skippedEmptyRows)].sort((a, b) => a - b),
      unparsedCells,
      duplicateCount,
      parallelCount: markedRows.filter(row => row.is_parallel).length,
    },
  };
}