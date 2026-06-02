import { cn } from '@/lib/utils';
import { GraduationCap, UserCheck, Users, Building2 } from 'lucide-react';
import { SIMULATABLE_ROLES } from '@/lib/permissionsMatrix';

const ROLE_ICONS = {
  student: GraduationCap,
  homeroom_teacher: UserCheck,
  coordinator: Users,
  division_manager: Building2,
};

export default function RoleSelector({ selectedRole, onSelect }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5" dir="rtl">
      {SIMULATABLE_ROLES.map(role => {
        const Icon = ROLE_ICONS[role.value];
        const active = selectedRole === role.value;
        return (
          <button
            key={role.value}
            type="button"
            onClick={() => onSelect(role.value)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-3 rounded-xl border text-right transition-colors',
              active
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-foreground border-border hover:bg-muted/60'
            )}
          >
            <Icon className={cn('w-5 h-5 flex-shrink-0', active ? 'text-primary-foreground' : 'text-primary')} />
            <span className="text-sm font-semibold flex-1 text-right">{role.label}</span>
          </button>
        );
      })}
    </div>
  );
}