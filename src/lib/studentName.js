// Centralized utility for storing, displaying and sorting student names.
// Storage: firstName / lastName (plus legacy first_name / last_name for compatibility).
// Display: "שם משפחה שם פרטי".

function cleanName(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function splitLegacyFullName(fullName) {
  const parts = cleanName(fullName).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function looksDuplicatedFullName(first, last, fullName) {
  const full = cleanName(fullName);
  return full && cleanName(first) === full && cleanName(last) === full;
}

function fieldsFrom(input) {
  if (input && typeof input === 'object') {
    const fullName = cleanName(input.fullName || input.full_name || '');
    const storedFirst = cleanName(input.firstName ?? input.first_name ?? '');
    const storedLast = cleanName(input.lastName ?? input.last_name ?? '');

    if (looksDuplicatedFullName(storedFirst, storedLast, fullName)) {
      const legacy = splitLegacyFullName(fullName);
      return { ...legacy, displayName: '' };
    }

    if (storedFirst || storedLast) return { first: storedFirst, last: storedLast, displayName: '' };
    if (fullName) return { ...splitLegacyFullName(fullName), displayName: '' };
    if (input.student_name) return { first: '', last: '', displayName: cleanName(input.student_name) };
  }
  return { first: '', last: '', displayName: cleanName(input || '') };
}

export function normalizeStudentNameFields(input) {
  const { first, last } = fieldsFrom(input);
  const fullName = [first, last].filter(Boolean).join(' ');
  return {
    firstName: first,
    lastName: last,
    first_name: first,
    last_name: last,
    fullName,
    full_name: fullName,
  };
}

export function formatStudentName(input) {
  const { last, first, displayName } = fieldsFrom(input);
  if (last || first) return `${last} ${first}`.trim();
  return displayName || '';
}

export function getLastName(input) {
  const { last, displayName } = fieldsFrom(input);
  return last || displayName || '';
}

export function getFirstNames(input) {
  const { first, displayName } = fieldsFrom(input);
  return first || displayName || '';
}

export function compareStudentsByLastName(a, b) {
  const lastCmp = getLastName(a).localeCompare(getLastName(b), 'he');
  if (lastCmp !== 0) return lastCmp;
  return getFirstNames(a).localeCompare(getFirstNames(b), 'he');
}