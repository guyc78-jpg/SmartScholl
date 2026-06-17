import { useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

function ReinforcementOptions({ options, value, onSelect }) {
  return (
    <div className="max-h-[min(17rem,calc(100dvh-8rem))] overflow-y-auto overscroll-contain p-1 text-right" dir="rtl">
      {options.map(option => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={cn(
              'w-full flex items-center justify-start gap-3 rounded-lg px-3 py-3 text-right text-sm transition-colors',
              selected ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              {selected && <Check className="w-4 h-4" />}
            </span>
            <span className="flex-1 text-right leading-relaxed">{option}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function ReinforcementTypePicker({ value, onChange, options }) {
  const triggerRef = useRef(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openPicker = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    const needsSheet = window.matchMedia('(max-width: 640px)').matches || (rect && window.innerHeight - rect.bottom < 260 && rect.top < 260);
    if (needsSheet) setSheetOpen(true);
    else setPopoverOpen(true);
  };

  const selectOption = option => {
    onChange(option);
    setPopoverOpen(false);
    setSheetOpen(false);
  };

  return (
    <div className="w-full text-right" dir="rtl">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverAnchor asChild>
          <button
            ref={triggerRef}
            type="button"
            onClick={openPicker}
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
          sideOffset={8}
          collisionPadding={16}
          className="z-[10050] w-[var(--radix-popover-trigger-width)] min-w-[16rem] p-0 overflow-hidden rounded-xl border bg-popover shadow-xl"
        >
          <ReinforcementOptions options={options} value={value} onSelect={selectOption} />
        </PopoverContent>
      </Popover>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="z-[10050] h-auto max-h-[min(20rem,calc(100dvh-var(--app-mobile-overlay-bottom-space)-1rem))] rounded-t-2xl p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] [&>button]:hidden"
          dir="rtl"
        >
          <ReinforcementOptions options={options} value={value} onSelect={selectOption} />
        </SheetContent>
      </Sheet>
    </div>
  );
}