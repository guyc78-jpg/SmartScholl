import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { EVENT_GROUPS } from './eventConstants';

export default function EventFilters({ activeGroup, onGroupChange, search, onSearchChange }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3" dir="rtl">
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={activeGroup === 'all' ? 'default' : 'outline'} onClick={() => onGroupChange('all')}>הכל</Button>
        {EVENT_GROUPS.map(group => (
          <Button key={group.key} size="sm" variant={activeGroup === group.key ? 'default' : 'outline'} onClick={() => onGroupChange(group.key)}>
            {group.label}
          </Button>
        ))}
      </div>
      <div className="relative lg:ms-auto lg:w-80">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => onSearchChange(e.target.value)} placeholder="חיפוש בלוח..." className="pr-9" />
      </div>
    </div>
  );
}

export const filterByGroup = (events, group) => {
  if (group === 'all') return events;
  const config = EVENT_GROUPS.find(g => g.key === group);
  if (!config) return events;
  return events.filter(event => config.types.includes(event.type));
};

export const filterBySearch = (events, search) => {
  const query = (search || '').trim().toLowerCase();
  if (!query) return events;
  return events.filter(event =>
    [event.title, event.subject, event.teacher, event.class_or_grade, event.notes, event.audience_group_label]
      .some(value => String(value || '').toLowerCase().includes(query))
  );
};