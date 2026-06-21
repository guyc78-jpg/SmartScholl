const UNIT_PATTERN = /(?:רמה\s*)?[345]\s*יח[״"׳']?ל|רמה\s*[345]|[345]\s*יחידות?/i;

export function cleanLessonText(value = '') {
  return String(value || '')
    .replace(/יח``ל/g, 'יח״ל')
    .replace(/יח''ל/g, 'יח״ל')
    .replace(/יח"ל/g, 'יח״ל')
    .replace(/\bיחל\b/g, 'יח״ל')
    .replace(/תנ``ך/g, 'תנ״ך')
    .replace(/תנ''ך/g, 'תנ״ך')
    .replace(/תנך/g, 'תנ״ך')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getBaseSubjectName(subject = '') {
  const text = cleanLessonText(subject);
  const base = text
    .replace(new RegExp(`\\s*[-–—:]?\\s*${UNIT_PATTERN.source}.*$`, 'i'), '')
    .replace(/\s*[-–—:]?\s*(הקבצה|קבוצה)\s*[א-ת0-9]+.*$/i, '')
    .trim();
  return base || text;
}

export function getUnitLabel(slot = {}) {
  const sources = [slot.subject, slot.room, slot.notes, slot.original_text];
  for (const source of sources) {
    const text = cleanLessonText(source);
    const match = text.match(UNIT_PATTERN);
    if (match) {
      const label = cleanLessonText(match[0]).replace(/^רמה\s*([345])$/i, '$1 יח״ל');
      return label.includes('יח') ? label : label.replace(/^([345])$/, '$1 יח״ל');
    }
  }
  return '';
}

export function stripUnitFromRoom(room = '', unitLabel = '') {
  let text = cleanLessonText(room);
  if (!text) return '';
  text = text.replace(UNIT_PATTERN, '').replace(/[·|,]+/g, ' · ').replace(/\s+·\s+$/g, '').replace(/^\s+·\s+/g, '').trim();
  if (unitLabel) text = text.replace(unitLabel, '').trim();
  return text;
}

export function groupSlotsByBaseSubject(slots = []) {
  const groups = [];
  const map = new Map();

  for (const slot of slots) {
    const subject = getBaseSubjectName(slot.subject);
    const key = subject.toLowerCase();
    if (!map.has(key)) {
      const group = { subject, slots: [] };
      map.set(key, group);
      groups.push(group);
    }
    map.get(key).slots.push(slot);
  }

  return groups;
}