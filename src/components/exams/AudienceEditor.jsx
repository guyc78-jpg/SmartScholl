import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AUDIENCE_SCOPES } from './eventConstants';

const toText = value => Array.isArray(value) ? value.join(', ') : '';
const toList = value => String(value || '').split(',').map(v => v.trim()).filter(Boolean);

export default function AudienceEditor({ value, onChange }) {
  const scope = value.audience_scope || 'grade';
  const update = patch => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">רלוונטיות</Label>
        <Select value={scope} onValueChange={audience_scope => update({ audience_scope })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{AUDIENCE_SCOPES.map(scope => <SelectItem key={scope.value} value={scope.value}>{scope.label}</SelectItem>)}</SelectContent>
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
  if (scope === 'school') return true;
  if (scope === 'grade') return !(event.audience_grades || []).length || event.audience_grades.includes(student.grade);
  if (scope === 'class') return !(event.audience_classes || []).length || event.audience_classes.includes(student.class_name);
  if (scope === 'subject') return !(event.audience_subjects || []).length;
  if (scope === 'track') return !(event.audience_tracks || []).length;
  return true;
}