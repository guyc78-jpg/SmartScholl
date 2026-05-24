import { CheckCircle2 } from 'lucide-react';

const steps = ['העלאת קובץ', 'תצוגה מקדימה', 'סיווג אוטומטי', 'תיקון שגיאות', 'רלוונטיות', 'פרסום'];

export default function ImportStepIndicator({ currentStep }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" dir="rtl">
      {steps.map((step, index) => {
        const active = index === currentStep;
        const done = index < currentStep;
        return (
          <div
            key={step}
            className={`rounded-xl border px-3 py-2 text-xs flex items-center gap-2 ${
              active ? 'bg-primary text-primary-foreground border-primary' : done ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted/30 text-muted-foreground'
            }`}
          >
            {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-5 h-5 rounded-full bg-background/70 text-foreground inline-flex items-center justify-center text-[10px]">{index + 1}</span>}
            <span className="font-medium truncate">{step}</span>
          </div>
        );
      })}
    </div>
  );
}