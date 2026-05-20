import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AttendancePatterns({ statsPerStudent, allRecords }) {
  // Top absences
  const topAbsent = [...statsPerStudent].sort((a, b) => b.absences - a.absences).slice(0, 5).filter(s => s.absences > 0);
  // Top lates
  const topLate = [...statsPerStudent].sort((a, b) => b.lates - a.lates).slice(0, 5).filter(s => s.lates > 0);

  // Absences by day of week
  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
  const dayCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  allRecords.filter(r => r.status === 'נעדר/ת').forEach(r => {
    const d = new Date(r.date).getDay();
    dayCount[d] = (dayCount[d] || 0) + 1;
  });
  const dayData = dayNames.map((name, i) => ({ name, count: dayCount[i] || 0 }));

  return (
    <div className="space-y-4">
      {/* Day of week chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">היעדרויות לפי יום בשבוע</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dayData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [`${v} היעדרויות`]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {dayData.map((entry, i) => (
                  <Cell key={i} fill={entry.count === Math.max(...dayData.map(d => d.count)) ? '#ef4444' : '#fca5a5'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Top absences */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-600 dark:text-red-400">רב-היעדרויות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topAbsent.length === 0 ? (
              <p className="text-xs text-muted-foreground">אין נתונים</p>
            ) : topAbsent.map(s => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-sm">{s.full_name}</span>
                <span className="text-sm font-bold text-red-500">{s.absences} ימים</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top lates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-600 dark:text-amber-400">רב-איחורים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topLate.length === 0 ? (
              <p className="text-xs text-muted-foreground">אין נתונים</p>
            ) : topLate.map(s => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-sm">{s.full_name}</span>
                <span className="text-sm font-bold text-amber-500">{s.lates} פעמים</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}