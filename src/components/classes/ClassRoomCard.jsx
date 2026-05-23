import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, UserRound, UsersRound, KeyRound } from 'lucide-react';
import { formatGrade } from '@/lib/schoolStructure';

export default function ClassRoomCard({ classRoom, onEdit, onDelete }) {
  return (
    <Card>
      <CardContent className="p-4" dir="rtl">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold">{classRoom.name}</h3>
              <Badge variant="secondary">שכבה {formatGrade(classRoom.grade)}</Badge>
            </div>
            <div className="grid gap-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><UserRound className="w-4 h-4" />מחנך/ת: {classRoom.homeroom_teacher_name || 'לא הוגדר'}</span>
              <span className="flex items-center gap-2"><UsersRound className="w-4 h-4" />רכז/ת: {classRoom.coordinator_name || 'לא הוגדר'}</span>
              {classRoom.class_code && <span className="flex items-center gap-2"><KeyRound className="w-4 h-4" />קוד כיתה: {classRoom.class_code}</span>}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onEdit(classRoom)}><Edit className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(classRoom)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}