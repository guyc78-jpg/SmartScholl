import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserRound, School } from 'lucide-react';
import { formatGrade } from '@/lib/schoolStructure';
import { getClassDisplayName } from '@/lib/classIdentity';

export default function ClassAssignmentCard({ classRoom, teachers, canAssign, saving, onAssign }) {
  const [teacherId, setTeacherId] = useState(classRoom.assigned_teacher_id || '');
  const changed = teacherId !== (classRoom.assigned_teacher_id || '');

  return (
    <Card className="h-full" dir="rtl">
      <CardContent className="flex h-full flex-col gap-4 p-4 text-right">
        <div className="space-y-2">
          <div className="flex items-center justify-start gap-2 flex-wrap">
            <School className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-bold text-foreground">{getClassDisplayName(classRoom, classRoom.name)}</h3>
            <Badge variant="secondary">שכבה {formatGrade(classRoom.grade)}</Badge>
          </div>
          <p className="flex items-center justify-start gap-2 text-sm text-muted-foreground">
            <UserRound className="h-4 w-4" />
            מחנך/ת נוכחי/ת: {classRoom.homeroom_teacher_name || 'לא הוגדר'}
          </p>
        </div>

        {canAssign ? (
          <div className="mt-auto space-y-2 text-right">
            <label className="text-sm font-medium text-foreground">שיוך מחנך/ת</label>
            <select
              value={teacherId}
              onChange={event => setTeacherId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-right text-sm"
              dir="rtl"
            >
              <option value="">ללא מחנך/ת</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.fullName} — {teacher.email}</option>
              ))}
            </select>
            <Button className="w-full" disabled={!changed || saving} onClick={() => onAssign(classRoom, teacherId)}>
              {saving ? 'שומר...' : 'שמור שיוך'}
            </Button>
          </div>
        ) : (
          <div className="mt-auto rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground text-right">
            ניתן לצפות בכיתה שהוגדרה לך, ללא שינוי שיוך או מגמה.
          </div>
        )}
      </CardContent>
    </Card>
  );
}