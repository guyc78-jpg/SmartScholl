import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, UserX, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatStudentName } from '@/lib/studentName';

export default function WatchStudentsList({ students, attByStudent }) {
  const watchStudents = students.filter(s => s.status === 'דורש מעקב');
  const absenceWarning = students.filter(s => (attByStudent[s.id]?.absences || 0) >= 3);
  const lateWarning = students.filter(s => (attByStudent[s.id]?.lates || 0) >= 5);

  const allAlertIds = new Set([...watchStudents.map(s=>s.id), ...absenceWarning.map(s=>s.id), ...lateWarning.map(s=>s.id)]);
  const alertStudents = students.filter(s => allAlertIds.has(s.id));

  return (
    <div className="space-y-4">
      {alertStudents.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
          <p className="font-medium text-emerald-600">אין תלמידים הדורשים מעקב מיוחד</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" /> תלמידים לתשומת לב ({alertStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertStudents.map(s => {
              const att = attByStudent[s.id] || {};
              const flags = [];
              if (s.status === 'דורש מעקב') flags.push({ label: 'דורש מעקב', color: 'bg-amber-100 text-amber-700' });
              if (att.absences >= 3) flags.push({ label: `${att.absences} היעדרויות`, color: 'bg-red-100 text-red-700' });
              if (att.lates >= 5) flags.push({ label: `${att.lates} איחורים`, color: 'bg-orange-100 text-orange-700' });
              return (
                <Link key={s.id} to={`/students/${s.id}`} className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                  <div className="w-9 h-9 bg-amber-200 dark:bg-amber-800 rounded-full flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-sm flex-shrink-0">
                    {s.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{formatStudentName(s.full_name)}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {flags.map((f, i) => (
                        <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${f.color}`}>{f.label}</span>
                      ))}
                      {s.tags?.map(tag => (
                        <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* All students compact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">כל התלמידים ({students.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {students.map(s => (
              <Link key={s.id} to={`/students/${s.id}`} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                  {s.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{formatStudentName(s.full_name)}</p>
                </div>
                <StatusBadge status={s.status} />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}