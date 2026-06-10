import { GraduationCap, BookOpen, UsersRound, ShieldCheck, Settings, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';

// אייקון צבעוני מותאם לפי תפקיד — מוצג מימין לשם התפקיד (RTL)
const ROLE_ICONS = {
  student: { Icon: GraduationCap, color: 'text-indigo-500 dark:text-indigo-400' },          // 🎓
  homeroom_teacher: { Icon: BookOpen, color: 'text-blue-600 dark:text-blue-400' },          // 📘
  grade_coordinator: { Icon: UsersRound, color: 'text-violet-500 dark:text-violet-400' },   // 👥
  coordinator: { Icon: UsersRound, color: 'text-violet-500 dark:text-violet-400' },         // 👥
  division_manager: { Icon: ShieldCheck, color: 'text-emerald-600 dark:text-emerald-400' }, // 🛡️
  system_admin: { Icon: Settings, color: 'text-slate-500 dark:text-slate-400' },            // ⚙️
  admin: { Icon: Settings, color: 'text-slate-500 dark:text-slate-400' },                   // ⚙️
};

export default function RoleIcon({ role, roles = [], className }) {
  const isAdmin = roles.includes('system_admin') || roles.includes('admin');
  const isHomeroom = roles.includes('homeroom_teacher');
  // אייקון מיוחד: גם מחנך/ת וגם מנהל/ת מערכת
  const entry = isAdmin && isHomeroom
    ? { Icon: UserCog, color: 'text-amber-600 dark:text-amber-400' }
    : ROLE_ICONS[role];
  if (!entry) return null;
  const { Icon, color } = entry;
  return (
    <Icon
      className={cn('w-[18px] h-[18px] flex-shrink-0', color, className)}
      strokeWidth={1.8}
      aria-hidden="true"
    />
  );
}