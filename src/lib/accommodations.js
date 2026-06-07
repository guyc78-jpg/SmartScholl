export const ACCOMMODATION_TYPES = [
  { key: 'extra_time_25', label: 'תוספת זמן 25%', aliases: ['תוספת זמן', '25%', 'הארכת זמן'] },
  { key: 'computer_recording', label: 'הקלטת תשובות במחשב', aliases: ['הקלטת תשובות', 'מחשב', 'הקלטה במחשב'] },
  { key: 'adapted_exam', label: 'מבחן מותאם', aliases: ['מותאם', 'מבחן מותאם'] },
  { key: 'questionnaire_audio', label: 'השמעת שאלון', aliases: ['השמעה', 'שאלון מוקרא', 'הקראת שאלון'] },
  { key: 'typing', label: 'הקלדה', aliases: ['הקלדה', 'כתיבה במחשב'] },
  { key: 'ignore_errors', label: 'התעלמות משגיאות', aliases: ['שגיאות כתיב', 'התעלמות משגיאות', 'שגיאות'] },
  { key: 'extended_formula_sheet', label: 'דף נוסחאות מורחב', aliases: ['דף נוסחאות', 'נוסחאות מורחב', 'נוסחאות'] },
  { key: 'digital_english', label: 'מתוקשב באנגלית', aliases: ['אנגלית מתוקשב', 'מתוקשב באנגלית', 'מתוקשב'] },
];

export const ACCOMMODATION_DETAIL_EXAMPLES = ['רבי מלל', 'אנגלית', 'לשון', 'מתמטיקה', 'פיזיקה', 'בוחן אנושי', 'עולה חדש/ה', 'דיפרנציאלי', 'שמע'];

export function defaultAccommodations() {
  return ACCOMMODATION_TYPES.map(item => ({ key: item.key, label: item.label, enabled: false, detail: '' }));
}

export function normalizeAccommodationList(list = []) {
  const byKey = new Map((list || []).map(item => [item.key, item]));
  return ACCOMMODATION_TYPES.map(type => {
    const existing = byKey.get(type.key) || {};
    return {
      key: type.key,
      label: type.label,
      enabled: !!existing.enabled,
      detail: existing.detail || '',
    };
  });
}

export function activeAccommodationLabels(list = []) {
  return normalizeAccommodationList(list)
    .filter(item => item.enabled)
    .map(item => item.label);
}