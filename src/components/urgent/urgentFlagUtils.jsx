/**
 * Shared helpers for UrgentFlag entity.
 * Keeps UI components small and consistent.
 */

export const CATEGORIES = [
  'טיול שנתי',
  'מעורבות חברתית',
  'משמעת',
  'איחורים',
  'התנהגות',
  'לימודי',
  'הורים',
  'אירוע כיתתי',
  'אחר',
];

export const PRIORITIES = ['דחוף', 'גבוה', 'רגיל'];
export const STATUSES = ['פתוח', 'בטיפול', 'טופל'];

// Category → emoji icon (kept tiny & decorative, not a brand icon)
export const CATEGORY_EMOJI = {
  'טיול שנתי': '🚌',
  'מעורבות חברתית': '🤝',
  'משמעת': '🛡️',
  'איחורים': '⏰',
  'התנהגות': '⚠️',
  'לימודי': '📚',
  'הורים': '👨‍👩‍👧',
  'אירוע כיתתי': '🎉',
  'אחר': '📌',
};

// Priority → tone for UI accents (aligned with TodayHighlights tones)
export const PRIORITY_TONE = {
  'דחוף': 'urgent',
  'גבוה': 'warn',
  'רגיל': 'info',
};

// Status → muted vs active styling
export function isClosed(flag) {
  return flag?.status === 'טופל';
}

// Days until due_date (negative if overdue). Null if no due_date.
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr); due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
}

// Flag should appear on the dashboard if it's not closed
export function isDashboardRelevant(flag) {
  return !isClosed(flag);
}

// Stable ordering: pinned → status (open first) → priority → due date
const PRIORITY_RANK = { 'דחוף': 0, 'גבוה': 1, 'רגיל': 2 };
const STATUS_RANK = { 'פתוח': 0, 'בטיפול': 1, 'טופל': 2 };

export function sortFlags(flags) {
  return [...flags].sort((a, b) => {
    if (!!b.is_pinned - !!a.is_pinned) return (!!b.is_pinned) - (!!a.is_pinned);
    const sa = STATUS_RANK[a.status] ?? 9, sb = STATUS_RANK[b.status] ?? 9;
    if (sa !== sb) return sa - sb;
    const pa = PRIORITY_RANK[a.priority] ?? 9, pb = PRIORITY_RANK[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return (a.due_date || '9999').localeCompare(b.due_date || '9999');
  });
}

export function formatHebrewDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(2)}`;
}

// User-friendly due-date hint, e.g. "באיחור · לפני 3 ימים" / "מחר" / "בעוד 4 ימים"
export function dueDateHint(dateStr) {
  const days = daysUntil(dateStr);
  if (days == null) return '';
  if (days < 0) return `באיחור · לפני ${Math.abs(days)} ימים`;
  if (days === 0) return 'היום';
  if (days === 1) return 'מחר';
  if (days <= 7) return `בעוד ${days} ימים`;
  return formatHebrewDate(dateStr);
}