export function normalizeImportText(value = '') {
  return String(value)
    .replace(/[״"׳']/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function cleanValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeGender(value) {
  const clean = normalizeImportText(value);
  if (clean === 'נ' || clean === 'נקבה') return 'נקבה';
  if (clean === 'ז' || clean === 'זכר') return 'זכר';
  return '';
}

function normalizeClassName(value) {
  return cleanValue(value).replace(/\s+/g, '').replace(/"/g, '״').replace(/'/g, '׳');
}

function extractGrade(className, fallbackGrade = '') {
  const clean = normalizeClassName(className);
  if (clean.startsWith('י״ב') || clean.startsWith('יב')) return 'יב';
  if (clean.startsWith('י״א') || clean.startsWith('יא')) return 'יא';
  if (clean.startsWith('י')) return 'י';
  if (clean.startsWith('ט')) return 'ט';
  if (clean.startsWith('ח')) return 'ח';
  if (clean.startsWith('ז')) return 'ז';
  return fallbackGrade;
}

function findColumn(headers, options) {
  const normalizedOptions = options.map(normalizeImportText);
  return headers.findIndex(header => {
    const normalizedHeader = normalizeImportText(header);
    return normalizedOptions.some(option => normalizedHeader === option || normalizedHeader.includes(option));
  });
}

export function parseStudentsWorksheetRows(rows, { classId, classRoom } = {}) {
  const headerIndex = rows.findIndex(row => {
    const normalized = row.map(normalizeImportText).join('|');
    return normalized.includes('שםפרטי') && normalized.includes('שםמשפחה');
  });

  if (headerIndex === -1) return [];

  const headers = rows[headerIndex];
  const indexes = {
    firstName: findColumn(headers, ['שם פרטי']),
    lastName: findColumn(headers, ['שם משפחה']),
    fullName: findColumn(headers, ['שם מלא']),
    id: findColumn(headers, ['ת.ז', 'תז', 'מספר תלמיד']),
    email: findColumn(headers, ['דואל', 'דוא״ל', 'מייל', 'email']),
    phone: findColumn(headers, ['נייד', 'טלפון', 'phone']),
    gender: findColumn(headers, ['מין']),
    className: findColumn(headers, ['כיתה']),
    birthDate: findColumn(headers, ['ת.לידה', 'תאריך לידה']),
  };

  return rows.slice(headerIndex + 1).map(row => {
    const firstName = cleanValue(row[indexes.firstName]);
    const lastName = cleanValue(row[indexes.lastName]);
    const fullName = cleanValue(row[indexes.fullName]) || [firstName, lastName].filter(Boolean).join(' ');
    const fileClassName = normalizeClassName(row[indexes.className]);
    const finalClassName = classRoom?.name || fileClassName;

    return {
      full_name: fullName,
      student_number: cleanValue(row[indexes.id]),
      phone: cleanValue(row[indexes.phone]),
      email: cleanValue(row[indexes.email]),
      gender: normalizeGender(row[indexes.gender]) || 'זכר',
      birth_date: cleanValue(row[indexes.birthDate]),
      grade: classRoom?.grade || extractGrade(fileClassName, 'י'),
      class_id: classId,
      class_name: finalClassName,
      status: 'פעיל',
      community_service_goal: 60,
      community_service_done: 0,
      community_service_status: 'לא התחיל'
    };
  }).filter(student => student.full_name && student.student_number);
}