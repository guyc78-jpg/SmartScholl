import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { EVENT_GROUPS } from './eventConstants';

const GROUP_STYLES = {
  all: 'bg-primary text-primary-foreground border-primary',
  academic: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-900/50',
  tasks: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/50',
  activities: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-900/50',
  holidays: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-900/50'
};

export default function EventFilters({ activeGroup, onGroupChange, search, onSearchChange }) {
  const groups = [{ key: 'all', label: 'הכל' }, ...EVENT_GROUPS];
  return (
    <div className="rounded-2xl border bg-card p-2.5 space-y-2" dir="rtl">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => onSearchChange(e.target.value)} placeholder="חיפוש לפי שם, מקצוע, כיתה או קבוצה..." className="pr-9 h-9" />
      </div>
      <div className="flex flex-wrap gap-2 pb-1">
        {groups.map(group => {
          const active = activeGroup === group.key;
          return (
            <Button
              key={group.key}
              size="sm"
              variant="outline"
              onClick={() => onGroupChange(group.key)}
              className={`h-8 rounded-full whitespace-nowrap border ${active ? GROUP_STYLES[group.key] : 'bg-background/60'}`}
            >
              {group.label}
            </Button>
          );
        })}
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