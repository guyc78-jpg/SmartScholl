// Centralized utility for displaying student names consistently across the app.
// Display format: "שם משפחה שם פרטי" (last name first).
// Sort: by last name, then by the remaining first/middle names.

export function formatStudentName(fullName) {
  if (!fullName || typeof fullName !== 'string') return fullName || '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  const lastName = parts.pop();
  return `${lastName} ${parts.join(' ')}`;
}

export function getLastName(fullName) {
  if (!fullName || typeof fullName !== 'string') return '';
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || '';
}

export function getFirstNames(fullName) {
  if (!fullName || typeof fullName !== 'string') return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  parts.pop();
  return parts.join(' ');
}

// Comparator for Array.sort — sorts students by last name, then first names.
export function compareStudentsByLastName(a, b) {
  const nameA = (a?.full_name || a?.student_name || '').trim();
  const nameB = (b?.full_name || b?.student_name || '').trim();
  const lastA = getLastName(nameA);
  const lastB = getLastName(nameB);
  const cmp = lastA.localeCompare(lastB, 'he');
  if (cmp !== 0) return cmp;
  return nameA.localeCompare(nameB, 'he');
}