import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { formatStudentName } from '@/lib/studentName';

export default function CommunityExceptionRow({ student, onStudentWhatsApp, onParentsWhatsApp }) {
  const doneHours = Number(student.community_service_done ?? 0);
  const goalHours = Number(student.community_service_goal ?? 60);
  const missingHours = Math.max(0, goalHours - doneHours);
  const classLabel = student.class_name || student.class_id || 'ללא כיתה';
  const statusLabel = doneHours <= 0 ? 'לא התחיל/ה' : `חסרות ${missingHours} שעות`;
  const statusClasses = doneHours <= 0
    ? 'bg-destructive/10 text-destructive border-destructive/20'
    : 'bg-secondary/15 text-secondary-foreground border-secondary/30';
  const studentName = formatStudentName(student) || 'ללא שם';

  return (
    <div className="rounded-2xl border bg-card p-2.5 text-right" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1 text-right">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-bold text-foreground">{studentName}</p>
              <p className="text-[11px] text-muted-foreground">{classLabel}{student.grade ? ` • שכבה ${student.grade}` : ''}</p>
            </div>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClasses}`}>
              {statusLabel}
            </span>
          </div>

          <div className="flex flex-wrap justify-end gap-2 text-[11px]">
            <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">בוצעו: {doneHours}</span>
            <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">חסרות: {missingHours}</span>
            <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">יעד: {goalHours}</span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap justify-end gap-2" dir="rtl">
        <Button size="sm" variant="outline" className="gap-2" onClick={() => onStudentWhatsApp(student)}>
          <MessageCircle className="h-4 w-4" />
          הודעה מוכנה לתלמיד
        </Button>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => onParentsWhatsApp(student)}>
          <MessageCircle className="h-4 w-4" />
          הודעה מוכנה להורים
        </Button>
      </div>
    </div>
  );
}