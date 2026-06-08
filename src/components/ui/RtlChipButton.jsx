import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function RtlChipButton({ active, className, children, ...props }) {
  return (
    <Button
      size="sm"
      variant={active ? 'default' : 'outline'}
      className={cn('h-8 rounded-full border px-3 text-sm font-medium transition-colors', className)}
      {...props}
    >
      {children}
    </Button>
  );
}