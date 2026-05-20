import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/ui/StatusBadge';
import { ChevronRight, Phone, Mail, Edit, Plus, Calendar, Shield, Heart, Star, MessageSquare, BarChart2, CheckSquare } from 'lucide-react';
import AddStudentModal from '@/components/students/AddStudentModal';
import { CLASS_ID } from '@/lib/demoData';
import { toast } from 'sonner';

const RatingDots = ({ value }) => (
  <div className="flex flex-row-reverse gap-1">
    {[1,2,3,4,5].map(n => (
      <div key={n} className={`w-3 h-3 rounded-full ${n <= value ? 'bg-primary' : 'bg-muted'}`} />
    ))}
  </div>
);

export default function StudentProfile() {
  const { id } = useParams();
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
  const presentCount = attendance.filter(a => a.status === 'נוכח').length;
  const absentCount = attendance.filter(a => a.status === 'נעדר').length;
  const lateCount = attendance.filter(a => a.status === 'מאחר').length;
  const openDiscipline = discipline.filter(d => d.status === 'פתוח').length;

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getFullYear()}`;
  };

  return (
    <div className="p-4 lg:p-6" dir="rtl">
      {/* Back */}
      <Link to="/students" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
        <ChevronRight className="w-4 h-4" />
        חזרה לרשימה
      </Link>

      {/* Student Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <Card className="p-5 text-right">
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0 ${student.gender === 'נקבה' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
              {student.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{student.full_name}</h1>
                <StatusBadge status={student.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                כיתה {student.class_name || 'י׳1'} · ת.ז {student.student_number || '—'}
              </p>
              <div className="flex flex-wrap gap-3 mt-2">
                {student.phone && (
                  <a href={`tel:${student.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Phone className="w-3 h-3" />{student.phone}
                  </a>
                )}
                {student.email && (
                  <a href={`mailto:${student.email}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Mail className="w-3 h-3" />{student.email}
                  </a>
                )}
              </div>
              {student.tags?.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {student.tags.map(tag => <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{tag}</span>)}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={() => setShowEdit(true)}>
              <Edit className="w-4 h-4" />עריכה
            </Button>
          </div>
          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600">{presentCount}</div>
              <div className="text-[10px] text-muted-foreground">נוכח</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-500">{absentCount}</div>
              <div className="text-[10px] text-muted-foreground">נעדר</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-500">{lateCount}</div>
              <div className="text-[10px] text-muted-foreground">מאחר</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${openDiscipline > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{openDiscipline}</div>
              <div className="text-[10px] text-muted-foreground">משמעת פתוח</div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-4 sm:grid-cols-6 mb-4">
          <TabsTrigger value="overview">סקירה</TabsTrigger>
          <TabsTrigger value="attendance">נוכחות</TabsTrigger>
          <TabsTrigger value="discipline">משמעת</TabsTrigger>
          <TabsTrigger value="performance">תפקוד</TabsTrigger>
          <TabsTrigger value="notes" className="hidden sm:flex">הערות</TabsTrigger>
          <TabsTrigger value="comms" className="hidden sm:flex">תקשורת</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          {/* Parents */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">הורים</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {student.parent1_name && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{student.parent1_name}</p>
                    {student.parent1_phone && <p className="text-xs text-muted-foreground">{student.parent1_phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    {student.parent1_phone && <a href={`tel:${student.parent1_phone}`}><Button variant="ghost" size="icon" className="w-8 h-8"><Phone className="w-4 h-4" /></Button></a>}
                    {student.parent1_email && <a href={`mailto:${student.parent1_email}`}><Button variant="ghost" size="icon" className="w-8 h-8"><Mail className="w-4 h-4" /></Button></a>}
                  </div>
                </div>
              )}
              {student.parent2_name && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{student.parent2_name}</p>
                    {student.parent2_phone && <p className="text-xs text-muted-foreground">{student.parent2_phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    {student.parent2_phone && <a href={`tel:${student.parent2_phone}`}><Button variant="ghost" size="icon" className="w-8 h-8"><Phone className="w-4 h-4" /></Button></a>}
                    {student.parent2_email && <a href={`mailto:${student.parent2_email}`}><Button variant="ghost" size="icon" className="w-8 h-8"><Mail className="w-4 h-4" /></Button></a>}
                  </div>
                </div>
              )}
              {!student.parent1_name && <p className="text-sm text-muted-foreground">לא הוזנו פרטי הורים</p>}
            </CardContent>
          </Card>

          {/* Community Service */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Heart className="w-4 h-4 text-pink-500"/>מעורבות חברתית</CardTitle>
                <StatusBadge status={student.community_service_status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">התקדמות</span>
                <span className="font-bold">{student.community_service_done || 0} / {student.community_service_goal || 60} שעות</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
                <div className={`h-full rounded-full transition-all ${communityPct >= 100 ? 'bg-emerald-500' : communityPct >= 50 ? 'bg-blue-500' : 'bg-red-400'}`}
                  style={{ width: `${Math.min(communityPct, 100)}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
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

        {/* Performance */}
        <TabsContent value="performance">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">הערכות תפקוד</CardTitle></CardHeader>
            <CardContent>
              {reviews.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">לא בוצעו הערכות עדיין</p> : (
                <div className="space-y-4">
                  {reviews.map(r => (
                    <div key={r.id} className="p-3 rounded-xl border space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{r.period}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(r.date)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[['הרגלי למידה', r.learning_habits], ['השתתפות', r.participation], ['אחריות', r.responsibility], ['התנהגות', r.behavior], ['תפקוד חברתי', r.social_functioning], ['מצב רגשי', r.emotional_state]].map(([label, val]) => (
                          <div key={label} className="flex items-center justify-between">
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

        {/* Notes */}
        <TabsContent value="notes">
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
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{n.category}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(n.date)}</span>
                      </div>
                      <p className="text-sm text-foreground">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications */}
        <TabsContent value="comms">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">תקשורת עם הורים</CardTitle></CardHeader>
            <CardContent>
              {comms.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">אין תיעוד תקשורת</p> : (
                <div className="space-y-3">
                  {comms.map(c => (
                    <div key={c.id} className="p-3 rounded-xl bg-muted/50 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{c.type} · {c.with_whom}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(c.date)}</span>
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
      </Tabs>

      {showEdit && <AddStudentModal classId={CLASS_ID} editData={student} onClose={() => setShowEdit(false)} onSuccess={() => { setShowEdit(false); loadAll(); }} />}
    </div>
  );
}