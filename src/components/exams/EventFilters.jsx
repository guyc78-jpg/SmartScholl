import RtlChipButton from '@/components/ui/RtlChipButton';
import RtlSearchField from '@/components/ui/RtlSearchField';
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
  const chipCount = groups.length;
  const chipsPerRow = Math.ceil(chipCount / 2);
  
  return (
    <div className="rounded-2xl border bg-card p-3 space-y-3" dir="rtl">
      {/* Search field — full width */}
      <RtlSearchField
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="חיפוש לפי שם, מקצוע, כיתה או קבוצה..."
        inputClassName="h-9"
      />
      
      {/* Chips grid — 2 balanced rows */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${chipsPerRow}, minmax(0, 1fr))` }}>
        {groups.map(group => {
          const active = activeGroup === group.key;
          return (
            <RtlChipButton
              key={group.key}
              active={active}
              onClick={() => onGroupChange(group.key)}
              className={active ? GROUP_STYLES[group.key] : 'bg-muted/50 text-foreground hover:bg-muted/80 border-border/60'}
            >
              {group.label}
            </RtlChipButton>
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
    [event.title, event.subject, event.custom_event_type, event.teacher, event.class_or_grade, event.notes, event.audience_group_label]
      .some(value => String(value || '').toLowerCase().includes(query))
  );
};