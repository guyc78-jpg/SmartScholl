import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/StatusBadge';
import { CalendarCheck, ChevronLeft } from 'lucide-react';
import { formatSchoolDate, getLocalDateString } from '@/lib/dateUtils';

const fmt = d => formatSchoolDate(d, { day: 'numeric', month: 'numeric' });
const dayMs = 24 * 60 * 60 * 1000;

export default function AttendanceStatusCard({ records }) {
  const cutoff = getLocalDateString(new Date(Date.now() - 14 * dayMs));
  const exceptions = (records || []).filter(r => r.status && r.status !== 'נוכח' && (r.date || '') >= cutoff).slice(0, 4);

  return (
    <Card dir="rtl" className="text-right">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-emerald-500" />הנוכחות שלי</CardTitle>
        <Link to="/student-attendance" className="text-xs text-primary font-medium flex items-center gap-0.5">הכל<ChevronLeft className="w-3.5 h-3.5" /></Link>
      </CardHeader>
      <CardContent>
        {exceptions.length === 0 ? (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 p-3">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">אין חריגות נוכחות בשבועיים האחרונים — כל הכבוד! 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exceptions.map(r => (
              <div key={r.id} className="flex items-center gap-2 rounded-xl border p-2.5">
                <span className="text-xs text-muted-foreground w-12 flex-shrink-0">{fmt(r.date)}</span>
                <StatusBadge status={r.status} />
                {r.period && <span className="text-xs text-muted-foreground flex-shrink-0">שיעור {r.period}</span>}
                {r.note && <span className="text-xs text-muted-foreground truncate flex-1">{r.note}</span>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
