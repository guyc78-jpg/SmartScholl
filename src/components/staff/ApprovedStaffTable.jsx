import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';

const roleLabel = { homeroom_teacher: 'מחנך/ת', coordinator: 'רכז/ת שכבה' };
const statusLabel = { waiting: 'ממתין להתחברות', active: 'פעיל', disabled: 'מבוטל' };

export default function ApprovedStaffTable({ staff, onDelete }) {
  if (!staff.length) return <div className="bg-card rounded-2xl border p-6 text-center text-muted-foreground">עדיין אין אנשי צוות מאושרים.</div>;

  return (
    <div className="bg-card rounded-2xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">שם</TableHead>
            <TableHead className="text-right">אימייל</TableHead>
            <TableHead className="text-right">תפקיד</TableHead>
            <TableHead className="text-right">שיוך</TableHead>
            <TableHead className="text-right">סטטוס</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map(item => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.full_name}</TableCell>
              <TableCell className="force-ltr text-left">{item.email}</TableCell>
              <TableCell>{roleLabel[item.role] || item.role}</TableCell>
              <TableCell>{item.role === 'coordinator' ? `שכבה ${item.grade || '-'}` : item.class_name || item.grade || '-'}</TableCell>
              <TableCell><Badge variant={item.status === 'active' ? 'default' : 'outline'}>{statusLabel[item.status] || 'ממתין'}</Badge></TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}