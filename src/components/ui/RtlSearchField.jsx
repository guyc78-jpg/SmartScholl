import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function RtlSearchField({ value, onChange, placeholder, className, inputClassName }) {
  return (
    <div className={cn('relative w-full text-right', className)} dir="rtl">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn('h-10 ps-9 pe-3 text-right', inputClassName)}
      />
    </div>
  );
}