import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { queryClientInstance } from '@/lib/query-client';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ClassAssignmentCard from '@/components/classes/ClassAssignmentCard';
import { School } from 'lucide-react';
import { toast } from 'sonner';
import { GRADES, formatGrade, normalizeGrade } from '@/lib/schoolStructure';

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

  async function loadData() {
    setLoading(true);
    const res = await base44.functions.invoke('authorizeAccess', { action: 'listHomeroomAssignments' });
    setClasses((res.data.classes || []).sort(sortClasses));
    setTeachers(res.data.teachers || []);
    setCanAssign(!!res.data.canAssign);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const classesByGrade = useMemo(() => GRADES.map(grade => ({
    grade,
    classes: classes.filter(item => normalizeGrade(item.grade) === grade),
  })).filter(group => group.classes.length > 0), [classes]);

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
        <div className="space-y-6">
          {classesByGrade.map(group => (
            <section key={group.grade} className="space-y-3 text-right" dir="rtl">
              <div className="flex items-center justify-start gap-2">
                <h2 className="text-lg font-bold text-foreground">שכבה {formatGrade(group.grade)}</h2>
                <span className="text-sm text-muted-foreground">{group.classes.length} כיתות</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.classes.map(classRoom => (
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}