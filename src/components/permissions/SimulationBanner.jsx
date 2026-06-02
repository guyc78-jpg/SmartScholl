import { Eye, ShieldCheck } from 'lucide-react';
import { useSimulation, getSimRoleLabel } from '@/lib/SimulationContext';

export default function SimulationBanner() {
  const { isSimulating, simRole, stopSimulation } = useSimulation();
  if (!isSimulating) return null;

  return (
    <div
      dir="rtl"
      className="fixed top-0 inset-x-0 z-[9999] flex items-center gap-2 px-3 sm:px-4 py-2 bg-secondary text-secondary-foreground border-b border-secondary/60 shadow-md"
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
    >
      <Eye className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-bold flex-1 text-right truncate">
        מצב סימולציה: {getSimRoleLabel(simRole)}
        <span className="hidden sm:inline font-medium opacity-80"> — תצוגה מדומה בלבד, ללא שינוי בנתונים אמיתיים</span>
      </span>
      <button
        type="button"
        onClick={stopSimulation}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary-foreground/15 hover:bg-secondary-foreground/25 transition-colors text-sm font-semibold flex-shrink-0"
      >
        <ShieldCheck className="w-4 h-4" />
        חזרה למנהל/ת מערכת
      </button>
    </div>
  );
}