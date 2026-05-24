import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, Sun, Moon } from 'lucide-react';

const options = [
  { value: 'system', label: 'לפי המכשיר', icon: Monitor, hint: 'יעקוב אוטומטית אחר הגדרות הטלפון' },
  { value: 'light', label: 'בהיר', icon: Sun, hint: 'מצב יום קבוע' },
  { value: 'dark', label: 'כהה', icon: Moon, hint: 'מצב לילה קבוע' },
];

export default function ThemePreferenceCard({ preference, onChange }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>מצב תצוגה</CardTitle>
        <CardDescription>בחר/י כיצד תיראה המערכת. ברירת המחדל היא לפי הגדרות המכשיר.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {options.map(({ value, label, icon: Icon, hint }) => {
            const isActive = preference === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange(value)}
                className={`flex flex-col items-start text-right gap-2 p-4 rounded-xl border-2 transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground/80 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold text-sm">{label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}