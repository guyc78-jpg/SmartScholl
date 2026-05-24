import { Button } from '@/components/ui/button';
import { getEventTypeClasses } from './EventTypeBadge';

const TYPE_GROUPS = [
  { key: 'exams', label: 'מבחנים', types: ['בגרות', 'מתכונת', 'מועד ב׳', 'מבחן', 'בחן'] },
  { key: 'tasks', label: 'מטלות', types: ['עבודה', 'פרויקט', 'הגשה'] },
  { key: 'events', label: 'אירועים', types: ['אירוע שכבתי', 'חזרה', 'חג'] }
];

export default function EventFilters({ activeGroup, onGroupChange }) {
  return (
    <div className="flex gap-2 flex-wrap" dir="rtl">
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
  );
}

export const filterByGroup = (exams, group) => {
  if (group === 'all') return exams;
  const groupConfig = TYPE_GROUPS.find(g => g.key === group);
  if (!groupConfig) return exams;
  return exams.filter(e => groupConfig.types.includes(e.type));
};

// Pull all event types for reuse in legend/details
export const ALL_TYPE_GROUPS = TYPE_GROUPS;
export { getEventTypeClasses };