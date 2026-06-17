import RtlChipButton from '@/components/ui/RtlChipButton';
import RtlSearchField from '@/components/ui/RtlSearchField';
import { cn } from '@/lib/utils';
import { EVENT_GROUPS } from './eventConstants';

const ACTIVE_CHIP_STYLE = 'bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/25 dark:bg-primary dark:text-primary-foreground dark:border-primary';

export default function EventFilters({ activeGroup, onGroupChange, search, onSearchChange }) {
  const groups = [{ key: 'all', label: 'הכל' }, ...EVENT_GROUPS];

  return (
    <div className="rounded-2xl border bg-card p-3 space-y-3" dir="rtl">
      {/* Search field — full width */}
      <RtlSearchField
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="חיפוש לפי שם, מקצוע, כיתה או קבוצה..."
        inputClassName="h-9"
      />

      {/* Chips — uniform size, symmetric flex rows that always fill the full width */}
      <div className="flex flex-wrap gap-2" dir="rtl">
        {groups.map(group => {
          const active = activeGroup === group.key;
          return (
            <RtlChipButton
              key={group.key}
              active={active}
              onClick={() => onGroupChange(group.key)}
              className={cn(
                'h-9 flex-1 basis-[30%] min-w-[30%] justify-center px-2 text-[13px] whitespace-nowrap',
                active ? ACTIVE_CHIP_STYLE : 'bg-muted/50 text-foreground hover:bg-muted/80 border-border/60'
              )}
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