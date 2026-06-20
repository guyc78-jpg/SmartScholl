export function getClassIdentityText(classRoom) {
  return String(classRoom?.class_identity || '').trim();
}

const escapeRegExp = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function getClassDisplayName(classRoom, fallback = '') {
  const identity = getClassIdentityText(classRoom);
  const rawBase = String(classRoom?.name || fallback || '').trim();
  const base = identity ? rawBase.replace(new RegExp(`\\s*[—-]\\s*${escapeRegExp(identity)}$`), '').trim() : rawBase;
  return identity && base ? `${base} — ${identity}` : (identity || base);
}

export function getHomeroomClassLabel(classRoom, fallback = '') {
  const displayName = getClassDisplayName(classRoom, fallback);
  return displayName ? `הכיתה שלי: ${displayName}` : 'הכיתה שלי';
}

export function buildClassIdentityMap(classRooms = []) {
  return Object.fromEntries((classRooms || []).map(classRoom => [classRoom.id, getClassDisplayName(classRoom, classRoom.name)]));
}

export function getClassDisplayById(classMap = {}, classId = '', fallback = '') {
  return classMap[classId] || fallback || '';
}