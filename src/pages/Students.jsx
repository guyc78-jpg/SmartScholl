import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { Search, Plus, Upload, Users, ChevronLeft, Phone, Trash2, AlertTriangle, RefreshCw, MoreVertical, MessageSquare } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/AuthContext';
import { logActivity } from '@/lib/activityLogger';
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
import ImportAccommodationsModal from '@/components/students/ImportAccommodationsModal';
import ParentConversationDialog from '@/components/student/ParentConversationDialog';
import { formatStudentName, compareStudentsByLastName } from '@/lib/studentName';
import { ACCOMMODATION_TYPES, activeAccommodationLabels } from '@/lib/accommodations';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedConversationStudent, setSelectedConversationStudent] = useState(null);
  const [accommodationRecords, setAccommodationRecords] = useState({});
  const [deleting, setDeleting] = useState(false);

  const canDeleteAllStudents = role === 'admin' || role === 'coordinator' || role === 'homeroom_teacher';
  const scopeMode = getActiveScopeMode();
  const classId = role === 'coordinator' && scopeMode === 'class' ? getUserHomeroomClassId(user, CLASS_ID) : getUserApprovedClassId(user, CLASS_ID);

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
      await loadAccommodationSummaries(nextStudents);
    } catch (e) {
      setError(e.message === 'timeout' ? 'הטעינה ארכה זמן רב מדי. נסה שוב.' : 'אירעה שגיאה בטעינת התלמידים.');
      setStudents([]);
    }
    setLoading(false);
  }, [user, role, scopeMode, loadAccommodationSummaries]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

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
  const hasMore = filtered.length > visibleCount;
  const hasActiveFilters = search.trim() || statusFilter !== 'הכל' || accommodationFilter !== 'הכל';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('הכל');
    setAccommodationFilter('הכל');
  };

  const communityPct = (s) => s.community_service_goal > 0
    ? Math.round((s.community_service_done / s.community_service_goal) * 100) : 0;

  async function deleteAllStudents() {
    setDeleting(true);
    const deletedCount = students.length;
    await Promise.all(students.map(student => base44.entities.Student.delete(student.id)));
    await logActivity({
      user,
      role,
      actionName: 'delete_all_students',
      details: `${user?.full_name || 'משתמש'} מחק/ה ${deletedCount} תלמידים`,
      metadata: { deletedCount },
      severity: 'critical'
    });
    setStudents([]);
    setSearch('');
    setStatusFilter('הכל');
    setShowDeleteConfirm(false);
    toast.success('כל התלמידים נמחקו בהצלחה');
    await loadStudents();
    setDeleting(false);
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 text-right" dir="rtl">
      <PageHeader
        title="תלמידים"
        subtitle={`${students.length} תלמידים ${role === 'division_manager' ? 'בחטיבה' : role === 'coordinator' && scopeMode !== 'class' ? `בשכבה ${getUserApprovedGrade(user)}` : `בכיתה ${getUserApprovedClass(user) || 'שלי'}`}`}
      />

      <div className="space-y-3" dir="rtl">
        <div className="flex flex-wrap justify-end gap-2" dir="rtl">
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">ייבוא מאקסל</span>
          </Button>
          <Button size="sm" className="h-9 gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" />
            תלמיד חדש
          </Button>
          {canDeleteAllStudents && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={students.length === 0 || deleting}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 ms-2" />
                  מחיקת הכל
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="relative w-full">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם או מספר..."
            className="h-10 ps-9 pe-3 text-right"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" dir="rtl">
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
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
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
                <Link to={`/students/${student.id}`}>
                  <Card className="p-4 hover:shadow-md transition-all cursor-pointer border hover:border-primary/30 text-right">
                    <div className="grid grid-cols-[auto,1fr,auto] items-start gap-3" dir="rtl">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0
                        ${student.status === 'דורש מעקב' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          student.gender === 'נקבה' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {formatStudentName(student).charAt(0)}
                      </div>
                      <div className="min-w-0 text-right">
                        <div className="flex items-center gap-2 mb-1 flex-row-reverse justify-end">
                          <h3 className="font-semibold text-foreground text-sm leading-tight">{formatStudentName(student)}</h3>
                          {student.status && student.status !== 'פעיל' && <StatusBadge status={student.status} />}
                        </div>
                        <p className="text-xs text-muted-foreground">{student.class_name || 'כיתה י׳1'} · {student.grade || 'י'}</p>
                        <div className="flex gap-3 mt-1.5 flex-wrap flex-row-reverse justify-end">
                         {student.phone && (
                            <a href={`tel:${student.phone}`} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                              <Phone className="w-3 h-3 text-primary" />{student.phone}
                            </a>
                          )}
                          {student.parent1_phone && !student.phone && (
                            <a href={`tel:${student.parent1_phone}`} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                              <Phone className="w-3 h-3 text-primary" />{student.parent1_phone}
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setSelectedConversationStudent(student);
                            }}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                          >
                            <MessageSquare className="w-3 h-3 text-primary" />
                            הוסף שיחת הורה
                          </button>
                        </div>
                        {/* Community progress */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1" dir="rtl">
                            <span className="text-muted-foreground">מעורבות חברתית</span>
                            <span className="font-medium">{student.community_service_done || 0}/{student.community_service_goal || 60} שע׳</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${communityPct(student) >= 100 ? 'bg-emerald-500' : communityPct(student) >= 50 ? 'bg-blue-500' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(communityPct(student), 100)}%` }}
                            />
                          </div>
                        </div>

                      </div>
                      <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 justify-self-end" />
                    </div>
                  </Card>
                </Link>
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת כל התלמידים</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את כל התלמידים ולא ניתן לשחזר אותה
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={deleteAllStudents} disabled={deleting}>
              {deleting ? 'מוחק...' : 'מחק הכל'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}