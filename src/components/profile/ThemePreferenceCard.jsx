import { Monitor, Sun, Moon } from 'lucide-react';

const options = [
  { value: 'system', label: 'מערכת', icon: Monitor },
  { value: 'light', label: 'בהיר', icon: Sun },
  { value: 'dark', label: 'כהה', icon: Moon },
];

export default function ThemePreferenceCard({ preference, onChange }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">מצב תצוגה</h3>
      <div className="flex items-center gap-2" dir="rtl">
        {options.map(({ value, label, icon: Icon }) => {
          const isActive = preference === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onChange(value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary/15 border border-primary/30 text-primary font-medium'
                  : 'border border-border bg-card text-foreground/70 hover:bg-muted'
              }`}
              title={label}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}