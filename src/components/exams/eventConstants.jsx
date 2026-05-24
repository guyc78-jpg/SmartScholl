export const EVENT_TYPES = [
  'מבחן', 'בחן', 'עבודה', 'פרויקט', 'הגשה',
  'בגרות', 'מתכונת', 'מועד ב׳',
  'חזרה', 'ריקודים', 'משחק', 'טקס', 'צילומים', 'ועדה', 'חג', 'אירוע שכבתי', 'אחר'
];

export const EVENT_GROUPS = [
  { key: 'academic', label: 'מבחנים ובגרויות', types: ['מבחן', 'בחן', 'בגרות', 'מתכונת', 'מועד ב׳'] },
  { key: 'tasks', label: 'מטלות והגשות', types: ['עבודה', 'פרויקט', 'הגשה'] },
  { key: 'activities', label: 'פעילויות שכבתיות', types: ['חזרה', 'ריקודים', 'משחק', 'טקס', 'צילומים', 'ועדה', 'אירוע שכבתי'] },
  { key: 'holidays', label: 'חגים', types: ['חג'] }
];

export const TYPE_STYLES = {
  'מבחן': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-900/50',
  'בחן': 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/25 dark:text-violet-300 dark:border-violet-900/50',
  'עבודה': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/50',
  'פרויקט': 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-900/50',
  'הגשה': 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-900/50',
  'בגרות': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900/50',
  'מתכונת': 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-900/50',
  'מועד ב׳': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900/50',
  'חזרה': 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-900/50',
  'ריקודים': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:border-fuchsia-900/50',
  'משחק': 'bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-900/50',
  'טקס': 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-900/50',
  'צילומים': 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-900/50',
  'ועדה': 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700',
  'חג': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-900/50',
  'אירוע שכבתי': 'bg-primary/10 text-primary border-primary/20',
  'אחר': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
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

export const AUDIENCE_SCOPES = [
  { value: 'school', label: 'כל בית הספר' },
  { value: 'grade', label: 'שכבה' },
  { value: 'class', label: 'כיתה' },
  { value: 'subject', label: 'מקצוע' },
  { value: 'track', label: 'מגמה' },
  { value: 'group', label: 'קבוצת תלמידים' }
];