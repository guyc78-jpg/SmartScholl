import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import { Megaphone, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentAnnouncements({ announcements, reads, student, onChanged }) {
  async function confirmRead(ann) {
    if (!student) return;
    if (reads.some(r => r.announcement_id === ann.id)) { toast.info('כבר אישרת קריאה'); return; }
    await base44.entities.AnnouncementRead.create({
      announcement_id: ann.id,
      student_id: student.id,
      student_name: student.full_name,
      read_at: new Date().toISOString(),
    });
    toast.success('אישור קריאה נשלח!');
    onChanged?.();
  }

  if (!announcements?.length) return null;

  return (
    <Card dir="rtl" className="text-right">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2"><Megaphone className="w-4 h-4 text-amber-500" />הודעות</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {announcements.slice(0, 4).map(ann => {
          const alreadyRead = reads.some(r => r.announcement_id === ann.id);
          return (
            <div key={ann.id} className={`p-3 rounded-xl ${ann.type === 'חשובה' ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30' : 'bg-muted/50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={ann.type} />
                {alreadyRead && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full">קראתי ✓</span>}
              </div>
              <p className="text-sm font-medium">{ann.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{ann.content}</p>
              {ann.requires_confirmation && !alreadyRead && (
                <Button size="sm" variant="outline" className="mt-2 gap-1.5 text-xs h-7" onClick={() => confirmRead(ann)}>
                  <Check className="w-3 h-3" />אישור קריאה
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}