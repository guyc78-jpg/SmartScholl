import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/ui/StatusBadge';
import { ChevronRight, Phone, Mail, Edit, Plus, Calendar, Shield, Heart, Star, MessageSquare, BarChart2, CheckSquare, Eye, EyeOff } from 'lucide-react';
import AddStudentModal from '@/components/students/AddStudentModal';
import ParentContactLog from '@/components/student/ParentContactLog';
import GrowthReport from '@/components/student/GrowthReport';
import ParentDetailsCard from '@/components/student/ParentDetailsCard';
import FamilySensitiveInfoCard from '@/components/student/FamilySensitiveInfoCard';
import { CLASS_ID } from '@/lib/demoData';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

const RatingDots = ({ value }) => (
  <div className="flex flex-row-reverse gap-1">
    {[1,2,3,4,5].map(n => (
      <div key={n} className={`w-3 h-3 rounded-full ${n <= value ? 'bg-primary' : 'bg-muted'}`} />
    ))}
  </div>
);

export default function StudentProfile({ role }) {
  const { id } = useParams();
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [discipline, setDiscipline] = useState([]);
  const [notes, setNotes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [comms, setComms] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [tab, setTab] = useState('overview');
  const [showStudentId, setShowStudentId] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [conversationForm, setConversationForm] = useState({
    date: today,
    type: 'שיחה טלפונית',
    with_whom: 'הורה 1',
    summary: '',
    follow_up: '',
    follow_up_date: ''
  });

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    setLoading(true);
    const [st, att, dis, nts, rvs, cms, tks] = await Promise.all([
      base44.entities.Student.filter({ id }),
      base44.entities.AttendanceRecord.filter({ student_id: id }),
      base44.entities.DisciplineEvent.filter({ student_id: id }),
      base44.entities.TeacherNote.filter({ student_id: id }),
      base44.entities.PerformanceReview.filter({ student_id: id }),
      base44.entities.Communication.filter({ student_id: id }),
      base44.entities.Task.filter({ student_id: id }),
    ]);
    setStudent(st[0]);
    setAttendance(att.sort((a,b) => b.date.localeCompare(a.date)));
    setDiscipline(dis.sort((a,b) => b.date.localeCompare(a.date)));
    setNotes(nts.sort((a,b) => b.date.localeCompare(a.date)));
    setReviews(rvs.sort((a,b) => b.date.localeCompare(a.date)));
    setComms(cms.sort((a,b) => b.date.localeCompare(a.date)));
    setTasks(tks);
    setLoading(false);
  }

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>;
  if (!student) return <div className="p-6 text-center text-muted-foreground">תלמיד לא נמצא</div>;

  const communityPct = student.community_service_goal > 0
    ? Math.round((student.community_service_done / student.community_service_goal) * 100) : 0;
  const canEditParents = ['admin', 'homeroom_teacher', 'coordinator'].includes(role);
  const canAccessSensitiveFamilyInfo = ['admin', 'homeroom_teacher', 'coordinator'].includes(role);
  const canViewStudentId = ['admin', 'homeroom_teacher', 'coordinator'].includes(role);
  const maskedStudentNumber = student.student_number
    ? `${student.student_number.slice(0, 2)}${'•'.repeat(Math.max(student.student_number.length - 4, 3))}${student.student_number.slice(-2)}`
    : '—';
  const presentCount = attendance.filter(a => ['נוכח', 'נוכח/ת'].includes(a.status)).length;
  const absentCount = attendance.filter(a => ['נעדר', 'נעדר/ת'].includes(a.status)).length;
  const lateCount = attendance.filter(a => ['מאחר', 'מאחר/ת'].includes(a.status)).length;
  const openDiscipline = discipline.filter(d => d.status === 'פתוח').length;

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getFullYear()}`;
  };

  const setConversationField = (field, value) => {
    setConversationForm(prev => ({ ...prev, [field]: value }));
  };

  async function handleSaveConversation() {
    if (!conversationForm.summary.trim()) {
      toast.error('יש למלא סיכום שיחה');
      return;
    }

    const communicationData = {
      ...conversationForm,
      student_id: id,
      student_name: student.full_name,
      class_id: student.class_id || CLASS_ID
    };

    await base44.entities.Communication.create(communicationData);

    if (conversationForm.follow_up.trim() && conversationForm.follow_up_date) {
      await base44.entities.Task.create({
        class_id: student.class_id || CLASS_ID,
        student_id: id,
        student_name: student.full_name,
        title: `תזכורת המשך: ${student.full_name}`,
        description: `${conversationForm.follow_up}\n\nמתוך סיכום שיחה: ${conversationForm.summary}`,
        due_date: conversationForm.follow_up_date,
        priority: 'גבוהה',
        status: 'לביצוע',
        category: 'הורים'
      });
    }

    toast.success('השיחה תועדה ומשימת ההמשך נוספה לדשבורד');
    setConversationForm({ date: today, type: 'שיחה טלפונית', with_whom: 'הורה 1', summary: '', follow_up: '', follow_up_date: '' });
    loadAll();
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-4 lg:p-6" dir="rtl">
      {/* Back */}
      <Link to="/students" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
        <ChevronRight className="w-4 h-4" />
        חזרה לרשימה
      </Link>

      {/* Student Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <Card className="max-w-full overflow-hidden p-4 sm:p-5 text-right">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl flex-shrink-0 ${student.gender === 'נקבה' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
              {student.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{student.full_name}</h1>
                    <StatusBadge status={student.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">כיתה {student.class_name || 'י׳1'}</p>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={() => setShowEdit(true)}>
                  <Edit className="w-4 h-4" />עריכה
                </Button>
              </div>

              <div className="flex flex-col gap-1.5 text-sm w-full">
                {student.phone && (
                  <a
                    href={`tel:${student.phone}`}
                    className="flex w-full items-center gap-2 rounded-lg bg-muted/40 dark:bg-muted/20 hover:bg-muted/60 dark:hover:bg-muted/30 px-3 h-9 text-foreground/80 hover:text-primary transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate">{student.phone}</span>
                  </a>
                )}
                {student.email && (
                  <a
                    href={`mailto:${student.email}`}
                    className="flex w-full items-center gap-2 rounded-lg bg-muted/40 dark:bg-muted/20 hover:bg-muted/60 dark:hover:bg-muted/30 px-3 h-9 text-foreground/80 hover:text-primary transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate force-ltr text-right">{student.email}</span>
                  </a>
                )}
                {canViewStudentId && (
                  <div className="flex w-full items-center gap-2 rounded-lg bg-muted/40 dark:bg-muted/20 px-3 h-9 text-foreground/80">
                    <Shield className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">ת.ז: {showStudentId ? (student.student_number || '—') : maskedStudentNumber}</span>
                    {student.student_number && (
                      <button
                        type="button"
                        onClick={() => setShowStudentId(prev => !prev)}
                        className="text-muted-foreground hover:text-primary flex-shrink-0"
                        aria-label="הצג או הסתר תעודת זהות"
                      >
                        {showStudentId ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="mb-4 w-full max-w-full overflow-hidden" dir="rtl">
          <TabsList className="grid w-full grid-cols-5 gap-1 p-1 h-auto">
            <TabsTrigger value="overview" className="min-w-0 px-1.5 py-2 text-xs sm:text-sm whitespace-nowrap">סקירה</TabsTrigger>
            <TabsTrigger value="attendance" className="min-w-0 px-1.5 py-2 text-xs sm:text-sm whitespace-nowrap">נוכחות</TabsTrigger>
            <TabsTrigger value="discipline" className="min-w-0 px-1.5 py-2 text-xs sm:text-sm whitespace-nowrap">משמעת</TabsTrigger>
            <TabsTrigger value="contacts" className="min-w-0 px-1.5 py-2 text-xs sm:text-sm whitespace-nowrap">קשרים</TabsTrigger>
            <TabsTrigger value="notes" className="min-w-0 px-1.5 py-2 text-xs sm:text-sm whitespace-nowrap">הערות</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview */}
         <TabsContent value="overview" className="space-y-4">
          {/* Parents */}
          <ParentDetailsCard
            student={student}
            canEdit={canEditParents}
            onStudentUpdate={(updatedParents) => setStudent(prev => ({ ...prev, ...updatedParents }))}
          />

          {canAccessSensitiveFamilyInfo && (
            <FamilySensitiveInfoCard
              student={student}
              canEdit={canAccessSensitiveFamilyInfo}
            />
          )}

          <GrowthReport studentId={id} studentName={student.full_name} />

          {/* Community Service */}
           <Card dir="rtl">
             <CardHeader className="pb-2">
               <div className="flex flex-row-reverse items-center justify-between">
                 <CardTitle className="text-sm font-semibold flex items-center justify-end gap-2"><Heart className="w-4 h-4 text-pink-500"/>מעורבות חברתית</CardTitle>
                 <StatusBadge status={student.community_service_status} />
               </div>
             </CardHeader>
             <CardContent>
               <div className="flex flex-row-reverse items-center justify-between text-sm mb-2">
                 <span className="text-muted-foreground">התקדמות</span>
                 <span className="font-bold">{student.community_service_done || 0} / {student.community_service_goal || 60} שעות</span>
               </div>
               <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
                 <div className={`h-full rounded-full transition-all ${communityPct >= 100 ? 'bg-emerald-500' : communityPct >= 50 ? 'bg-blue-500' : 'bg-red-400'}`}
                   style={{ width: `${Math.min(communityPct, 100)}%` }} />
               </div>
               <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground text-right">
                 {student.community_service_place && <div><span className="font-medium text-foreground">מקום: </span>{student.community_service_place}</div>}
                 {student.community_service_contact && <div><span className="font-medium text-foreground">איש קשר: </span>{student.community_service_contact}</div>}
               </div>
             </CardContent>
           </Card>

          {/* Latest review */}
          {reviews[0] && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart2 className="w-4 h-4 text-blue-500"/>תפקוד אחרון – {reviews[0].period}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[['הרגלי למידה', reviews[0].learning_habits], ['השתתפות', reviews[0].participation], ['אחריות', reviews[0].responsibility], ['התנהגות', reviews[0].behavior], ['תפקוד חברתי', reviews[0].social_functioning], ['מצב רגשי', reviews[0].emotional_state]].map(([label, val]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <RatingDots value={val || 0} />
                    </div>
                  ))}
                </div>
                {reviews[0].notes && <p className="text-xs text-muted-foreground mt-3 border-t pt-3">{reviews[0].notes}</p>}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Attendance */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">היסטוריית נוכחות</CardTitle></CardHeader>
            <CardContent>
              {attendance.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">אין רשומות נוכחות</p> : (
                <div className="space-y-2">
                  {attendance.slice(0, 20).map(a => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(a.date)}</span>
                        {a.note && <span className="text-xs text-muted-foreground">· {a.note}</span>}
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts */}
        <TabsContent value="contacts" className="space-y-4">
          <ParentContactLog 
            studentId={id}
            classId={student.class_id || CLASS_ID}
            studentName={student.full_name}
            parentPhone1={student.parent1_phone}
            parentPhone2={student.parent2_phone}
            user={user}
          />

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">סיכום שיחה חדש</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>תאריך</Label>
                  <Input type="date" value={conversationForm.date} onChange={e => setConversationField('date', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>סוג אינטראקציה</Label>
                  <Select value={conversationForm.type} onValueChange={v => setConversationField('type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['שיחה טלפונית', 'פגישה', 'מייל', 'הודעה', 'שיחת זום'].map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>עם מי</Label>
                  <Select value={conversationForm.with_whom} onValueChange={v => setConversationField('with_whom', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['הורה 1', 'הורה 2', 'תלמיד', 'מורה', 'יועצת', 'אחר'].map(person => <SelectItem key={person} value={person}>{person}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>סיכום שיחה *</Label>
                <Textarea value={conversationForm.summary} onChange={e => setConversationField('summary', e.target.value)} rows={4} placeholder="כתוב כאן את עיקרי השיחה, החלטות ונקודות חשובות..." />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>משימת המשך ליומן</Label>
                  <Input value={conversationForm.follow_up} onChange={e => setConversationField('follow_up', e.target.value)} placeholder="לדוגמה: להתקשר שוב להורה" />
                </div>
                <div className="space-y-1">
                  <Label>תאריך תזכורת</Label>
                  <Input type="date" value={conversationForm.follow_up_date} onChange={e => setConversationField('follow_up_date', e.target.value)} />
                </div>
              </div>

              <Button onClick={handleSaveConversation} className="w-full sm:w-auto gap-2">
                <MessageSquare className="w-4 h-4" />
                שמור סיכום ותזכורת
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">תקשורת מתועדת</CardTitle></CardHeader>
            <CardContent>
              {comms.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">אין תיעוד תקשורת</p> : (
                <div className="space-y-3">
                  {comms.map(c => (
                    <div key={c.id} className="p-3 rounded-xl bg-muted/50 space-y-1">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-sm font-medium">{c.type} · {c.with_whom}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(c.date)}</span>
                      </div>
                      <p className="text-xs text-foreground">{c.summary}</p>
                      {c.follow_up && <p className="text-xs text-primary border-e-2 border-primary pe-2">פעולת המשך: {c.follow_up}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discipline */}
         <TabsContent value="discipline">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">אירועי משמעת</CardTitle></CardHeader>
            <CardContent>
              {discipline.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">אין אירועי משמעת 🎉</p> : (
                <div className="space-y-3">
                  {discipline.map(d => (
                    <div key={d.id} className="p-3 rounded-xl bg-muted/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{formatDate(d.date)}</span>
                        <div className="flex gap-1"><StatusBadge status={d.severity} /><StatusBadge status={d.status} /></div>
                      </div>
                      <p className="text-xs text-muted-foreground">{d.category} · {d.description}</p>
                      {d.treatment && <p className="text-xs text-foreground border-e-2 border-primary pe-2">{d.treatment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-semibold">הערות מחנך (פרטיות)</CardTitle>
                <Star className="w-4 h-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">אין הערות עדיין</p> : (
                <div className="space-y-3">
                  {notes.map(n => (
                    <div key={n.id} className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{n.category}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(n.date)}</span>
                      </div>
                      <p className="text-sm text-foreground">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">הערכות תפקוד</CardTitle></CardHeader>
            <CardContent>
              {reviews.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">לא בוצעו הערכות עדיין</p> : (
                <div className="space-y-4">
                  {reviews.map(r => (
                    <div key={r.id} className="p-3 rounded-xl border space-y-3">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-medium text-sm">{r.period}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(r.date)}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[['הרגלי למידה', r.learning_habits], ['השתתפות', r.participation], ['אחריות', r.responsibility], ['התנהגות', r.behavior], ['תפקוד חברתי', r.social_functioning], ['מצב רגשי', r.emotional_state]].map(([label, val]) => (
                          <div key={label} className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <RatingDots value={val || 0} />
                          </div>
                        ))}
                      </div>
                      {r.notes && <p className="text-xs text-muted-foreground border-t pt-2">{r.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {showEdit && <AddStudentModal classId={CLASS_ID} editData={student} onClose={() => setShowEdit(false)} onSuccess={() => { setShowEdit(false); loadAll(); }} />}
    </div>
  );
}