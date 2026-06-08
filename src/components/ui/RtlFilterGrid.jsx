import { cn } from '@/lib/utils';

export default function RtlFilterGrid({ children, columns = 'sm:grid-cols-2', className }) {
  return (
    <div className={cn('grid grid-cols-1 gap-2 text-right', columns, className)} dir="rtl">
      {children}
    </div>
  );
}