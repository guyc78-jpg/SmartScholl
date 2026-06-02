// מגן סימולציה: כשמצב סימולציה פעיל — חוסם כל כתיבה אמיתית לנתונים.
// עוטף את מתודות הכתיבה של כל ה-entities ב-base44 וזורק שגיאה מנומסת במקום לבצע שינוי.
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

let simulating = false;
let patched = false;

const WRITE_METHODS = ['create', 'update', 'delete', 'bulkCreate', 'bulkUpdate', 'bulkDelete'];

function blockedAction() {
  toast.error('מצב סימולציה — הפעולה הודגמה בלבד ולא נשמרה בנתונים האמיתיים');
  // מחזיר ערך "כאילו הצליח" כדי לא לשבור זרימות UI
  return Promise.resolve({ __simulated: true });
}

function patchEntities() {
  if (patched) return;
  const entities = base44?.entities;
  if (!entities) return;
  Object.keys(entities).forEach((name) => {
    const entity = entities[name];
    if (!entity || typeof entity !== 'object') return;
    WRITE_METHODS.forEach((method) => {
      const original = entity[method];
      if (typeof original !== 'function') return;
      entity[method] = function (...args) {
        if (simulating) return blockedAction();
        return original.apply(this, args);
      };
    });
  });

  // חסימת auth.updateMe — לא לשנות נתוני משתמש אמיתיים בסימולציה
  if (base44.auth && typeof base44.auth.updateMe === 'function') {
    const origUpdateMe = base44.auth.updateMe.bind(base44.auth);
    base44.auth.updateMe = (...args) => (simulating ? blockedAction() : origUpdateMe(...args));
  }

  patched = true;
}

export function setSimulationGuard(active) {
  patchEntities();
  simulating = active;
}

export function isGuardActive() {
  return simulating;
}