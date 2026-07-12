import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { analyzeStudentClassAssignments, buildStudentClassPatch } from '@/lib/classAssignment';
import { formatStudentName } from '@/lib/studentName';

export default function ClassAssignmentAlert({ enabled = false, onFixed }) {
  const [mismatches, setMismatches] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function loadIssues() {
    if (!enabled) {
      setMismatches([]);
      setBlocked([]);
      return;
    }
    setLoading(true);
    try {
      const [students, classRooms] = await Promise.all([
        base44.entities.Student.list('-updated_date', 500),
        base44.entities.ClassRoom.list('-updated_date', 200),
      ]);
      const analysis = analyzeStudentClassAssignments(students, classRooms);
      setMismatches(analysis.fixable);
      setBlocked(analysis.blocked);
    } catch (error) {
      console.error('Failed to inspect class assignments', error);
      toast.error('בדיקת שיוכי הכיתה נכשלה');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIssues();
  }, [enabled]);

  async function fixIssues() {
    if (mismatches.length === 0) return;
    setConfirmOpen(false);
    setFixing(true);
    const assignments = [...mismatches];
    let fixedCount = 0;
    const failures = [];
    try {
      for (const assignment of assignments) {
        try {
          await base44.entities.Student.update(
            assignment.student.id,
            buildStudentClassPatch(assignment.student, assignment.classRoom)
          );
          fixedCount += 1;
        } catch (error) {
          console.error(`Failed to repair class assignment for ${assignment.student.id}`, error);
          failures.push(assignment);
        }
      }

      await loadIssues();
      if (failures.length === 0) {
        toast.success(`תוקנו ${fixedCount} שיוכי כיתה`);
      } else if (fixedCount > 0) {
        toast.error(`התיקון הושלם חלקית: ${fixedCount} תוקנו, ${failures.length} נכשלו`);
      } else {
        toast.error(`תיקון ${failures.length} שיוכי כיתה נכשל`);
      }
      if (fixedCount > 0) onFixed?.();
    } finally {
      setFixing(false);
    }
  }

  if (!enabled || (loading && mismatches.length === 0 && blocked.length === 0)) return null;
  if (mismatches.length === 0 && blocked.length === 0) return null;

  const preview = mismatches.slice(0, 5);

  return (
    <>
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-900/40 p-4 text-right" dir="rtl">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 space-y-2">
              <h3 className="font-bold text-amber-900 dark:text-amber-200">נמצאו שיוכי כיתה לא תקינים</h3>
              <p className="text-sm text-amber-800/80 dark:text-amber-200/80">
                {mismatches.length} שיוכים ניתנים לתיקון בטוח. {blocked.length > 0 && `${blocked.length} שיוכים לא יעודכנו אוטומטית.`}
              </p>
              {preview.length > 0 && (
                <ul className="text-xs text-amber-900/80 dark:text-amber-100/80 space-y-1 list-disc list-inside">
                  {preview.map(({ student, classRoom }) => (
                    <li key={student.id}>
                      {formatStudentName(student)}: {student.class_name || 'ללא שם'} ← {classRoom.name}
                      {classRoom.year ? ` (${classRoom.year})` : ''}
                    </li>
                  ))}
                </ul>
              )}
              {blocked.length > 0 && (
                <div className="rounded-lg border border-amber-300/70 bg-white/50 dark:bg-black/10 p-2">
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">דורש בדיקה ידנית:</p>
                  <ul className="text-xs text-amber-900/75 dark:text-amber-100/75 mt-1 space-y-1">
                    {blocked.slice(0, 3).map(({ student, reason }) => (
                      <li key={student.id}>{formatStudentName(student)} — {reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 self-end lg:self-auto">
            <Button variant="outline" size="sm" onClick={loadIssues} disabled={fixing || loading} className="gap-2 bg-white/60">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              בדוק שוב
            </Button>
            <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={fixing || loading || mismatches.length === 0} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {fixing ? 'מתקן...' : `תקן ${mismatches.length}`}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">לתקן {mismatches.length} שיוכי כיתה?</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              רק התאמות חד-משמעיות לכיתה פעילה ובשנה ובשכבה המתאימות יעודכנו. שיוכים עמומים או לא פעילים יישארו ללא שינוי.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-48 overflow-y-auto rounded-lg border p-3 text-sm text-right space-y-1">
            {preview.map(({ student, classRoom }) => (
              <p key={student.id}>
                {formatStudentName(student)} → {classRoom.name}{classRoom.year ? ` (${classRoom.year})` : ''}
              </p>
            ))}
            {mismatches.length > preview.length && (
              <p className="text-muted-foreground">ועוד {mismatches.length - preview.length} שיוכים</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={fixing}>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={fixIssues} disabled={fixing || mismatches.length === 0}>
              אשר ותקן
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
