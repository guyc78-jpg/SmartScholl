import { TYPE_STYLES } from './eventConstants';

export const getEventTypeClasses = (type) => TYPE_STYLES[type] || TYPE_STYLES['אחר'];

export default function EventTypeBadge({ type = 'אחר', className = '' }) {
  return (
    <span dir="rtl" className={`inline-flex items-center max-w-full px-2 py-0.5 rounded-md text-[10px] font-medium border text-right truncate ${getEventTypeClasses(type)} ${className}`}>
      {type}
    </span>
  );
}