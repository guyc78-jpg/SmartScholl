import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { getEventTypeClasses } from './EventTypeBadge';

const TYPE_GROUPS = [
  { key: 'exams', label: 'מבחנים', types: ['בגרות', 'מתכונת', 'מועד ב׳', 'מבחן', 'בחן'] },
  { key: 'tasks', label: 'מטלות', types: ['עבודה', 'פרויקט', 'הגשה'] },
  { key: 'events', label: 'אירועים', types: ['אירוע שכבתי', 'חזרה', 'חג'] }
];

export default function EventFilters({ activeGroup, onGroupChange, search = '', onSearchChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2" dir="rtl">
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeGroup === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onGroupChange('all')}
        >
          הכל
        </Button>
        {TYPE_GROUPS.map(group => (
          <Button
            key={group.key}
            variant={activeGroup === group.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => onGroupChange(group.key)}
          >
            {group.label}
          </Button>
        ))}
      </div>
      {onSearchChange && (
        <div className="relative ms-auto min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="חיפוש אירוע..."
            className="pr-8 h-9"
          />
        </div>
      )}
    </div>
  );
}

export const filterByGroup = (exams, group) => {
  if (group === 'all') return exams;
  const groupConfig = TYPE_GROUPS.find(g => g.key === group);
  if (!groupConfig) return exams;
  return exams.filter(e => groupConfig.types.includes(e.type));
};

export const filterBySearch = (exams, search) => {
  const q = (search || '').trim().toLowerCase();
  if (!q) return exams;
  return exams.filter(e =>
    (e.title || '').toLowerCase().includes(q) ||
    (e.subject || '').toLowerCase().includes(q) ||
    (e.teacher || '').toLowerCase().includes(q) ||
    (e.notes || '').toLowerCase().includes(q)
  );
};

export const ALL_TYPE_GROUPS = TYPE_GROUPS;
export { getEventTypeClasses };