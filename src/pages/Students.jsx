import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { Search, Plus, Upload, Users, ChevronLeft, Phone, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddStudentModal from '@/components/students/AddStudentModal';
import ImportStudentsModal from '@/components/students/ImportStudentsModal';

export default function Students({ role }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('הכל');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canDeleteAllStudents = role === 'admin' || role === 'coordinator';

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents() {
    setLoading(true);
    const data = await base44.entities.Student.filter({ class_id: CLASS_ID });
    setStudents(data);
    setLoading(false);
  }

  const filtered = students.filter(s => {
    const matchSearch = s.full_name.includes(search) || (s.student_number || '').includes(search);
    const matchStatus = statusFilter === 'הכל' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const communityPct = (s) => s.community_service_goal > 0
    ? Math.round((s.community_service_done / s.community_service_goal) * 100) : 0;

  async function deleteAllStudents() {
    setDeleting(true);
    await Promise.all(students.map(student => base44.entities.Student.delete(student.id)));
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
        subtitle={`${students.length} תלמידים בכיתה`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowImport(true)}>
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">ייבוא מאקסל</span>
            </Button>
            {canDeleteAllStudents && (
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={students.length === 0 || deleting}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">מחיקת הכל</span>
              </Button>
            )}
            <Button size="sm" className="gap-2" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" />
              תלמיד חדש
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם או מספר..."
            className="pe-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['הכל', 'פעיל', 'דורש מעקב', 'מועבר', 'סיים'].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="לא נמצאו תלמידים"
          description="הוסף תלמידים לכיתה או שנה את הסינון"
          action={<Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="w-4 h-4" />הוסף תלמיד</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((student, i) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link to={`/students/${student.id}`}>
                <Card className="p-4 hover:shadow-md transition-all cursor-pointer border hover:border-primary/30 text-right">
                  <div className="grid grid-cols-[auto,1fr,auto] items-start gap-3" dir="rtl">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0
                      ${student.status === 'דורש מעקב' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        student.gender === 'נקבה' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                      {student.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0 text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-sm leading-tight">{student.full_name}</h3>
                        <StatusBadge status={student.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{student.class_name || 'כיתה י׳1'} · {student.grade || 'י'}</p>
                      <div className="flex gap-3 mt-1.5 flex-wrap">
                        {student.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />{student.phone}
                          </span>
                        )}
                        {student.parent1_phone && !student.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />{student.parent1_phone}
                          </span>
                        )}
                      </div>
                      {/* Community progress */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
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
                      {/* Tags */}
                      {student.tags?.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {student.tags.map(tag => (
                            <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 justify-self-end" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {showAdd && <AddStudentModal classId={CLASS_ID} onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); loadStudents(); }} />}
      {showImport && <ImportStudentsModal classId={CLASS_ID} onClose={() => setShowImport(false)} onSuccess={() => { setShowImport(false); loadStudents(); }} />}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת כל התלמידים</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את כל התלמידים ולא ניתן לשחזר אותה
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
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