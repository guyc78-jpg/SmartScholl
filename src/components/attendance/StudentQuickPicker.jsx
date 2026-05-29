import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { formatStudentName } from '@/lib/studentName';

export default function StudentQuickPicker({ open, onClose, students, title, onSelect, excludeIds = [] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const exclude = new Set(excludeIds);
    const available = students.filter(s => !exclude.has(s.id));
    if (!q.trim()) return available;
    const term = q.trim().toLowerCase();
    return available.filter(s => s.full_name?.toLowerCase().includes(term));
  }, [students, q, excludeIds]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0" dir="rtl">
        <DialogHeader className="p-4 border-b text-right">
          <DialogTitle className="text-right">{title}</DialogTitle>
        </DialogHeader>
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="חפש שם תלמיד/ה..."
              className="pr-9 text-right"
            />
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {students.length === 0 ? 'אין תלמידים' : 'לא נמצאו תלמידים תואמים'}
            </div>
          ) : (
            filtered.map(s => (
              <button
                key={s.id}
                onClick={() => { onSelect(s); setQ(''); }}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors text-right"
                dir="rtl"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                  ${s.gender === 'נקבה' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                  {s.full_name?.charAt(0)}
                </div>
                <span className="flex-1 text-sm font-medium text-right">{formatStudentName(s.full_name)}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}