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
import { Search, Plus, Upload, Filter, Users, ChevronLeft, Phone, Mail } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddStudentModal from '@/components/students/AddStudentModal';
import ImportStudentsModal from '@/components/students/ImportStudentsModal';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('הכל');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

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

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader
        title="תלמידים"
        subtitle={`${students.length} תלמידים בכיתה`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowImport(true)}>
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">ייבוא מאקסל</span>
            </Button>
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
            className="pr-9"
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
                <Card className="p-4 hover:shadow-md transition-all cursor-pointer border hover:border-primary/30">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0
                      ${student.status === 'דורש מעקב' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        student.gender === 'נקבה' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                      {student.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{student.full_name}</h3>
                        <StatusBadge status={student.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">ת.ז: {student.student_number || '—'}</p>
                      <div className="flex gap-3 mt-2">
                        {student.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />{student.phone}
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
                    <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {showAdd && <AddStudentModal classId={CLASS_ID} onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); loadStudents(); }} />}
      {showImport && <ImportStudentsModal classId={CLASS_ID} onClose={() => setShowImport(false)} onSuccess={() => { setShowImport(false); loadStudents(); }} />}
    </div>
  );
}