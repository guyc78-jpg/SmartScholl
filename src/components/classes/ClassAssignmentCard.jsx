import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserRound, School } from 'lucide-react';
import { getClassDisplayName } from '@/lib/classIdentity';
import ClassIdentityEditor from '@/components/classes/ClassIdentityEditor';

const cleanStaffName = (value) => String(value || '')
  .replace(/[–—-]\s*[^\s]+@[^\s]+/g, '')
  .replace(/\b[^\s]+@[^\s]+\b/g, '')
  .trim();

export default function ClassAssignmentCard({ classRoom, teachers, canAssign, canEditIdentity, saving, savingIdentity, onAssign, onIdentityChange }) {
  const [teacherId, setTeacherId] = useState(classRoom.assigned_teacher_id || '');
  const changed = teacherId !== (classRoom.assigned_teacher_id || '');

  return (
    <Card className="h-full" dir="rtl">
      <CardContent className="flex h-full flex-col gap-4 p-4 text-right">
        <div className="space-y-2">
        <div className="flex items-center justify-start gap-2 flex-wrap text-right" dir="rtl">
          <School className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-bold text-foreground">{getClassDisplayName(classRoom, classRoom.name)}</h3>
        </div>
          <p className="flex items-center justify-start gap-2 text-sm text-muted-foreground">
            <UserRound className="h-4 w-4" />
            מחנך/ת נוכחי/ת: {cleanStaffName(classRoom.homeroom_teacher_name) || 'לא הוגדר'}
          </p>
        </div>

        <ClassIdentityEditor
          classRoom={classRoom}
          canEdit={canEditIdentity}
          saving={savingIdentity}
          onSave={onIdentityChange}
        />

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
                <option key={teacher.id} value={teacher.id}>{cleanStaffName(teacher.fullName)}</option>
              ))}
            </select>
            <Button className="w-full" disabled={!changed || saving} onClick={() => onAssign(classRoom, teacherId)}>
              {saving ? 'שומר...' : 'שמור שיוך'}
            </Button>
          </div>
        ) : (
          <div className="mt-auto rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground text-right">
            ניתן לצפות בכיתה שהוגדרה לך, ללא שינוי שיוך.
          </div>
        )}
      </CardContent>
    </Card>
  );
}