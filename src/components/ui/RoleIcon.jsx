import { GraduationCap, BookOpen, UsersRound, ShieldCheck, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

// אייקון מותאם לפי תפקיד — מוצג מימין לשם התפקיד (RTL)
const ROLE_ICONS = {
  student: GraduationCap,
  homeroom_teacher: BookOpen,
  grade_coordinator: UsersRound,
  coordinator: UsersRound,
  division_manager: ShieldCheck,
  system_admin: Settings,
  admin: Settings,
};

export default function RoleIcon({ role, className }) {
  const Icon = ROLE_ICONS[role];
  if (!Icon) return null;
  return (
    <Icon
      className={cn('w-[18px] h-[18px] flex-shrink-0 text-muted-foreground/70', className)}
      strokeWidth={1.8}
      aria-hidden="true"
    />
  );
}