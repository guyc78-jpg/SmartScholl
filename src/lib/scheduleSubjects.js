import { base44 } from '@/api/base44Client';

export const SUBJECT_COLORS = [
  '#2563eb', '#059669', '#7c3aed', '#d97706', '#ea580c', '#0891b2',
  '#db2777', '#16a34a', '#4f46e5', '#e11d48', '#0d9488', '#6d28d9',
  '#dc2626', '#0284c7', '#65a30d', '#c026d3', '#9333ea', '#ca8a04',
  '#0f766e', '#be123c', '#0369a1', '#15803d', '#a21caf', '#b45309'
];

export function normalizeSubjectName(value = '') {
  return String(value)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/["'`׳״]/g, '')
    .toLowerCase();
}

export function colorToSubjectStyle(color) {
  const safeColor = color || '#64748b';
  return {
    color: safeColor,
    backgroundColor: `${safeColor}1A`,
  };
}

export function findDuplicateSubjectColors(subjects = []) {
  const byColor = subjects.filter(subject => subject.is_active !== false).reduce((map, subject) => {
    const color = String(subject.color || '').toLowerCase();
    if (!color) return map;
    if (!map[color]) map[color] = [];
    map[color].push(subject);
    return map;
  }, {});
  return Object.values(byColor).filter(group => new Set(group.map(subject => subject.normalized_key)).size > 1);
}

function nextAvailableColor(usedColors) {
  return SUBJECT_COLORS.find(color => !usedColors.has(color.toLowerCase())) || SUBJECT_COLORS[usedColors.size % SUBJECT_COLORS.length];
}

export async function loadAndNormalizeSubjects(slots = []) {
  const allSubjects = await base44.entities.SchoolSubject.list('-updated_date', 500);
  const existing = (allSubjects || []).filter(subject => subject.is_active !== false);
  const byKey = new Map(existing.map(subject => [subject.normalized_key, subject]));
  const usedColors = new Set(existing.map(subject => String(subject.color || '').toLowerCase()).filter(Boolean));
  const created = [];

  for (const slot of slots) {
    const key = normalizeSubjectName(slot.subject);
    if (!key || byKey.has(key)) continue;
    const color = nextAvailableColor(usedColors);
    usedColors.add(color.toLowerCase());
    const subject = await base44.entities.SchoolSubject.create({
      name: slot.subject.trim(),
      normalized_key: key,
      color,
      is_active: true,
    });
    byKey.set(key, subject);
    created.push(subject);
  }

  const subjects = [...(existing || []), ...created];
  const updates = slots
    .map(slot => {
      const subject = byKey.get(normalizeSubjectName(slot.subject));
      if (!subject || slot.subject_id === subject.id) return null;
      return base44.entities.ScheduleSlot.update(slot.id, { subject_id: subject.id });
    })
    .filter(Boolean);

  if (updates.length) await Promise.all(updates);
  return subjects;
}

export async function ensureSubjectForName(name, subjects = [], preferredColor = '') {
  const key = normalizeSubjectName(name);
  if (!key) return null;
  const existing = subjects.find(subject => subject.normalized_key === key);
  if (existing) {
    if (preferredColor && preferredColor !== existing.color) {
      await base44.entities.SchoolSubject.update(existing.id, { color: preferredColor });
      return { ...existing, color: preferredColor };
    }
    return existing;
  }
  const usedColors = new Set(subjects.map(subject => String(subject.color || '').toLowerCase()).filter(Boolean));
  return base44.entities.SchoolSubject.create({
    name: name.trim(),
    normalized_key: key,
    color: preferredColor || nextAvailableColor(usedColors),
    is_active: true,
  });
}

export function subjectMapById(subjects = []) {
  return Object.fromEntries(subjects.map(subject => [subject.id, subject]));
}