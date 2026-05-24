import { TYPE_STYLES } from './eventConstants';

export const getEventTypeClasses = (type) => TYPE_STYLES[type] || TYPE_STYLES['אחר'];

export default function EventTypeBadge({ type = 'אחר', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${getEventTypeClasses(type)} ${className}`}>
      {type}
    </span>
  );
}