import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Users, AlertTriangle, Lock, GraduationCap } from 'lucide-react';
import ClassDashboard from '@/components/grade/ClassDashboard';
import { normalizeGrade, formatGrade, getUserDivisionGrades, getDivisionLabel } from '@/lib/schoolStructure';

const gradeOrder = ['ז', 'ח', 'ט', 'י', 'יא', 'יב'];

export default function DivisionManagement({ user, role }) {
  const [classes, setClasses] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);

  const allowedGrades = useMemo(() => getUserDivisionGrades(user), [user]);
  const divisionLabel = getDivisionLabel(user?.profile_division);

  useEffect(() => {
    async function loadClasses() {
      setLoading(true);
      const allClasses = await base44.entities.ClassRoom.list('grade', 500);
      const filtered = allClasses.filter(c => allowedGrades.includes(normalizeGrade(c.grade)));
      const extractNum = (name = '') => {
        const match = String(name).match(/(\d+)\s*$/);
        return match ? parseInt(match[1], 10) : 9999;
      };
      filtered.sort((a, b) => {
        const gradeDiff = gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade);
        if (gradeDiff !== 0) return gradeDiff;
        return extractNum(a.name) - extractNum(b.name);
      });
      setClasses(filtered);
      setLoading(false);
    }
    loadClasses();
  }, [allowedGrades.join(',')]);

  // Block users that aren't division managers (admins may also view)
  if (role !== 'division_manager' && role !== 'admin') {
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

  // Grades that actually have classes, within the allowed division
  const gradesWithClasses = allowedGrades.filter(g => classes.some(c => normalizeGrade(c.grade) === g));
  const gradeClasses = selectedGrade ? classes.filter(c => normalizeGrade(c.grade) === selectedGrade) : [];

  if (allowedGrades.length === 0) {
    return (
      <div className="p-4 lg:p-6 text-right" dir="rtl">
        <PageHeader title="ניהול חטיבה" subtitle="לא הוגדרה חטיבה למשתמש זה" />
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-400" />
          <p className="font-medium">לא הוגדרה חטיבה (עליונה/ביניים) בפרופיל</p>
          <p className="text-sm mt-1">יש לפנות למנהל/ת המערכת להגדרת סוג החטיבה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 text-right" dir="rtl">
      <PageHeader
        title={`ניהול חטיבה${divisionLabel ? ` – ${divisionLabel}` : ''}`}
        subtitle="בחר/י שכבה וכיתה לצפייה בכל נתוני הכיתה"
      />

      {/* Grade selector */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4" /> בחירת שכבה
        </p>
        <div className="flex flex-wrap gap-2">
          {gradesWithClasses.map(g => (
            <button
              key={g}
              onClick={() => { setSelectedGrade(g); setSelectedClass(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                ${selectedGrade === g
                  ? 'bg-primary text-primary-foreground border-primary shadow'
                  : 'bg-card border-border text-foreground hover:border-primary/50 hover:bg-muted'}`}
            >
              שכבת {formatGrade(g)}
            </button>
          ))}
        </div>
      </div>

      {/* Class selector */}
      {selectedGrade && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Users className="w-4 h-4" /> בחירת כיתה
          </p>
          {gradeClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין כיתות מוגדרות לשכבה זו</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {gradeClasses.map(cls => (
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
                    <span>{cls.name}</span>
                  </span>
                  {cls.homeroom_teacher_name && (
                    <span className="text-xs opacity-70 me-1">· {cls.homeroom_teacher_name}</span>
                  )}
                </button>
              ))}
            </div>
          )}
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

      {!selectedGrade && (
        <div className="text-center py-10 text-muted-foreground">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>בחר/י שכבה כדי להתחיל</p>
        </div>
      )}
    </div>
  );
}