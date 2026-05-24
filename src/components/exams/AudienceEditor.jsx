import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SCOPES = [
  { value: 'school', label: 'כלל בית-ספרי' },
  { value: 'grade',  label: 'שכבה' },
  { value: 'class',  label: 'כיתה ספציפית' },
  { value: 'track',  label: 'מגמה / מסלול' },
  { value: 'subject', label: 'מקצוע' },
  { value: 'group',  label: 'קבוצת תלמידים' }
];

const toList = (value) => Array.isArray(value) ? value.join(', ') : (value || '');
const fromList = (value) => String(value).split(',').map(s => s.trim()).filter(Boolean);

export default function AudienceEditor({ value, onChange, compact = false }) {
  const scope = value?.audience_scope || 'grade';
  const update = (patch) => onChange({ ...value, ...patch });

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="space-y-1">
        <Label className="text-xs">רלוונטי ל-</Label>
        <Select value={scope} onValueChange={v => update({ audience_scope: v })}>
          <SelectTrigger className={compact ? 'h-8' : ''}><SelectValue /></SelectTrigger>
          <SelectContent>{SCOPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {scope === 'grade' && (
        <div className="space-y-1">
          <Label className="text-xs">שכבות (י, יא, יב — מופרד בפסיק)</Label>
          <Input
            value={toList(value?.audience_grades)}
            onChange={e => update({ audience_grades: fromList(e.target.value) })}
            placeholder="לדוגמה: יב"
          />
        </div>
      )}

      {scope === 'class' && (
        <div className="space-y-1">
          <Label className="text-xs">כיתות (יב5, יב7 — מופרד בפסיק)</Label>
          <Input
            value={toList(value?.audience_classes)}
            onChange={e => update({ audience_classes: fromList(e.target.value) })}
            placeholder="לדוגמה: יב5, יב7"
          />
        </div>
      )}

      {scope === 'track' && (
        <div className="space-y-1">
          <Label className="text-xs">מגמות / מסלולים</Label>
          <Input
            value={toList(value?.audience_tracks)}
            onChange={e => update({ audience_tracks: fromList(e.target.value) })}
            placeholder='לדוגמה: 5 יח״ל, מורחב, עולים'
          />
        </div>
      )}

      {scope === 'subject' && (
        <div className="space-y-1">
          <Label className="text-xs">מקצועות</Label>
          <Input
            value={toList(value?.audience_subjects)}
            onChange={e => update({ audience_subjects: fromList(e.target.value) })}
            placeholder="לדוגמה: מתמטיקה, אנגלית"
          />
        </div>
      )}

      {scope === 'group' && (
        <div className="space-y-1">
          <Label className="text-xs">שם הקבוצה</Label>
          <Input
            value={value?.audience_group_label || ''}
            onChange={e => update({ audience_group_label: e.target.value })}
            placeholder="לדוגמה: רכזי שכבה"
          />
        </div>
      )}
    </div>
  );
}

export function isEventRelevantForStudent(exam, student) {
  if (!exam || !student) return true;
  const scope = exam.audience_scope || 'grade';
  if (scope === 'school') return true;
  if (scope === 'grade') {
    const grades = exam.audience_grades || [];
    if (grades.length === 0) return true;
    return grades.includes(student.grade);
  }
  if (scope === 'class') {
    const classes = (exam.audience_classes || []).map(c => c.toLowerCase());
    if (classes.length === 0) return true;
    return classes.includes((student.class_name || '').toLowerCase());
  }
  if (scope === 'track') {
    const tracks = (exam.audience_tracks || []).map(t => t.toLowerCase());
    const studentTracks = (student.tracks || []).map(t => String(t).toLowerCase());
    if (tracks.length === 0) return true;
    return tracks.some(t => studentTracks.includes(t));
  }
  if (scope === 'subject') {
    const subjects = (exam.audience_subjects || []).map(s => s.toLowerCase());
    const studentSubjects = (student.subjects || []).map(s => String(s).toLowerCase());
    if (subjects.length === 0) return true;
    return subjects.some(s => studentSubjects.includes(s));
  }
  return true;
}