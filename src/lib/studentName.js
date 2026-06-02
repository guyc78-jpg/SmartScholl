// Centralized utility for displaying student names consistently across the app.
// Display format: "שם משפחה שם פרטי" (last name first).
// Sort: by last name, then by the remaining first/middle names.
//
// Each function accepts EITHER a student object (preferred — uses the separate
// last_name / first_name fields, so compound last names like "מור יוסף" stay
// intact) OR a plain full-name string (legacy fallback that splits on spaces).

function fieldsFrom(input) {
  if (input && typeof input === 'object') {
    const last = (input.last_name || '').trim();
    const first = (input.first_name || '').trim();
    if (last || first) return { last, first, fullName: (input.full_name || `${first} ${last}`).trim() };
    return { last: '', first: '', fullName: (input.full_name || input.student_name || '').trim() };
  }
  return { last: '', first: '', fullName: (input || '').toString().trim() };
}

export function formatStudentName(input) {
  const { last, first, fullName } = fieldsFrom(input);
  if (last || first) return `${last} ${first}`.trim();
  if (!fullName) return '';
  const parts = fullName.split(/\s+/);
  if (parts.length < 2) return fullName;
  const lastName = parts.pop();
  return `${lastName} ${parts.join(' ')}`;
}

export function getLastName(input) {
  const { last, fullName } = fieldsFrom(input);
  if (last) return last;
  if (!fullName) return '';
  const parts = fullName.split(/\s+/);
  return parts[parts.length - 1] || '';
}

export function getFirstNames(input) {
  const { first, fullName } = fieldsFrom(input);
  if (first) return first;
  if (!fullName) return '';
  const parts = fullName.split(/\s+/);
  if (parts.length < 2) return fullName;
  parts.pop();
  return parts.join(' ');
}

// Comparator for Array.sort — sorts students by last name, then first names.
export function compareStudentsByLastName(a, b) {
  const lastA = getLastName(a);
  const lastB = getLastName(b);
  const cmp = lastA.localeCompare(lastB, 'he');
  if (cmp !== 0) return cmp;
  return getFirstNames(a).localeCompare(getFirstNames(b), 'he');
}