import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, UserX, AlertTriangle } from 'lucide-react';
import { formatStudentName } from '@/lib/studentName';

export default function AttendanceSummary({ students, attendance, attByStudent }) {
  const today = new Date().toISOString().split('T')[0];
  const todayAtt = attendance.filter(r => r.date === today);

  const presentToday = todayAtt.filter(r => ['נוכח', 'נוכח/ת'].includes(r.status)).length;
  const absentToday  = todayAtt.filter(r => ['נעדר', 'נעדר/ת'].includes(r.status)).length;
  const lateToday    = todayAtt.filter(r => ['מאחר', 'מאחר/ת'].includes(r.status)).length;

  // Students with high absence/late counts
  const highAbsence = students
    .map(s => ({ ...s, abs: attByStudent[s.id]?.absences || 0, lates: attByStudent[s.id]?.lates || 0 }))
    .filter(s => s.abs >= 3 || s.lates >= 5)
    .sort((a, b) => (b.abs + b.lates) - (a.abs + a.lates));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'נוכחים היום', value: presentToday, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'נעדרים', value: absentToday, color: absentToday > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700' },
          { label: 'מאחרים', value: lateToday, color: lateToday > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl p-3 text-center ${c.color}`}>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs mt-0.5 opacity-80">{c.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            היעדרויות ואיחורים מצטברים
          </CardTitle>
        </CardHeader>
        <CardContent>
          {highAbsence.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">אין תלמידים עם היעדרויות/איחורים חריגים</p>
          ) : (
            <div className="space-y-2">
              {highAbsence.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-700 text-sm font-bold flex-shrink-0">
                    {s.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{formatStudentName(s.full_name)}</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    {s.abs > 0 && (
                      <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        <UserX className="w-3 h-3" /> {s.abs}
                      </span>
                    )}
                    {s.lates > 0 && (
                      <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> {s.lates}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All students attendance table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">סיכום נוכחות לכל תלמיד</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-right py-2 font-medium">שם</th>
                <th className="text-center py-2 font-medium">היעדרויות</th>
                <th className="text-center py-2 font-medium">איחורים</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const att = attByStudent[s.id] || {};
                return (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 font-medium">{formatStudentName(s.full_name)}</td>
                    <td className="py-2 text-center">
                      <span className={att.absences > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                        {att.absences || 0}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className={att.lates > 0 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                        {att.lates || 0}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}