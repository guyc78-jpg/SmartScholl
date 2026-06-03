// Centralized utility for displaying student names consistently across the app.
// Display format: "שם משפחה שם פרטי" (last name first).
// Sort: by last name, then by the remaining first/middle names.
//
// Each function accepts EITHER a student object (preferred — uses the separate
// last_name / first_name fields, so compound last names like "מור יוסף" stay
// intact). If only legacy full_name exists, it is converted from old
// "שם פרטי שם משפחה" storage to "שם משפחה שם פרטי" display. Plain strings
// such as saved student_name values are returned as-is to avoid double flipping.

function splitLegacyFullName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { last: fullName || '', first: '' };
  const last = parts.pop();
  return { last, first: parts.join(' ') };
}

function fieldsFrom(input) {
  if (input && typeof input === 'object') {
    const last = (input.last_name || '').trim();
    const first = (input.first_name || '').trim();
    if (last || first) return { last, first, displayName: '' };
    if (input.student_name) return { last: '', first: '', displayName: input.student_name.trim() };
    const legacy = splitLegacyFullName(input.full_name || '');
    return { ...legacy, displayName: '' };
  }
  return { last: '', first: '', displayName: (input || '').toString().trim() };
}

export function formatStudentName(input) {
  const { last, first, displayName } = fieldsFrom(input);
  if (last || first) return `${last} ${first}`.trim();
  return displayName || '';
}

export function getLastName(input) {
  const { last, displayName } = fieldsFrom(input);
  if (last) return last;
  return displayName || '';
}

export function getFirstNames(input) {
  const { first, displayName } = fieldsFrom(input);
  if (first) return first;
  return displayName || '';
}

// Comparator for Array.sort — sorts students by last name, then first names.
export function compareStudentsByLastName(a, b) {
  const lastA = getLastName(a);
  const lastB = getLastName(b);
  const cmp = lastA.localeCompare(lastB, 'he');
  if (cmp !== 0) return cmp;
  return getFirstNames(a).localeCompare(getFirstNames(b), 'he');
}