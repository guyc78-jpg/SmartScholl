import { normalizeGrade } from '@/lib/schoolStructure';

// סוגים שנחשבים "מבחן" לצורך זיהוי עומס/כפילות
const TEST_TYPES = ['מבחן', 'בחן', 'בגרות', 'מתכונת', 'מועד ב׳'];
// אירועים שכבתיים/מיוחדים שחפיפה איתם מהווה התנגשות
const SCHOOL_EVENT_TYPES = ['אירוע שכבתי', 'טקס', 'חזרה', 'חג', 'ריקודים', 'צילומים', 'משחק'];

function isTest(ev) {
  return TEST_TYPES.includes(ev?.type);
}

// מפיק את שמות הכיתות שאירוע חל עליהן (לפי audience)
function eventClassNames(ev) {
  if (Array.isArray(ev?.audience_classes) && ev.audience_classes.length) {
    return ev.audience_classes.map(c => normalizeGrade(c));
  }
  return [];
}

function eventGrades(ev) {
  if (Array.isArray(ev?.audience_grades) && ev.audience_grades.length) {
    return ev.audience_grades.map(g => normalizeGrade(g));
  }
  return [];
}

// האם שני אירועים חולקים אותו קהל יעד (כיתה או שכבה)
function shareAudience(a, b) {
  const aClasses = eventClassNames(a);
  const bClasses = eventClassNames(b);
  if (aClasses.length && bClasses.length) {
    return aClasses.some(c => bClasses.includes(c));
  }
  const aGrades = eventGrades(a);
  const bGrades = eventGrades(b);
  if (aGrades.length && bGrades.length) {
    return aGrades.some(g => bGrades.includes(g));
  }
  // אם לאחד יש כיתה ולשני שכבה — בודקים אם הכיתה שייכת לשכבה
  const aClassGrades = aClasses.map(c => c.replace(/\d+$/, ''));
  const bClassGrades = bClasses.map(c => c.replace(/\d+$/, ''));
  if (aClassGrades.length && bGrades.length) return aClassGrades.some(g => bGrades.includes(g));
  if (bClassGrades.length && aGrades.length) return bClassGrades.some(g => aGrades.includes(g));
  return false;
}

function startOfWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=ראשון
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * מזהה התנגשויות עבור אירוע מועמד מול שאר האירועים.
 * מחזיר מערך אזהרות: { type, severity, message }
 */
export function detectConflicts(candidate, allEvents) {
  const warnings = [];
  if (!candidate?.date) return warnings;

  // מתעלמים מהאירוע עצמו (בעריכה)
  const others = allEvents.filter(e => e.id !== candidate.id);

  // 1. שני מבחנים לאותה כיתה באותו יום
  if (isTest(candidate)) {
    const sameDayTests = others.filter(
      e => isTest(e) && e.date === candidate.date && shareAudience(candidate, e)
    );
    if (sameDayTests.length > 0) {
      warnings.push({
        type: 'same_day',
        severity: 'high',
        message: `כבר קיים מבחן באותו יום לאותה כיתה: "${sameDayTests[0].title}"`,
      });
    }

    // 2. עומס: 3+ מבחנים לאותה כיתה באותו שבוע
    const candWeek = startOfWeek(candidate.date);
    const weekTests = others.filter(
      e => isTest(e) && startOfWeek(e.date) === candWeek && shareAudience(candidate, e)
    );
    if (weekTests.length >= 2) {
      warnings.push({
        type: 'week_overload',
        severity: 'medium',
        message: `עומס מבחנים: כבר קיימים ${weekTests.length} מבחנים לאותה כיתה באותו שבוע (האירוע הזה יהיה ה-${weekTests.length + 1})`,
      });
    }
  }

  // 3. חפיפה עם אירוע שכבתי / טקס / חזרה / טיול באותו יום
  const sameDaySchoolEvents = others.filter(
    e => SCHOOL_EVENT_TYPES.includes(e.type) && e.date === candidate.date && shareAudience(candidate, e)
  );
  if (sameDaySchoolEvents.length > 0 && candidate.type !== sameDaySchoolEvents[0].type) {
    warnings.push({
      type: 'school_event_overlap',
      severity: 'high',
      message: `חפיפה עם אירוע שכבתי באותו יום: "${sameDaySchoolEvents[0].title}" (${sameDaySchoolEvents[0].type})`,
    });
  }

  return warnings;
}