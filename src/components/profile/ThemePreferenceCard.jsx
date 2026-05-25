import { Monitor, Sun, Moon } from 'lucide-react';

const options = [
  { value: 'system', label: 'מערכת', icon: Monitor },
  { value: 'light', label: 'בהיר', icon: Sun },
  { value: 'dark', label: 'כהה', icon: Moon },
];

export default function ThemePreferenceCard({ preference, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3" dir="rtl">
        <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">מצב תצוגה</h3>
        <div className="flex gap-2">
          {options.map(({ value, label, icon: Icon }) => {
            const isActive = preference === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange(value)}
                className={`w-20 h-10 flex flex-col items-center justify-center rounded-lg border transition-all ${
                  isActive
                    ? 'bg-primary/12 border-primary/40 text-primary'
                    : 'bg-card border-border text-foreground/60 hover:bg-muted hover:border-border/80'
                }`}
                title={label}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="text-[11px] font-medium leading-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}