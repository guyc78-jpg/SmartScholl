import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function QuickSheetSelect({ value, options, placeholder = 'בחר', onChange }) {
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);

  const selectedLabel = value || placeholder;

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const viewportOffsetTop = window.visualViewport?.offsetTop || 0;
    const desiredHeight = Math.min(options.length * 44 + 8, 224);
    const spaceBelow = viewportOffsetTop + viewportHeight - rect.bottom - 12;
    const spaceAbove = rect.top - viewportOffsetTop - 12;
    const openUp = spaceBelow < Math.min(desiredHeight, 160) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(112, Math.min(desiredHeight, openUp ? spaceAbove : spaceBelow));
    const top = openUp ? Math.max(viewportOffsetTop + 8, rect.top - maxHeight - 6) : rect.bottom + 6;

    setPosition({
      top,
      right: Math.max(8, window.innerWidth - rect.right),
      width: rect.width,
      maxHeight,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutside = event => {
      if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    const reposition = () => updatePosition();

    document.addEventListener('pointerdown', closeOnOutside, true);
    document.addEventListener('keydown', closeOnEscape, true);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    window.visualViewport?.addEventListener('resize', reposition);
    window.visualViewport?.addEventListener('scroll', reposition);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutside, true);
      document.removeEventListener('keydown', closeOnEscape, true);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      window.visualViewport?.removeEventListener('resize', reposition);
      window.visualViewport?.removeEventListener('scroll', reposition);
    };
  }, [open]);

  const menu = open && position ? createPortal(
    <div
      ref={menuRef}
      dir="rtl"
      className="fixed z-[30000] overflow-hidden rounded-xl border border-input bg-popover text-popover-foreground shadow-2xl text-right"
      style={{ top: position.top, right: position.right, width: position.width, maxHeight: position.maxHeight }}
    >
      <div className="w-full overflow-y-auto overscroll-contain p-1" style={{ maxHeight: position.maxHeight, WebkitOverflowScrolling: 'touch' }} dir="rtl">
        {options.map(option => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className={cn(
                'flex min-h-10 w-full items-center justify-start gap-2 rounded-lg px-3 py-2 text-right text-sm transition-colors',
                selected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-accent hover:text-accent-foreground'
              )}
              dir="rtl"
            >
              <span className="flex h-4 w-4 items-center justify-center flex-shrink-0">
                {selected && <Check className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1 text-right">{option}</span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex h-10 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-right text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        aria-haspopup="listbox"
        aria-expanded={open}
        dir="rtl"
      >
        <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
        <span className={cn('min-w-0 flex-1 truncate text-right', !value && 'text-muted-foreground')}>{selectedLabel}</span>
      </button>
      {menu}
    </>
  );
}