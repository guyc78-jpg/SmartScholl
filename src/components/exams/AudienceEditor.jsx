import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AUDIENCE_SCOPES } from './eventConstants';

const toText = value => Array.isArray(value) ? value.join(', ') : '';
const toList = value => String(value || '').split(',').map(v => v.trim()).filter(Boolean);
const norm = value => String(value || '').trim().toLowerCase();
const hasAny = (list, values) => (list || []).map(norm).some(item => values.map(norm).includes(item));

export default function AudienceEditor({ value, onChange }) {
  const scope = value.audience_scope || 'grade';
  const update = patch => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">רלוונטיות</Label>
        <Select value={scope} onValueChange={audience_scope => update({ audience_scope })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent collisionPadding={16} className="max-w-[calc(100vw-2rem)]">{AUDIENCE_SCOPES.map(scope => <SelectItem key={scope.value} value={scope.value}>{scope.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {scope === 'grade' && <Field label="שכבות" placeholder="לדוגמה: י, יא, יב" value={toText(value.audience_grades)} onChange={v => update({ audience_grades: toList(v) })} />}
      {scope === 'class' && <Field label="כיתות" placeholder="לדוגמה: יב5, יב7" value={toText(value.audience_classes)} onChange={v => update({ audience_classes: toList(v) })} />}
      {scope === 'subject' && <Field label="מקצועות" placeholder="לדוגמה: מתמטיקה, אנגלית" value={toText(value.audience_subjects)} onChange={v => update({ audience_subjects: toList(v) })} />}
      {scope === 'track' && <Field label="מגמות" placeholder='לדוגמה: 5 יח״ל, מחול, עולים' value={toText(value.audience_tracks)} onChange={v => update({ audience_tracks: toList(v) })} />}
      {scope === 'group' && <Field label="שם קבוצה" placeholder="לדוגמה: נבחרת שכבה" value={value.audience_group_label || ''} onChange={v => update({ audience_group_label: v })} />}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function isEventRelevantForStudent(event, student) {
  if (!event || !student) return true;
  const scope = event.audience_scope || 'grade';
  const studentValues = [student.grade, student.class_name, student.class_id, ...(student.tags || [])];
  if (scope === 'school') return true;
  if (scope === 'grade') return !(event.audience_grades || []).length || hasAny(event.audience_grades, studentValues);
  if (scope === 'class') return !(event.audience_classes || []).length || hasAny(event.audience_classes, studentValues);
  if (scope === 'subject') return !(event.audience_subjects || []).length || hasAny(event.audience_subjects, studentValues);
  if (scope === 'track') return !(event.audience_tracks || []).length || hasAny(event.audience_tracks, studentValues);
  if (scope === 'group') return !event.audience_group_label || studentValues.map(norm).includes(norm(event.audience_group_label));
  return true;
}