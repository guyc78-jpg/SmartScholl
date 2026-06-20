export function getClassIdentityText(classRoom) {
  return String(classRoom?.class_identity || '').trim();
}

export function getClassDisplayName(classRoom, fallback = '') {
  const base = classRoom?.name || fallback || '';
  const identity = getClassIdentityText(classRoom);
  return identity && base ? `${base} — ${identity}` : (identity || base);
}

export function buildClassIdentityMap(classRooms = []) {
  return Object.fromEntries((classRooms || []).map(classRoom => [classRoom.id, getClassDisplayName(classRoom, classRoom.name)]));
}

export function getClassDisplayById(classMap = {}, classId = '', fallback = '') {
  return classMap[classId] || fallback || '';
}