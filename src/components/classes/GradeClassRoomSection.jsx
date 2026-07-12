import { ChevronDown, School } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ClassRoomCard from '@/components/classes/ClassRoomCard';
import { cn } from '@/lib/utils';
import { formatGrade } from '@/lib/schoolStructure';

export default function GradeClassRoomSection({ grade, classes, isOpen, onToggle, onEdit, onDelete, canManage }) {
  return (
    <section className="rounded-2xl border bg-card/70 overflow-hidden" dir="rtl">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-4 text-right hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div className="min-w-0 text-right">
            <h2 className="text-lg font-bold text-foreground">שכבה {formatGrade(grade)}</h2>
            <p className="text-sm text-muted-foreground">{classes.length} כיתות בשכבה</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary">{formatGrade(grade)}</Badge>
          <ChevronDown className={cn('w-5 h-5 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
        </div>
      </button>

      {isOpen && (
        <div className="border-t p-3 sm:p-4">
          {classes.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-background/60 p-4 text-sm text-muted-foreground text-right">
              אין כיתות פעילות בשכבה זו.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {classes.map(classRoom => (
                <ClassRoomCard
                  key={classRoom.id}
                  classRoom={classRoom}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}