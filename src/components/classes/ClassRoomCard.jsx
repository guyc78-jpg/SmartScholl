import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Trash2, UserRound, UsersRound, KeyRound } from 'lucide-react';
import { getClassDisplayName } from '@/lib/classIdentity';

const cleanStaffName = (value) => String(value || '')
  .replace(/[–—-]\s*[^\s]+@[^\s]+/g, '')
  .replace(/\b[^\s]+@[^\s]+\b/g, '')
  .trim();

export default function ClassRoomCard({ classRoom, onEdit, onDelete, canManage = true }) {
  return (
    <Card className="h-full">
      <CardContent className="p-4 h-full" dir="rtl">
        <div className="flex items-start justify-between gap-3 h-full">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center justify-start gap-2 flex-wrap text-right" dir="rtl">
              <h3 className="text-lg font-bold">{getClassDisplayName(classRoom, classRoom.name)}</h3>
            </div>
            <div className="grid gap-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><UserRound className="w-4 h-4" />מחנך/ת: {cleanStaffName(classRoom.homeroom_teacher_name) || 'לא הוגדר'}</span>
              <span className="flex items-center gap-2"><UsersRound className="w-4 h-4" />רכז/ת: {cleanStaffName(classRoom.coordinator_name) || 'לא הוגדר'}</span>
              {classRoom.counselor_name && <span className="flex items-center gap-2"><UsersRound className="w-4 h-4" />יועץ/ת: {cleanStaffName(classRoom.counselor_name)}</span>}
              {classRoom.class_code && <span className="flex items-center gap-2"><KeyRound className="w-4 h-4" />קוד כיתה: {classRoom.class_code}</span>}
            </div>
          </div>
          {canManage && (
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={() => onEdit(classRoom)} aria-label={'עריכת כיתה: ' + (classRoom.name || 'ללא שם')}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(classRoom)} aria-label={'מחיקת כיתה: ' + (classRoom.name || 'ללא שם')}><Trash2 className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
