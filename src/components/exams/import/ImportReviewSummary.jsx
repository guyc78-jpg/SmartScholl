import { AlertTriangle, CheckCircle2, Tags, Users } from 'lucide-react';

export default function ImportReviewSummary({ rows, errorsCount }) {
  const classified = rows.filter(row => row.type && row.type !== 'אחר').length;
  const targeted = rows.filter(row => row.audience_scope && (row.audience_scope === 'school' || row.audience_grades?.length || row.audience_classes?.length || row.audience_subjects?.length || row.audience_tracks?.length || row.audience_group_label)).length;

  const cards = [
    { label: 'אירועים לזיהוי', value: rows.length, icon: CheckCircle2, className: 'text-primary' },
    { label: 'סווגו אוטומטית', value: classified, icon: Tags, className: 'text-secondary-foreground' },
    { label: 'סומנה רלוונטיות', value: targeted, icon: Users, className: 'text-primary' },
    { label: 'דורשים תיקון', value: errorsCount, icon: AlertTriangle, className: errorsCount ? 'text-destructive' : 'text-primary' }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {cards.map(({ label, value, icon: Icon, className }) => (
        <div key={label} className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Icon className={`w-4 h-4 ${className}`} />
            {label}
          </div>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      ))}
    </div>
  );
}