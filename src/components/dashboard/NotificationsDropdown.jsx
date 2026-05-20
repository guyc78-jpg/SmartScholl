import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotificationsDropdown({ notifications }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const count = notifications.length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative z-50" dir="rtl">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        className="h-10 min-w-10 px-3 gap-2 relative z-50"
      >
        <Bell className="w-4 h-4" />
        <span className="hidden sm:inline">התראות</span>
        {count > 0 && (
          <span className="min-w-5 h-5 px-1 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
            {count}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-[100] w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm text-foreground">התראות</p>
          </div>

          {count === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              אין התראות חדשות
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {notifications.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}