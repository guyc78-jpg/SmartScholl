import { Button } from '@/components/ui/button';
import { Pin, CheckCircle2, Pencil, Trash2, Calendar, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CATEGORY_EMOJI, PRIORITY_TONE, dueDateHint, isClosed } from './urgentFlagUtils';

const TONE_STYLES = {
  urgent: { dot: 'bg-destructive', badge: 'bg-destructive/10 text-destructive ring-destructive/15' },
  warn:   { dot: 'bg-rose-500',    badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/15' },
  info:   { dot: 'bg-primary',     badge: 'bg-primary/10 text-primary ring-primary/15' },
};

const STATUS_STYLES = {
  'פתוח':   'bg-muted text-foreground/70 ring-border',
  'בטיפול': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/15',
  'טופל':   'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/15',
};

/**
 * A single urgent flag row — clean card with priority bar, category chip,
 * due-date hint and inline menu (edit / pin / resolve / delete).
 */
export default function UrgentFlagItem({ flag, canManage, onEdit, onTogglePin, onToggleStatus, onDelete }) {
  const tone = TONE_STYLES[PRIORITY_TONE[flag.priority] || 'info'];
  const closed = isClosed(flag);
  const dateHint = dueDateHint(flag.due_date);

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 p-3 rounded-xl bg-background/60 border border-border/70 transition-colors',
        'hover:bg-background hover:border-border',
        closed && 'opacity-60'
      )}
    >
      {/* Priority accent bar on the leading edge */}
      <span className={cn('absolute top-3 bottom-3 right-0 w-[3px] rounded-l-full', tone.dot)} aria-hidden />

      {/* Category emoji chip */}
      <div className="w-9 h-9 rounded-lg bg-muted/70 ring-1 ring-border flex items-center justify-center flex-shrink-0 ms-1 text-lg leading-none">
        <span aria-hidden>{CATEGORY_EMOJI[flag.category] || '📌'}</span>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {flag.is_pinned && <Pin className="w-3 h-3 text-primary flex-shrink-0" aria-label="מוצמד" />}
          <p className={cn('text-[13px] font-semibold text-foreground leading-tight truncate', closed && 'line-through')}>
            {flag.title}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span className={cn('text-[10.5px] font-medium px-1.5 py-0.5 rounded-md ring-1', tone.badge)}>
            {flag.priority}
          </span>
          <span className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-md bg-muted/80 text-muted-foreground ring-1 ring-border">
            {flag.category}
          </span>
          <span className={cn('text-[10.5px] font-medium px-1.5 py-0.5 rounded-md ring-1', STATUS_STYLES[flag.status] || STATUS_STYLES['פתוח'])}>
            {flag.status}
          </span>
          {dateHint && (
            <span className="text-[10.5px] text-muted-foreground inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />{dateHint}
            </span>
          )}
        </div>

        {flag.note && (
          <p className="text-[11.5px] text-muted-foreground mt-1.5 line-clamp-2">{flag.note}</p>
        )}
      </div>

      {/* Actions */}
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 opacity-60 hover:opacity-100">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onClick={() => onEdit?.(flag)}>
              <Pencil className="w-4 h-4" /> ערוך
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTogglePin?.(flag)}>
              <Pin className="w-4 h-4" /> {flag.is_pinned ? 'בטל הצמדה' : 'הצמד לראש'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleStatus?.(flag)}>
              <CheckCircle2 className="w-4 h-4" /> {closed ? 'החזר לפתוח' : 'סמן כטופל'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete?.(flag)}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" /> מחק
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}