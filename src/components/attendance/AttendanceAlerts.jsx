import { AlertTriangle, UserX, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { THRESHOLDS } from '@/pages/ClassAttendance';

export default function AttendanceAlerts({ statsPerStudent }) {
  const alerts = statsPerStudent.filter(s => s.absences >= THRESHOLDS.absences || s.lates >= THRESHOLDS.lates);

  if (alerts.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="font-medium text-foreground">אין התראות פעילות</p>
          <p>אף תלמיד לא הגיע לסף חריג של איחורים או היעדרויות.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">התראה אוטומטית — תלמידים בסף חריג</p>
          <p className="text-xs text-red-600 dark:text-red-400">
            סף היעדרויות: {THRESHOLDS.absences} ימים | סף איחורים: {THRESHOLDS.lates} פעמים
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {alerts.map(s => {
          const absAlert = s.absences >= THRESHOLDS.absences;
          const lateAlert = s.lates >= THRESHOLDS.lates;
          return (
            <Card key={s.id} className="p-4 border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-900/5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                  ${s.gender === 'נקבה' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                  {s.full_name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{s.full_name}</p>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {absAlert && (
                      <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                        <UserX className="w-3 h-3" />{s.absences} היעדרויות
                      </span>
                    )}
                    {lateAlert && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        <Clock className="w-3 h-3" />{s.lates} איחורים
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                  {absAlert && <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full">היעדרויות חריגות</span>}
                  {lateAlert && <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full">איחורים חריגים</span>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}