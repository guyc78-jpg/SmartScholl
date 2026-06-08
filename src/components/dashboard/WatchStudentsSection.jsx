import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, ChevronLeft, Zap, TrendingDown, Clock } from 'lucide-react';
import { formatStudentName, compareStudentsByLastName } from '@/lib/studentName';

const THRESHOLDS = {
  absences: 5,
  lates: 4,
};

export default function WatchStudentsSection({
  students,
  allAttendanceRecords,
  performanceReviews,
  tasks
}) {
  // Identify students needing attention
  const watchList = students
    .map(student => {
      const studentId = student.id;
      const absences = allAttendanceRecords.filter(r => r.student_id === studentId && ['נעדר', 'נעדר/ת'].includes(r.status)).length;
      const lates = allAttendanceRecords.filter(r => r.student_id === studentId && ['מאחר', 'מאחר/ת'].includes(r.status)).length;
      const openTasks = tasks.filter(t => t.student_id === studentId && t.status !== 'בוצע').length;
      const recentPerformance = performanceReviews
        .filter(p => p.student_id === studentId)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 1);
      
      const lowScores = recentPerformance[0] ? [
        recentPerformance[0].learning_habits,
        recentPerformance[0].participation,
        recentPerformance[0].responsibility,
        recentPerformance[0].behavior,
        recentPerformance[0].social_functioning,
        recentPerformance[0].emotional_state,
      ].filter(s => s <= 2).length > 0 : false;

      const reasons = [];
      if (absences >= THRESHOLDS.absences) reasons.push(`${absences} היעדרויות`);
      if (lates >= THRESHOLDS.lates) reasons.push(`${lates} איחורים`);
      if (openTasks > 0) reasons.push(`${openTasks} משימות לא סגורות`);
      if (lowScores) reasons.push('ירידה בביצועים');
      if (student.status === 'דורש מעקב') reasons.push('סומן ליעדכון');

      return {
        ...student,
        absences,
        lates,
        openTasks,
        lowScores,
        reasons,
        score: absences + lates + openTasks + (lowScores ? 1 : 0),
      };
    })
    .filter(s => s.reasons.length > 0 || s.score > 2)
    .sort((a, b) => compareStudentsByLastName(a, b))
    .slice(0, 10);

  if (watchList.length === 0) return null;

  return (
    <Card className="border-amber-200/40 dark:border-amber-800/30">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <CardTitle className="text-base font-semibold">תלמידים דורשים תשומת לב</CardTitle>
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
            {watchList.length}
          </span>
        </div>
        <Link to="/students" className="text-xs text-primary flex items-center gap-1 hover:underline">
          הכל <ChevronLeft className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {watchList.map(student => (
          <Link
            key={student.id}
            to={`/students/${student.id}`}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-amber-100/50 dark:border-amber-800/30 transition-colors"
          >
            {/* Avatar */}
            <div className="w-8 h-8 bg-amber-200 dark:bg-amber-800/50 rounded-lg flex items-center justify-center flex-shrink-0 text-amber-900 dark:text-amber-200 font-bold text-sm">
              {formatStudentName(student).charAt(0) || '?'}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{formatStudentName(student)}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {student.absences >= THRESHOLDS.absences && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                    <Clock className="w-2.5 h-2.5" />
                    {student.absences} היעדרויות
                  </span>
                )}
                {student.lates >= THRESHOLDS.lates && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                    <Zap className="w-2.5 h-2.5" />
                    {student.lates} איחורים
                  </span>
                )}
                {student.lowScores && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                    <TrendingDown className="w-2.5 h-2.5" />
                    ביצועים
                  </span>
                )}

              </div>
            </div>

            <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}