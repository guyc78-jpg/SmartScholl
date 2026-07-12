import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import RtlActionBar from '@/components/ui/RtlActionBar';
import RtlFilterGrid from '@/components/ui/RtlFilterGrid';
import RtlSearchField from '@/components/ui/RtlSearchField';
import StudentCard from '@/components/students/StudentCard';
import ClassAssignmentAlert from '@/components/students/ClassAssignmentAlert';
import { Plus, Upload, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/AuthContext';
import {
  getUserApprovedClass,
  getUserApprovedGrade,
  getUserApprovedClassId,
  getUserHomeroomClassId,
  getActiveScopeMode,
  normalizeGrade,
} from '@/lib/schoolStructure';
import AddStudentModal from '@/components/students/AddStudentModal';
import ImportStudentsModal from '@/components/students/ImportStudentsModal';
import ParentConversationDialog from '@/components/student/ParentConversationDialog';
import QuickPerformanceReviewDialog from '@/components/students/QuickPerformanceReviewDialog';
import { formatStudentName, compareStudentsByLastName } from '@/lib/studentName';
import { ACCOMMODATION_TYPES, activeAccommodationLabels } from '@/lib/accommodations';
import { buildClassIdentityMap, getClassDisplayById } from '@/lib/classIdentity';

const PAGE_SIZE = 40;
const LOAD_TIMEOUT_MS = 15000;

// Race a promise against a timeout — fail fast if the API hangs.
const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
]);

const getDivisionGrades = (user) => {
  const division = user?.profile_division || user?.authorization?.scope?.divisionType;
  if (division === 'upper') return ['י', 'יא', 'יב'];
  if (division === 'middle') return ['ז', 'ח', 'ט'];
  return [];
};

// Build a server-side filter so we only fetch the students the user is allowed to see.
const buildScopeFilter = (user, role) => {
  if (role === 'admin') return {};
  if (role === 'division_manager') return getDivisionGrades(user).length ? {} : null;
  if (role === 'coordinator') {
    if (getActiveScopeMode() === 'class') {
      const homeroomClassId = getUserHomeroomClassId(user, '');
      return homeroomClassId ? { class_id: homeroomClassId } : null;
    }
    const grade = getUserApprovedGrade(user);
    return grade ? { grade: normalizeGrade(grade) } : null;
  }
  if (role === 'homeroom_teacher') {
    const classId = user?.profile_class_id;
    if (classId) return { class_id: classId };
    const className = getUserApprovedClass(user);
    if (className) return { class_name: className };
    return null;
  }
  return null;
};

export default function Students({ role }) {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('הכל');
  const [accommodationFilter, setAccommodationFilter] = useState('הכל');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedConversationStudent, setSelectedConversationStudent] = useState(null);
  const [selectedReviewStudent, setSelectedReviewStudent] = useState(null);
  const [classRooms, setClassRooms] = useState([]);
  const [selectedAdminClassId, setSelectedAdminClassId] = useState('');
  const [accommodationRecords, setAccommodationRecords] = useState({});
  const scopeMode = getActiveScopeMode();
  const assignedClassId = role === 'coordinator' && scopeMode === 'class'
    ? getUserHomeroomClassId(user, '')
    : getUserApprovedClassId(user, '');
  const classId = role === 'admin' ? selectedAdminClassId : assignedClassId;

  const loadAccommodationSummaries = useCallback(async (studentRows) => {
    if (!studentRows.length) {
      setAccommodationRecords({});
      return;
    }
    const response = await base44.functions.invoke('learningAccommodations', {
      action: 'listForStudents',
      student_ids: studentRows.map(student => student.id),
    });
    const next = {};
    for (const record of response.data.records || []) next[record.student_id] = record;
    setAccommodationRecords(next);
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    const scopeFilter = buildScopeFilter(user, role);

    // No permission scope → no students to show, no API call needed.
    if (scopeFilter === null) {
      setStudents([]);
      setLoading(false);
      return;
    }

    try {
      const data = await withTimeout(
        Object.keys(scopeFilter).length === 0
          ? base44.entities.Student.list('-updated_date', 500)
          : base44.entities.Student.filter(scopeFilter, '-updated_date', 500),
        LOAD_TIMEOUT_MS
      );
      const allStudents = Array.isArray(data) ? data : [];
      const divisionGrades = role === 'division_manager' ? getDivisionGrades(user) : [];
      const nextStudents = divisionGrades.length ? allStudents.filter(student => divisionGrades.includes(normalizeGrade(student.grade))) : allStudents;
      setStudents(nextStudents);
      setLoading(false);
      loadAccommodationSummaries(nextStudents);
    } catch (e) {
      setError(e.message === 'timeout' ? 'הטעינה ארכה זמן רב מדי. נסה שוב.' : 'אירעה שגיאה בטעינת התלמידים.');
      setStudents([]);
      setLoading(false);
    }
  }, [user, role, scopeMode, loadAccommodationSummaries]);

  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => { base44.entities.ClassRoom.list('grade', 500).then(rows => setClassRooms(rows || [])); }, []);

  // Reset pagination when search/filter changes.
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, statusFilter, accommodationFilter]);

  const filtered = useMemo(() => students.filter(s => {
    const matchSearch = formatStudentName(s).includes(search) || (s.student_number || '').includes(search);
    const matchStatus = statusFilter === 'הכל' || s.status === statusFilter;
    const labels = activeAccommodationLabels(accommodationRecords[s.id]?.accommodations || []);
    const matchAccommodation = accommodationFilter === 'הכל' || labels.includes(accommodationFilter);
    return matchSearch && matchStatus && matchAccommodation;
  }).sort(compareStudentsByLastName), [students, search, statusFilter, accommodationFilter, accommodationRecords]);

  const visible = filtered.slice(0, visibleCount);
  const classIdentityMap = useMemo(() => buildClassIdentityMap(classRooms), [classRooms]);
  const hasMore = filtered.length > visibleCount;
  const hasActiveFilters = search.trim() || statusFilter !== 'הכל' || accommodationFilter !== 'הכל';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('הכל');
    setAccommodationFilter('הכל');
  };

  const communityPct = (s) => s.community_service_goal > 0
    ? Math.round((s.community_service_done / s.community_service_goal) * 100) : 0;

  return (
    <div className="p-4 lg:p-6 space-y-5 text-right" dir="rtl">
      <PageHeader
        title="תלמידים"
        subtitle={`${students.length} תלמידים ${role === 'division_manager' ? 'בחטיבה' : role === 'coordinator' && scopeMode !== 'class' ? `בשכבה ${getUserApprovedGrade(user)}` : `בכיתה ${getUserApprovedClass(user) || 'שלי'}`}`}
      />

      <ClassAssignmentAlert enabled={role === 'admin'} onFixed={loadStudents} />

      {role === 'admin' && (
        <div className="max-w-sm space-y-1">
          <label className="text-xs font-medium text-muted-foreground">כיתה להוספה או לייבוא</label>
          <Select value={selectedAdminClassId} onValueChange={setSelectedAdminClassId}>
            <SelectTrigger><SelectValue placeholder="בחרו כיתה לפני הוספת תלמידים" /></SelectTrigger>
            <SelectContent>
              {classRooms.filter(item => item.is_active !== false).map(classRoom => (
                <SelectItem key={classRoom.id} value={classRoom.id}>
                  {classRoom.name}{classRoom.grade ? ` · שכבה ${classRoom.grade}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-3" dir="rtl">
        <RtlActionBar
          primary={(
            <Button size="sm" className="h-9 gap-2" onClick={() => {
              if (!classId) return toast.error('יש לבחור כיתה לפני הוספת תלמיד/ה');
              setShowAdd(true);
            }}>
              <Plus className="w-4 h-4" />
              תלמיד חדש
            </Button>
          )}
          secondary={(
            <>
              <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => {
                if (role === 'admin' && !classId) return toast.error('יש לבחור כיתה לפני ייבוא תלמידים');
                setShowImport(true);
              }}>
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">ייבוא מאקסל</span>
              </Button>
            </>
          )}
        />

        <RtlSearchField
          placeholder="חיפוש לפי שם או מספר..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <RtlFilterGrid>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['הכל', 'פעיל', 'דורש מעקב', 'מועבר', 'סיים'].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={accommodationFilter} onValueChange={setAccommodationFilter}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="סינון התאמות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="הכל">כל ההתאמות</SelectItem>
              {ACCOMMODATION_TYPES.map(item => (
                <SelectItem key={item.key} value={item.label}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="outline" className="h-10 w-full justify-center" onClick={clearFilters}>
              נקה סינון
            </Button>
          )}
        </RtlFilterGrid>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
          <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
          <Button variant="outline" size="sm" onClick={loadStudents} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            נסה שוב
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="לא נמצאו תלמידים"
          description={students.length === 0 ? 'אין עדיין תלמידים בהיקף ההרשאות שלך' : 'נסה לשנות את החיפוש או הסינון'}
          action={<Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="w-4 h-4" />הוסף תלמיד</Button>}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {visible.map((student, i) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.03 }}
              >
                <StudentCard
                  student={student}
                  communityPct={communityPct}
                  classIdentityLabel={getClassDisplayById(classIdentityMap, student.class_id, student.class_name)}
                  onParentConversation={setSelectedConversationStudent}
                  onPerformanceReview={setSelectedReviewStudent}
                />
              </motion.div>
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
                טען עוד ({filtered.length - visibleCount} נוספים)
              </Button>
            </div>
          )}
        </>
      )}

      {showAdd && <AddStudentModal classId={classId} onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); loadStudents(); }} />}
      {showImport && <ImportStudentsModal classId={classId} onClose={() => setShowImport(false)} onSuccess={() => { setShowImport(false); loadStudents(); }} />}
      <ParentConversationDialog
        open={!!selectedConversationStudent}
        onOpenChange={(open) => !open && setSelectedConversationStudent(null)}
        student={selectedConversationStudent}
      />
      <QuickPerformanceReviewDialog
        open={!!selectedReviewStudent}
        onOpenChange={(open) => !open && setSelectedReviewStudent(null)}
        student={selectedReviewStudent}
      />

    </div>
  );
}
