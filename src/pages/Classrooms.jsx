import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { queryClientInstance } from '@/lib/query-client';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ClassAssignmentCard from '@/components/classes/ClassAssignmentCard';
import { ChevronDown, School } from 'lucide-react';
import { toast } from 'sonner';
import { GRADES, formatGrade, normalizeGrade } from '@/lib/schoolStructure';
import { cn } from '@/lib/utils';

const sortClasses = (a, b) => {
  const gradeDiff = GRADES.indexOf(normalizeGrade(a.grade)) - GRADES.indexOf(normalizeGrade(b.grade));
  if (gradeDiff !== 0) return gradeDiff;
  return Number(a.class_number || 999) - Number(b.class_number || 999);
};

export default function Classrooms({ user, role, onUserUpdate }) {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [canAssign, setCanAssign] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [openGrades, setOpenGrades] = useState({});

  async function loadData() {
    setLoading(true);
    const res = await base44.functions.invoke('authorizeAccess', { action: 'listHomeroomAssignments' });
    setClasses((res.data.classes || []).sort(sortClasses));
    setTeachers(res.data.teachers || []);
    setCanAssign(!!res.data.canAssign);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const gradesToShow = useMemo(() => {
    if (role === 'admin' || role === 'system_admin') return GRADES;
    return GRADES.filter(grade => classes.some(item => normalizeGrade(item.grade) === grade));
  }, [classes, role]);

  const classesByGrade = useMemo(() => gradesToShow.map(grade => ({
    grade,
    classes: classes
      .filter(item => normalizeGrade(item.grade) === grade)
      .sort(sortClasses),
  })), [classes, gradesToShow]);

  async function handleAssign(classRoom, teacherId) {
    setSavingId(classRoom.id);
    const res = await base44.functions.invoke('authorizeAccess', {
      action: 'assignHomeroomTeacher',
      classId: classRoom.id,
      teacherId,
    });
    sessionStorage.removeItem(`approvedAccess:${user?.email}`);
    queryClientInstance.clear();
    if (res.data.assignedTeacherEmail && res.data.assignedTeacherEmail === String(user?.email || '').toLowerCase()) {
      const access = await base44.functions.invoke('authorizeAccess', { action: 'getAccess' });
      onUserUpdate?.(access.data.user);
    }
    toast.success('שיוך המחנך/ת עודכן בהצלחה');
    setSavingId('');
    await loadData();
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 text-right" dir="rtl">
      <PageHeader
        title="ניהול שיוכי כיתות"
        subtitle={canAssign ? 'שיוך מחנכים מאושרים לכיתות בהתאם להרשאות שלך' : 'צפייה בכיתת החינוך שהוגדרה עבורך'}
      />

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : classesByGrade.length === 0 ? (
        <EmptyState icon={School} title="אין כיתות להצגה" description="לא נמצאו כיתות בתחום ההרשאה שלך." />
      ) : (
        <div className="space-y-3" dir="rtl">
          {classesByGrade.map(group => {
            const isOpen = !!openGrades[group.grade];
            return (
              <section key={group.grade} className="overflow-hidden rounded-2xl border bg-card/70 text-right" dir="rtl">
                <button
                  type="button"
                  onClick={() => setOpenGrades(prev => ({ ...prev, [group.grade]: !prev[group.grade] }))}
                  className="flex w-full items-center justify-start gap-3 p-4 text-right transition-colors hover:bg-accent/50"
                  dir="rtl"
                >
                  <ChevronDown className={cn('h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')} />
                  <div className="flex min-w-0 flex-1 items-center justify-start gap-2 text-right">
                    <h2 className="text-lg font-bold text-foreground">{formatGrade(group.grade)}</h2>
                    <span className="text-sm text-muted-foreground">{group.classes.length} כיתות</span>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden border-t"
                    >
                      <div className="grid gap-3 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-3">
                        {group.classes.length === 0 ? (
                          <div className="rounded-xl border border-dashed bg-background/60 p-4 text-sm text-muted-foreground text-right md:col-span-2 xl:col-span-3">
                            אין כיתות פעילות בשכבה זו.
                          </div>
                        ) : group.classes.map(classRoom => (
                          <ClassAssignmentCard
                            key={classRoom.id}
                            classRoom={classRoom}
                            teachers={teachers}
                            canAssign={canAssign}
                            saving={savingId === classRoom.id}
                            onAssign={handleAssign}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}