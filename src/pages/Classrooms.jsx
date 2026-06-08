import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/ui/EmptyState';
import ClassRoomForm from '@/components/classes/ClassRoomForm';
import GradeClassRoomSection from '@/components/classes/GradeClassRoomSection';
import { Plus, School } from 'lucide-react';
import { toast } from 'sonner';
import { getAvailableRoles } from '@/lib/roleUtils';
import {
  GRADES,
  extractGradeFromClass,
  getUserApprovedGrade,
  getUserDivisionGrades,
  getUserHomeroomClassId,
  normalizeClassName,
  normalizeGrade,
} from '@/lib/schoolStructure';

const extractClassNumber = (name = '') => {
  const match = String(name).match(/(\d+)\s*$/);
  return match ? parseInt(match[1], 10) : 9999;
};

const sortClasses = (a, b) => {
  const numberDiff = extractClassNumber(a.name) - extractClassNumber(b.name);
  if (numberDiff !== 0) return numberDiff;
  return String(a.name || '').localeCompare(String(b.name || ''), 'he');
};

function isClassAllowed(classRoom, user, role) {
  const roles = getAvailableRoles(user);
  const isAdmin = roles.includes('system_admin') || roles.includes('admin');
  if (isAdmin || role === 'system_admin' || role === 'admin') return true;

  const grade = normalizeGrade(classRoom.grade || extractGradeFromClass(classRoom.name));
  const className = normalizeClassName(classRoom.name || '');
  const homeroomClassId = getUserHomeroomClassId(user, '');

  if (role === 'division_manager') return getUserDivisionGrades(user).includes(grade);
  if (role === 'grade_coordinator' || role === 'coordinator') {
    const approvedGrade = getUserApprovedGrade(user);
    return (!!approvedGrade && grade === approvedGrade) || (!!homeroomClassId && classRoom.id === homeroomClassId);
  }
  if (role === 'homeroom_teacher') {
    const approvedClassName = normalizeClassName(user?.profile_homeroom_class || user?.profile_class || '');
    return (!!homeroomClassId && classRoom.id === homeroomClassId) || (!!approvedClassName && className === approvedClassName);
  }

  return false;
}

function getAllowedGrades(classes, user, role) {
  const roles = getAvailableRoles(user);
  const isAdmin = roles.includes('system_admin') || roles.includes('admin');
  if (isAdmin || role === 'system_admin' || role === 'admin') return GRADES;
  if (role === 'division_manager') return getUserDivisionGrades(user);
  if (role === 'grade_coordinator' || role === 'coordinator') {
    const approvedGrade = getUserApprovedGrade(user);
    if (approvedGrade) return [approvedGrade];
  }
  return [...new Set(classes.map(item => normalizeGrade(item.grade || extractGradeFromClass(item.name))).filter(Boolean))];
}

export default function Classrooms({ user, role }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedGrades, setExpandedGrades] = useState({});

  const roles = getAvailableRoles(user);
  const canManage = roles.includes('system_admin') || roles.includes('admin') || role === 'system_admin' || role === 'admin';

  async function loadClasses() {
    setLoading(true);
    const data = await base44.entities.ClassRoom.list('grade', 500);
    setClasses(data.filter(item => item.is_active !== false));
    setLoading(false);
  }

  useEffect(() => { loadClasses(); }, []);

  const visibleClasses = useMemo(
    () => classes.filter(item => isClassAllowed(item, user, role)),
    [classes, user, role]
  );

  const gradesToShow = useMemo(
    () => getAllowedGrades(visibleClasses, user, role).filter(grade => GRADES.includes(grade)),
    [visibleClasses, user, role]
  );

  const classesByGrade = useMemo(() => {
    return gradesToShow.reduce((acc, grade) => {
      acc[grade] = visibleClasses
        .filter(item => normalizeGrade(item.grade || extractGradeFromClass(item.name)) === grade)
        .sort(sortClasses);
      return acc;
    }, {});
  }, [gradesToShow, visibleClasses]);

  async function handleSave(data) {
    if (!canManage) return;
    setSaving(true);
    if (editing?.id) await base44.entities.ClassRoom.update(editing.id, data);
    else await base44.entities.ClassRoom.create({ ...data, is_active: true });
    toast.success('הכיתה נשמרה');
    setEditing(null);
    setShowForm(false);
    setSaving(false);
    loadClasses();
  }

  async function handleDelete(classRoom) {
    if (!canManage || !window.confirm(`למחוק את ${classRoom.name}?`)) return;
    await base44.entities.ClassRoom.update(classRoom.id, { is_active: false });
    toast.success('הכיתה הוסרה מהרשימה');
    loadClasses();
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 text-right" dir="rtl">
      <PageHeader
        title="ניהול כיתות"
        subtitle="כיתות מסודרות לפי שכבות, בהתאם להרשאות הצפייה שלך"
        actions={canManage ? <Button size="sm" className="gap-2" onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4" />כיתה חדשה</Button> : null}
      />

      {showForm && canManage && <ClassRoomForm classRoom={editing} onSubmit={handleSave} onCancel={() => { setEditing(null); setShowForm(false); }} saving={saving} />}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : gradesToShow.length === 0 ? (
        <EmptyState icon={School} title="אין כיתות להצגה" description="לא נמצאו כיתות פעילות בתחום ההרשאה שלך." action={canManage ? <Button onClick={() => setShowForm(true)}>הוסף כיתה</Button> : null} />
      ) : (
        <div className="space-y-4">
          {gradesToShow.map(grade => (
            <GradeClassRoomSection
              key={grade}
              grade={grade}
              classes={classesByGrade[grade] || []}
              isOpen={expandedGrades[grade] !== false}
              onToggle={() => setExpandedGrades(prev => ({ ...prev, [grade]: prev[grade] === false }))}
              onEdit={(classRoom) => { if (canManage) { setEditing(classRoom); setShowForm(true); } }}
              onDelete={handleDelete}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}