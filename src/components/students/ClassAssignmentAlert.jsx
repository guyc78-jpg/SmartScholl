import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { buildStudentClassPatch, findStudentClassMismatches } from '@/lib/classAssignment';
import { formatStudentName } from '@/lib/studentName';

export default function ClassAssignmentAlert({ enabled = false, onFixed }) {
  const [mismatches, setMismatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);

  async function loadIssues() {
    if (!enabled) return;
    setLoading(true);
    const [students, classRooms] = await Promise.all([
      base44.entities.Student.list('-updated_date', 500),
      base44.entities.ClassRoom.list('-updated_date', 200),
    ]);
    setMismatches(findStudentClassMismatches(students, classRooms));
    setLoading(false);
  }

  useEffect(() => {
    loadIssues();
  }, [enabled]);

  async function fixIssues() {
    setFixing(true);
    await Promise.all(mismatches.map(({ student, classRoom }) =>
      base44.entities.Student.update(student.id, buildStudentClassPatch(student, classRoom))
    ));
    toast.success(`תוקנו ${mismatches.length} שיוכי כיתה`);
    setMismatches([]);
    setFixing(false);
    onFixed?.();
  }

  if (!enabled || loading || mismatches.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-900/40 p-4 text-right" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="font-bold text-amber-900 dark:text-amber-200">נמצאו שיוכי כיתה לא תקינים</h3>
            <p className="text-sm text-amber-800/80 dark:text-amber-200/80 mt-1">
              {mismatches.length} תלמידים עם שם כיתה שלא תואם למזהה הכיתה. אפשר לתקן אוטומטית לפי שם הכיתה.
            </p>
            <p className="text-xs text-amber-800/70 dark:text-amber-200/70 mt-2 truncate">
              לדוגמה: {formatStudentName(mismatches[0].student)} · {mismatches[0].student.class_name}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={loadIssues} disabled={fixing} className="gap-2 bg-white/60">
            <RefreshCw className="w-4 h-4" />
            בדוק שוב
          </Button>
          <Button size="sm" onClick={fixIssues} disabled={fixing} className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {fixing ? 'מתקן...' : 'תקן עכשיו'}
          </Button>
        </div>
      </div>
    </div>
  );
}