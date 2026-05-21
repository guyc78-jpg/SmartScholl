import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { School } from 'lucide-react';
import { cn } from '@/lib/utils';

// Loads the school name from any admin user's profile.
// Displayed subtly — never large, never noisy.
let cachedSchoolName = null;
let cachedPromise = null;

async function fetchSchoolName() {
  if (cachedSchoolName !== null) return cachedSchoolName;
  if (cachedPromise) return cachedPromise;
  cachedPromise = (async () => {
    const admins = await base44.entities.User.filter({ role: 'admin' }).catch(() => []);
    const withName = (admins || []).find(u => u?.school_name && String(u.school_name).trim());
    cachedSchoolName = withName?.school_name?.trim() || '';
    return cachedSchoolName;
  })();
  return cachedPromise;
}

export function invalidateSchoolNameCache() {
  cachedSchoolName = null;
  cachedPromise = null;
}

export default function SchoolNameBanner({ className, withIcon = true, size = 'sm', inline = false }) {
  const [name, setName] = useState(cachedSchoolName || '');

  useEffect(() => {
    let active = true;
    fetchSchoolName().then(value => { if (active) setName(value); });
    return () => { active = false; };
  }, []);

  if (!name) return null;

  if (inline) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-foreground/70 font-medium', className)} dir="rtl">
        <span>{name}</span>
        <span aria-hidden className="text-muted-foreground/60">·</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-muted-foreground/80',
        size === 'xs' ? 'text-[11px]' : 'text-xs',
        className
      )}
      dir="rtl"
    >
      {withIcon && <School className="w-3 h-3 opacity-70 flex-shrink-0" strokeWidth={2} />}
      <span className="truncate">{name}</span>
    </span>
  );
}