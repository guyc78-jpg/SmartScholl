import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from '@/components/ui/StatusBadge';
import { AlertTriangle } from 'lucide-react';
import { formatStudentName } from '@/lib/studentName';

export default function DisciplineList({ events }) {
  const sorted = [...events].sort((a, b) => b.date?.localeCompare(a.date));

  if (events.length === 0) return (
    <div className="text-center py-10 text-muted-foreground">
      <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
      <p className="font-medium text-emerald-600">אין אירועי משמעת</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {sorted.map(ev => (
        <Card key={ev.id}>
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{formatStudentName(ev.student_name)}</p>
                  <StatusBadge status={ev.severity} />
                  <StatusBadge status={ev.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{ev.category} · {ev.date}</p>
                <p className="text-sm mt-1">{ev.description}</p>
                {ev.treatment && <p className="text-xs text-muted-foreground mt-0.5">טיפול: {ev.treatment}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}