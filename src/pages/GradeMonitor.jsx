import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Users, AlertTriangle, Lock } from 'lucide-react';
import ClassDashboard from '@/components/grade/ClassDashboard';
import { getUserApprovedGrade, normalizeGrade } from '@/lib/schoolStructure';
import { getClassDisplayName } from '@/lib/classIdentity';

const GRADE_LABELS = { ז: 'שכבת ז׳', ח: 'שכבת ח׳', ט: 'שכבת ט׳', י: 'שכבת י׳', יא: 'שכבת י״א', יב: 'שכבת י״ב' };

export default function GradeMonitor({ user, role }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);

  // Determine which grade this coordinator manages
  const managedGrade = getUserApprovedGrade(user);

  useEffect(() => {
    async function loadClasses() {
      setLoading(true);
      const allClasses = await base44.entities.ClassRoom.list('grade', 500);
      let filtered = allClasses;

      if (role === 'coordinator' && managedGrade) {
        filtered = allClasses.filter(c => normalizeGrade(c.grade) === managedGrade);
      } else if (role === 'homeroom_teacher') {
        // Teacher sees only their own class(es)
        const teacherEmail = user?.email;
        filtered = allClasses.filter(c => c.homeroom_teacher_email === teacherEmail);
        // Fallback: show all if no match (for demo)
        if (filtered.length === 0) filtered = allClasses;
      }

      const gradeOrder = ['ז', 'ח', 'ט', 'י', 'יא', 'יב'];
      const extractNum = (name = '') => {
        const match = String(name).match(/(\d+)\s*$/);
        return match ? parseInt(match[1], 10) : 9999;
      };
      filtered = [...filtered].sort((a, b) => {
        const gradeDiff = gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade);
        if (gradeDiff !== 0) return gradeDiff;
        return extractNum(a.name) - extractNum(b.name);
      });

      setClasses(filtered);
      if (filtered.length === 1) setSelectedClass(filtered[0]);
      setLoading(false);
    }
    loadClasses();
  }, [role, managedGrade, user?.email]);

  if (role !== 'coordinator' && role !== 'homeroom_teacher' && role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground" dir="rtl">
        <Lock className="w-10 h-10" />
        <p className="font-medium">גישה מוגבלת</p>
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const selectedClassLabel = selectedClass ? getClassDisplayName(selectedClass, selectedClass.name) : '';
  const gradeLabel = role === 'coordinator'
    ? (GRADE_LABELS[managedGrade?.replace(/[׳״\s]/g, '')] || managedGrade || 'השכבה שלך')
    : (selectedClassLabel || 'הכיתה שלך');

  return (
    <div className="p-4 lg:p-6 space-y-5 text-right" dir="rtl">
      <PageHeader
        title={role === 'coordinator' ? `מעקב שכבה – ${gradeLabel}` : `מעקב כיתה – ${gradeLabel}`}
        subtitle={role === 'coordinator' ? 'מבט-על על כל כיתות השכבה' : 'דשבורד כיתתי מלא'}
      />

      {/* Class selector */}
      {classes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => setSelectedClass(cls)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                ${selectedClass?.id === cls.id
                  ? 'bg-primary text-primary-foreground border-primary shadow'
                  : 'bg-card border-border text-foreground hover:border-primary/50 hover:bg-muted'}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>{getClassDisplayName(cls, cls.name)}</span>
              </span>
              {cls.homeroom_teacher_name && (
                <span className="text-xs opacity-70 me-1">· {cls.homeroom_teacher_name}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {classes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-400" />
          <p className="font-medium">לא נמצאו כיתות משויכות לשכבה זו</p>
          <p className="text-sm mt-1">יש לוודא שהגדרות השכבה עודכנו בפרופיל</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {selectedClass && (
          <motion.div
            key={selectedClass.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ClassDashboard classInfo={selectedClass} user={user} role={role} />
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedClass && classes.length > 1 && (
        <div className="text-center py-10 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>בחר/י כיתה להצגת הדשבורד</p>
        </div>
      )}
    </div>
  );
}