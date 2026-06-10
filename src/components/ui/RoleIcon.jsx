import { cn } from '@/lib/utils';

// אימוג'י צבעוני לפי תפקיד — מוצג מימין לשם התפקיד (RTL)
const ROLE_EMOJIS = {
  student: '🎓',
  homeroom_teacher: '📘',
  grade_coordinator: '👥',
  coordinator: '👥',
  division_manager: '🛡️',
  system_admin: '⚙️',
  admin: '⚙️',
};

export default function RoleIcon({ role, roles = [], className }) {
  const isAdmin = roles.includes('system_admin') || roles.includes('admin');
  const isHomeroom = roles.includes('homeroom_teacher');
  // ⚙️ מנהל/ת מערכת ומחנך/ת
  const emoji = isAdmin && isHomeroom ? '⚙️' : ROLE_EMOJIS[role];
  if (!emoji) return null;
  return (
    <span
      className={cn('text-sm leading-none flex-shrink-0', className)}
      role="img"
      aria-hidden="true"
    >
      {emoji}
    </span>
  );
}