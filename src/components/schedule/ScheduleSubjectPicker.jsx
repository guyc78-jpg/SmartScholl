import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export default function ScheduleSubjectPicker({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const matches = useMemo(() => options.filter(option => option.includes(query.trim())), [options, query]);
  const choose = option => { onChange(option); setOpen(false); setQuery(''); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input px-3 text-right text-sm" dir="rtl">
          <span className={cn('min-w-0 flex-1 truncate text-right', !value && 'text-muted-foreground')}>{value || 'בחר מקצוע'}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" collisionPadding={16} className="w-[calc(100vw-2rem)] max-w-sm overflow-hidden p-2" dir="rtl">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="חיפוש מקצוע" className="h-9 pr-9" autoFocus />
        </div>
        <div className="max-h-40 overflow-y-auto overscroll-contain" dir="rtl">
          {matches.map(option => (
            <button key={option} type="button" onClick={() => choose(option)} className={cn('flex min-h-9 w-full items-center justify-start gap-2 rounded-lg px-3 py-1.5 text-right text-sm', value === option ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-accent')}>
              <Check className={cn('h-4 w-4 shrink-0', value === option ? 'opacity-100' : 'opacity-0')} />
              <span className="min-w-0 flex-1 text-right">{option}</span>
            </button>
          ))}
          {!matches.length && <p className="px-3 py-4 text-right text-sm text-muted-foreground">לא נמצאו מקצועות</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}