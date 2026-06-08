import { cn } from '@/lib/utils';

export default function RtlActionBar({ primary, secondary, more, className }) {
  return (
    <div className={cn('flex w-full flex-wrap items-center justify-start gap-2 text-right', className)} dir="rtl">
      {primary}
      {secondary}
      {more && <div className="ms-auto flex items-center">{more}</div>}
    </div>
  );
}