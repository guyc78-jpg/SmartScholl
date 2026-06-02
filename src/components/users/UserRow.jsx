import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { ROLE_LABELS, getAvailableRoles, getUserDisplayName, getRoleLabel } from '@/lib/roleUtils';
import { formatGrade, getDivisionLabel } from '@/lib/schoolStructure';

export default function UserRow({ user, selected, onSelectToggle, onEdit }) {
  const approvedRoles = getAvailableRoles(user);
  const extra = approvedRoles.filter(r => r !== user.role);
  const isDivisionManager = approvedRoles.includes('division_manager');

  // התג היחיד שמוצג למנהל/ת חטיבה (עליונה / ביניים), ללא שכבה/כיתה
  const divisionTag = isDivisionManager
    ? `${getRoleLabel('division_manager', user)}${getDivisionLabel(user.profile_division) ? ` ${getDivisionLabel(user.profile_division).replace('חטיבה ', '')}` : ''}`.trim()
    : '';

  // תגי השיוך מוצגים לפי סוג התפקיד בלבד — לא למנהל/ת חטיבה
  const showHomeroomClass = !isDivisionManager && approvedRoles.includes('homeroom_teacher');
  const showCoordinatorGrade = !isDivisionManager && approvedRoles.includes('coordinator');

  const klass = user.profile_homeroom_class || user.profile_class || '';
  const grade = user.profile_grade_managed || '';

  const classTag = showHomeroomClass && klass ? klass : '';
  const gradeTag = showCoordinatorGrade && grade ? formatGrade(grade) : '';

  return (
    <div
      className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_2fr_2fr_1fr_1fr_2fr_auto] items-center gap-2 md:gap-3 px-3 py-2 border-b last:border-b-0 hover:bg-muted/40 transition-colors"
      dir="rtl"
    >
      <Checkbox checked={selected} onCheckedChange={onSelectToggle} aria-label="בחר משתמש" />

      {/* Name + email (mobile shows both stacked) */}
      <div className="min-w-0">
        <div className="font-medium text-sm truncate">{getUserDisplayName(user)}</div>
        <div className="text-xs text-muted-foreground truncate force-ltr">{user.email}</div>
        {/* Mobile-only meta line */}
        <div className="md:hidden mt-1 flex flex-wrap gap-1.5 text-[11px]">
          {isDivisionManager ? (
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{divisionTag}</span>
          ) : (
            <>
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{ROLE_LABELS[user.role] || '—'}</span>
              {gradeTag && <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{gradeTag}</span>}
              {classTag && <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{classTag}</span>}
            </>
          )}
        </div>
      </div>

      {/* Desktop columns */}
      <div className="hidden md:block text-xs text-muted-foreground truncate force-ltr text-right">{user.email}</div>
      <div className="hidden md:flex justify-start">
        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
          {isDivisionManager ? divisionTag : (ROLE_LABELS[user.role] || '—')}
        </span>
      </div>
      <div className="hidden md:block text-sm text-muted-foreground text-right">{gradeTag || '—'}</div>
      <div className="hidden md:block text-sm text-muted-foreground text-right">{classTag || '—'}</div>
      <div className="hidden md:flex flex-wrap gap-1 justify-start">
        {extra.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
        {extra.map(r => (
          <span key={r} className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground/70 whitespace-nowrap">
            {ROLE_LABELS[r]}
          </span>
        ))}
      </div>

      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} aria-label="ערוך הרשאות">
        <Pencil className="w-4 h-4" />
      </Button>
    </div>
  );
}