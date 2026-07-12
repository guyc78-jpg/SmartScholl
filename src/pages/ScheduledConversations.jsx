import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import { CalendarClock, Plus, Edit, Trash2, Check, Bell, User, Users, HeartPulse, MessageSquare } from 'lucide-react';
import { formatStudentName } from '@/lib/studentName';
import { useAuth } from '@/lib/AuthContext';
import { getUserHomeroomClassId, getUserApprovedClassId, getUserApprovedGrade } from '@/lib/schoolStructure';
import { getAttendanceScopedStudents } from '@/lib/attendanceScope.js';
import useDeleteConfirm from '@/hooks/useDeleteConfirm';
import ScheduledConversationForm from '@/components/conversations/ScheduledConversationForm';
import { formatSchoolDate } from '@/lib/dateUtils';

const TYPE_ICONS = {
  'שיחה אישית עם תלמיד': User,
  'שיחת הורים': Users,
  'פגישה טיפולית': HeartPulse,
  'תזכורת טיפולית': Bell,
};

const STATUS_STYLES = {
  'מתוכננת': 'bg-primary/10 text-primary',
  'בוצעה': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'בוטלה': 'bg-muted text-muted-foreground',
};

function formatDate(d) {
  return formatSchoolDate(d, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ScheduledConversations({ role = 'homeroom_teacher', user: userProp }) {
  const { user: authUser } = useAuth();
  const user = userProp || authUser;
  const fallbackClassId = role === 'coordinator' ? getUserHomeroomClassId(user, '') : getUserApprovedClassId(user, '');

  const [conversations, setConversations] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const { confirmDelete, DeleteConfirm } = useDeleteConfirm();

  useEffect(() => { loadData(); }, [user?.id, role]);

  async function loadData() {
    setLoading(true);
    try {
      const scopedStudents = await getAttendanceScopedStudents(user, role);
      setStudents(scopedStudents);
      const scopedIds = new Set(scopedStudents.map(s => s.id));
      const classIds = new Set(scopedStudents.map(s => s.class_id).filter(Boolean));
      const all = await base44.entities.ScheduledConversation.list('-date', 500);
      const visible = all.filter(c =>
        c.owner_user_id === user?.id ||
        (c.student_id && scopedIds.has(c.student_id)) ||
        (c.class_id && classIds.has(c.class_id))
      );
      setConversations(visible.sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)));
    } catch {
      toast.error('שגיאה בטעינת השיחות');
    }
    setLoading(false);
  }

  function openAdd() { setEditItem(null); setShowForm(true); }
  function openEdit(c) {
    setEditItem({
      id: c.id, title: c.title, conversation_type: c.conversation_type, date: c.date, time: c.time,
      student_id: c.student_id || '', participants: c.participants || '', notes: c.notes || '',
    });
    setShowForm(true);
  }

  async function handleSave(form) {
    const student = students.find(s => s.id === form.student_id);
    const classId = student?.class_id || fallbackClassId;
    const data = {
      title: form.title.trim(),
      conversation_type: form.conversation_type,
      date: form.date,
      time: form.time,
      student_id: form.student_id || '',
      student_name: student ? formatStudentName(student) : '',
      class_id: classId || '',
      grade: student?.grade || getUserApprovedGrade(user) || '',
      participants: form.participants || '',
      notes: form.notes || '',
      owner_user_id: user?.id || '',
      owner_email: user?.email || '',
      status: 'מתוכננת',
    };
    if (editItem) {
      // updating resets the reminder so an edited time re-arms the push
      await base44.entities.ScheduledConversation.update(editItem.id, { ...data, reminder_sent: false, reminder_for_datetime: '' });
      toast.success('השיחה עודכנה');
    } else {
      await base44.entities.ScheduledConversation.create({ ...data, reminder_sent: false });
      toast.success('השיחה נקבעה — תישלח תזכורת שעה לפני');
    }
    loadData();
  }

  async function markDone(c) {
    await base44.entities.ScheduledConversation.update(c.id, { status: 'בוצעה' });
    toast.success('סומן כבוצע');
    loadData();
  }

  async function handleDelete(id) {
    const approved = await confirmDelete({
      title: 'למחוק את השיחה המתוכננת?',
      description: 'התזכורת תבוטל והשיחה תוסר מהרשימה.',
    });
    if (!approved) return;
    await base44.entities.ScheduledConversation.delete(id);
    toast.success('נמחק');
    loadData();
  }

  const canManage = ['admin', 'homeroom_teacher', 'coordinator', 'division_manager'].includes(role);

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader
        title="שיחות מתוכננות"
        subtitle="תזכורת פוש אוטומטית שעה לפני כל שיחה"
        actions={canManage ? <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="w-4 h-4" />שיחה חדשה</Button> : null}
      />

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : conversations.length === 0 ? (
        <EmptyState icon={CalendarClock} title="אין שיחות מתוכננות" description="קבע שיחה ראשונה ותקבל תזכורת פוש שעה לפני המועד" action={canManage ? <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" />שיחה חדשה</Button> : null} />
      ) : (
        <div className="space-y-3">
          {conversations.map((c, i) => {
            const TypeIcon = TYPE_ICONS[c.conversation_type] || MessageSquare;
            const isDone = c.status !== 'מתוכננת';
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className={`p-4 ${isDone ? 'opacity-70' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{c.title}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{c.conversation_type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status] || ''}`}>{c.status}</span>
                        <span className="text-xs text-muted-foreground mr-auto">{formatDate(c.date)} · {c.time}</span>
                      </div>
                      {c.student_name && <p className="text-sm text-foreground">{formatStudentName(c.student_name)}</p>}
                      {c.participants && <p className="text-xs text-muted-foreground mt-0.5">משתתפים: {c.participants}</p>}
                      {c.notes && <p className="text-sm text-foreground/80 mt-1">{c.notes}</p>}
                      {c.status === 'מתוכננת' && (
                        <p className="text-[11px] text-primary mt-1.5 flex items-center gap-1">
                          <Bell className="w-3 h-3" /> תזכורת תישלח שעה לפני
                        </p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        {c.status === 'מתוכננת' && (
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-emerald-600" onClick={() => markDone(c)} title="סמן כבוצע"><Check className="w-3.5 h-3.5" /></Button>
                        )}
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(c)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ScheduledConversationForm
          open={showForm}
          onOpenChange={setShowForm}
          students={students}
          initial={editItem}
          onSave={handleSave}
        />
      )}
      <DeleteConfirm />
    </div>
  );
}
