import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export default function ReinforcementTypePicker({ value, onChange, options }) {
  const [open, setOpen] = useState(false);

  const selectOption = option => {
    onChange(option);
    setOpen(false);
  };

  return (
    <div className="w-full text-right" dir="rtl">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className={cn(
              'w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors',
              'flex items-center justify-start gap-2 text-right hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              !value && 'text-muted-foreground'
            )}
          >
            <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
            <span className="flex-1 text-right truncate">{value || 'בחר סוג חיזוק'}</span>
          </button>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={16}
          className="z-[10050] w-[var(--radix-popover-trigger-width)] min-w-[14rem] p-1 overflow-visible rounded-xl border bg-popover shadow-xl"
        >
          <div className="text-right" dir="rtl">
            {options.map(option => {
              const selected = option === value;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectOption(option)}
                  className={cn(
                    'w-full flex items-center justify-start gap-2 rounded-md px-2.5 py-1.5 text-right text-sm transition-colors',
                    selected ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    {selected && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span className="flex-1 text-right">{option}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}