import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import StatusBadge from '@/components/ui/StatusBadge';
import { ChevronLeft, ClipboardCheck, MessageSquare, Phone } from 'lucide-react';
import { formatStudentName } from '@/lib/studentName';

export default function StudentCard({ student, communityPct, onParentConversation, onPerformanceReview, classIdentityLabel = '' }) {
  const avatarClass = student.status === 'דורש מעקב'
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : student.gender === 'נקבה'
      ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';

  const phone = student.phone || student.parent1_phone;
  const progress = Math.min(communityPct(student), 100);
  const progressClass = communityPct(student) >= 100 ? 'bg-emerald-500' : communityPct(student) >= 50 ? 'bg-blue-500' : 'bg-red-400';

  return (
    <Link to={`/students/${student.id}`}>
      <Card className="cursor-pointer border p-4 text-right transition-colors hover:border-primary/30 hover:shadow-md" dir="rtl">
        <div className="grid grid-cols-[auto,1fr,auto] items-start gap-3" dir="rtl">
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-base font-bold ${avatarClass}`}>
            {formatStudentName(student).charAt(0)}
          </div>

          <div className="min-w-0 text-right">
            <div className="mb-1 flex items-center justify-start gap-2" dir="rtl">
              <h3 className="text-sm font-semibold leading-tight text-foreground">{formatStudentName(student)}</h3>
              {student.status && student.status !== 'פעיל' && <StatusBadge status={student.status} />}
            </div>
            <p className="text-xs text-muted-foreground">
              {classIdentityLabel || student.class_name || 'ללא שיוך כיתה'}
              {student.grade ? ` · ${student.grade}` : ''}
            </p>

            <div className="mt-1.5 flex flex-wrap justify-start gap-3" dir="rtl">
              {phone && (
                <a href={`tel:${phone}`} className="flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80">
                  <Phone className="h-3 w-3 text-primary" />{phone}
                </a>
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onParentConversation(student);
                }}
                className="flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
              >
                <MessageSquare className="h-3 w-3 text-primary" />
                הוסף שיחת הורה
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onPerformanceReview(student);
                }}
                className="flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
              >
                <ClipboardCheck className="h-3 w-3 text-primary" />
                הערכת תפקוד
              </button>
            </div>

            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs" dir="rtl">
                <span className="text-muted-foreground">מעורבות חברתית</span>
                <span className="font-medium">{student.community_service_done || 0}/{student.community_service_goal || 60} שע׳</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full transition-all ${progressClass}`} style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <ChevronLeft className="mt-1 h-4 w-4 flex-shrink-0 justify-self-end text-muted-foreground" />
        </div>
      </Card>
    </Link>
  );
}
