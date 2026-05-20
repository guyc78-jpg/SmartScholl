import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, AlertTriangle, Clock, MessageSquare, CheckSquare, FileText, Star } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import WatchStudentsList from '@/components/grade/WatchStudentsList';
import AttendanceSummary from '@/components/grade/AttendanceSummary';
import DisciplineList from '@/components/grade/DisciplineList';
import CommunicationsList from '@/components/grade/CommunicationsList';
import TasksList from '@/components/grade/TasksList';
import NotesList from '@/components/grade/NotesList';

const TABS = [
  { id: 'overview', label: 'סקירה', icon: Users },
  { id: 'attendance', label: 'נוכחות', icon: Clock },
  { id: 'discipline', label: 'אירועים', icon: AlertTriangle },
  { id: 'communications', label: 'שיחות', icon: MessageSquare },
  { id: 'tasks', label: 'משימות', icon: CheckSquare },
  { id: 'notes', label: 'הערות', icon: Star },
];

export default function ClassDashboard({ classInfo, user, role }) {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState({ students: [], attendance: [], discipline: [], communications: [], tasks: [], notes: [] });
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const [students, attendance, discipline, communications, tasks, notes] = await Promise.all([
      base44.entities.Student.filter({ class_id: classInfo.id }),
      base44.entities.AttendanceRecord.filter({ class_id: classInfo.id }),
      base44.entities.DisciplineEvent.filter({ class_id: classInfo.id }),
      base44.entities.Communication.filter({ class_id: classInfo.id }),
      base44.entities.Task.filter({ class_id: classInfo.id }),
      base44.entities.TeacherNote.filter({ class_id: classInfo.id }),
    ]);
    setData({ students, attendance, discipline, communications, tasks, notes });
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [classInfo.id]);

  const watchStudents = data.students.filter(s => s.status === 'דורש מעקב');
  const openTasks = data.tasks.filter(t => t.status !== 'בוצע');
  const openDiscipline = data.discipline.filter(d => d.status === 'פתוח');

  // Attendance stats per student
  const attByStudent = {};
  data.students.forEach(s => { attByStudent[s.id] = { absences: 0, lates: 0 }; });
  data.attendance.forEach(r => {
    if (!attByStudent[r.student_id]) return;
    if (r.status === 'נעדר/ת' || r.status === 'נעדר') attByStudent[r.student_id].absences++;
    if (r.status === 'מאחר/ת' || r.status === 'מאחר') attByStudent[r.student_id].lates++;
  });

  const statCards = [
    { label: 'תלמידים', value: data.students.length, color: 'bg-blue-100 text-blue-700', icon: Users },
    { label: 'דורשים מעקב', value: watchStudents.length, color: watchStudents.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700', icon: AlertTriangle },
    { label: 'אירועים פתוחים', value: openDiscipline.length, color: openDiscipline.length > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700', icon: AlertTriangle },
    { label: 'משימות פתוחות', value: openTasks.length, color: openTasks.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700', icon: CheckSquare },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* Stat summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(sc => {
          const Icon = sc.icon;
          return (
            <div key={sc.label} className={`rounded-xl p-3 flex items-center gap-3 ${sc.color}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-xl font-bold leading-none">{sc.value}</p>
                <p className="text-xs mt-0.5 opacity-80">{sc.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto bg-muted p-1 rounded-xl w-full">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0
                ${tab === t.id ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <WatchStudentsList
          students={data.students}
          attByStudent={attByStudent}
          classId={classInfo.id}
        />
      )}
      {tab === 'attendance' && (
        <AttendanceSummary
          students={data.students}
          attendance={data.attendance}
          attByStudent={attByStudent}
        />
      )}
      {tab === 'discipline' && (
        <DisciplineList events={data.discipline} onRefresh={loadData} user={user} role={role} classId={classInfo.id} students={data.students} />
      )}
      {tab === 'communications' && (
        <CommunicationsList comms={data.communications} onRefresh={loadData} user={user} role={role} classId={classInfo.id} students={data.students} />
      )}
      {tab === 'tasks' && (
        <TasksList tasks={data.tasks} onRefresh={loadData} user={user} role={role} classId={classInfo.id} students={data.students} />
      )}
      {tab === 'notes' && (
        <NotesList notes={data.notes} onRefresh={loadData} user={user} role={role} classId={classInfo.id} students={data.students} />
      )}
    </div>
  );
}