import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function TeacherMappingTable({ mappings = [], overrides, onChange }) {
  if (!mappings.length) return <p className="text-sm text-muted-foreground text-right">אין מחנכים להעברה לפי הכיתות הפעילות.</p>;
  return (
    <div className="space-y-2" dir="rtl">
      {mappings.map((item) => {
        const value = overrides[item.targetClassId] || item;
        return (
          <div key={item.targetClassId} className="grid md:grid-cols-4 gap-2 rounded-xl border bg-card p-3 text-right">
            <div><p className="font-medium">{item.sourceClassName} ← {item.targetClassName}</p>{item.hasExistingTargetTeacher && <Badge variant="destructive">יש מחנך יעד קיים</Badge>}</div>
            <Input value={value.teacherName || ''} onChange={(e) => onChange(item.targetClassId, 'teacherName', e.target.value)} placeholder="שם מחנך/ת" />
            <Input value={value.teacherEmail || ''} onChange={(e) => onChange(item.targetClassId, 'teacherEmail', e.target.value)} placeholder="אימייל מחנך/ת" />
            <p className="text-xs text-muted-foreground">יעד נוכחי: {item.targetTeacherName || 'ללא'} {item.targetTeacherEmail ? `· ${item.targetTeacherEmail}` : ''}</p>
          </div>
        );
      })}
    </div>
  );
}