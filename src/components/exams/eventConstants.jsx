export const EVENT_TYPES = [
  'מבחן', 'בחן', 'עבודה', 'פרויקט', 'הגשה',
  'בגרות', 'מתכונת', 'מועד ב׳',
  'חזרה', 'חזרות למסיבת סיום', 'ריקודים', 'משחק', 'טקס', 'צילומים', 'ועדה', 'חג', 'אירוע שכבתי', 'אחר'
];

export const EVENT_GROUPS = [
  { key: 'academic', label: 'מבחנים ובגרויות', types: ['מבחן', 'בחן', 'בגרות', 'מתכונת', 'מועד ב׳'] },
  { key: 'tasks', label: 'מטלות והגשות', types: ['עבודה', 'פרויקט', 'הגשה'] },
  { key: 'activities', label: 'פעילויות שכבתיות', types: ['חזרה', 'חזרות למסיבת סיום', 'ריקודים', 'משחק', 'טקס', 'צילומים', 'ועדה', 'אירוע שכבתי'] },
  { key: 'holidays', label: 'חגים', types: ['חג'] }
];

export const TYPE_STYLES = {
  'מבחן': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-900/60',
  'בחן': 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-900/60',
  'עבודה': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-900/60',
  'פרויקט': 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-900/60',
  'הגשה': 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-200 dark:border-cyan-900/60',
  'בגרות': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-900/60',
  'מתכונת': 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-900/60',
  'מועד ב׳': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-900/60',
  'חזרה': 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/40 dark:text-pink-200 dark:border-pink-900/60',
  'חזרות למסיבת סיום': 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-900/60',
  'ריקודים': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/40 dark:text-fuchsia-200 dark:border-fuchsia-900/60',
  'משחק': 'bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-900/40 dark:text-lime-200 dark:border-lime-900/60',
  'טקס': 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-900/60',
  'צילומים': 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-900/60',
  'ועדה': 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-700 dark:text-stone-200 dark:border-stone-600',
  'חג': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-900/60',
  'אירוע שכבתי': 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/30',
  'אחר': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600'
};

export const normalizeEventType = (value = '') => {
  const text = String(value).replace("'", '׳').trim();
  if (EVENT_TYPES.includes(text)) return text;
  if (/בגרות/.test(text)) return 'בגרות';
  if (/מתכונת|מ\.מ/.test(text)) return 'מתכונת';
  if (/מועד ב|מ\.ב/.test(text)) return 'מועד ב׳';
  if (/בחן/.test(text)) return 'בחן';
  if (/מבחן|בחינה/.test(text)) return 'מבחן';
  if (/עבודה/.test(text)) return 'עבודה';
  if (/פרויקט/.test(text)) return 'פרויקט';
  if (/הגשה|מטלה/.test(text)) return 'הגשה';
  if (/חזרות למסיבת סיום|מסיבת סיום/.test(text)) return 'חזרות למסיבת סיום';
  if (/חזרה|תרגול/.test(text)) return 'חזרה';
  if (/ריקוד|ריקודים/.test(text)) return 'ריקודים';
  if (/משחק|טורניר/.test(text)) return 'משחק';
  if (/טקס/.test(text)) return 'טקס';
  if (/צילום|צילומים/.test(text)) return 'צילומים';
  if (/ועדה|וועדה/.test(text)) return 'ועדה';
  if (/חג|חופשה|זיכרון|עצמאות|ל״ג|ל"ג/.test(text)) return 'חג';
  if (/שכב|סיור|יום שיא|מסיבה|פעילות/.test(text)) return 'אירוע שכבתי';
  return 'אחר';
};

export const getDisplayEventType = (eventOrType) => {
  if (eventOrType && typeof eventOrType === 'object') {
    const customType = String(eventOrType.custom_event_type || '').trim();
    return eventOrType.type === 'אחר' && customType ? customType : (eventOrType.type || 'אחר');
  }
  return eventOrType || 'אחר';
};

export const AUDIENCE_SCOPES = [
  { value: 'school', label: 'כל בית הספר' },
  { value: 'grade', label: 'שכבה' },
  { value: 'class', label: 'כיתה' },
  { value: 'subject', label: 'מקצוע' },
  { value: 'track', label: 'מגמה' },
  { value: 'group', label: 'קבוצת תלמידים' }
];