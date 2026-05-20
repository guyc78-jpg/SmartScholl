import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CLASS_ID } from '@/lib/demoData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileBarChart, Download } from 'lucide-react';

export default function Reports() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [discipline, setDiscipline] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    setLoading(true);
    const [sts, att, dis, exs] = await Promise.all([
      base44.entities.Student.filter({ class_id: CLASS_ID }),
      base44.entities.AttendanceRecord.filter({ class_id: CLASS_ID }),
      base44.entities.DisciplineEvent.filter({ class_id: CLASS_ID }),
      base44.entities.Exam.filter({ class_id: CLASS_ID }),
    ]);
    setStudents(sts);
    setAttendance(att);
    setDiscipline(dis);
    setExams(exs);
    setLoading(false);
  }

  const filteredAtt = attendance.filter(a => {
    const inRange = a.date >= dateFrom && a.date <= dateTo;
    const studentMatch = selectedStudent === 'all' || a.student_id === selectedStudent;
    return inRange && studentMatch;
  });

  const filteredDis = discipline.filter(d => {
    const inRange = d.date >= dateFrom && d.date <= dateTo;
    const studentMatch = selectedStudent === 'all' || d.student_id === selectedStudent;
    return inRange && studentMatch;
  });

  // Attendance stats
  const countStatuses = (records, statuses) => records.filter(a => statuses.includes(a.status)).length;
  const attStats = {
    'נוכח': countStatuses(filteredAtt, ['נוכח', 'נוכח/ת']),
    'נעדר': countStatuses(filteredAtt, ['נעדר', 'נעדר/ת']),
    'מאחר': countStatuses(filteredAtt, ['מאחר', 'מאחר/ת']),
    'מוצדק': countStatuses(filteredAtt, ['מוצדק']),
    'שוחרר': countStatuses(filteredAtt, ['שוחרר', 'שוחרר/ה']),
  };

  const attChartData = Object.entries(attStats).map(([name, value]) => ({ name, value }));
  const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'];

  // Attendance per student (top absentees)
  const studentAttStats = students.map(s => {
    const sAtt = filteredAtt.filter(a => a.student_id === s.id);
    return {
      name: s.full_name.split(' ')[0],
      נוכח: countStatuses(sAtt, ['נוכח', 'נוכח/ת']),
      נעדר: countStatuses(sAtt, ['נעדר', 'נעדר/ת']),
      מאחר: countStatuses(sAtt, ['מאחר', 'מאחר/ת']),
    };
  }).sort((a,b) => b.נעדר - a.נעדר);

  const communityData = students.map(s => ({
    name: s.full_name.split(' ')[0],
    שבוצע: s.community_service_done || 0,
    יעד: s.community_service_goal || 60,
  })).slice(0, 8);

  const exportCSV = () => {
    const rows = [['תלמיד', 'תאריך', 'סטטוס', 'הערה']];
    filteredAtt.forEach(a => rows.push([a.student_name, a.date, a.status, a.note || '']));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'דוח_נוכחות.csv'; a.click();
  };

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader title="דוחות" subtitle="ניתוח נתוני הכיתה"
        actions={<Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}><Download className="w-4 h-4"/>ייצוא CSV</Button>} />

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>תלמיד</Label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הכיתה</SelectItem>
                {students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>מתאריך</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}/></div>
          <div className="space-y-1"><Label>עד תאריך</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}/></div>
        </div>
      </Card>

      {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/></div>
      : <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{attStats['נוכח']}</div>
              <div className="text-xs text-muted-foreground">נוכחויות</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{attStats['נעדר']}</div>
              <div className="text-xs text-muted-foreground">היעדרויות</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{attStats['מאחר']}</div>
              <div className="text-xs text-muted-foreground">איחורים</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{filteredDis.filter(d => d.status === 'פתוח').length}</div>
              <div className="text-xs text-muted-foreground">משמעת פתוחה</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">התפלגות נוכחות</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={attChartData.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {attChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">נוכחות לפי תלמיד (היעדרויות)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={studentAttStats.slice(0, 6)} layout="vertical" margin={{ right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }}/>
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={50}/>
                    <Tooltip />
                    <Bar dataKey="נעדר" fill="#EF4444" name="נעדר"/>
                    <Bar dataKey="מאחר" fill="#F59E0B" name="מאחר"/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">מעורבות חברתית לפי תלמיד</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={communityData} margin={{ right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
                    <YAxis tick={{ fontSize: 11 }}/>
                    <Tooltip />
                    <Bar dataKey="שבוצע" fill="#10B981" name="שעות שבוצעו"/>
                    <Bar dataKey="יעד" fill="#93C5FD" name="יעד"/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Discipline Events Table */}
          {filteredDis.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">אירועי משמעת בתקופה</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredDis.map(d => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                      <span className="font-medium">{d.student_name}</span>
                      <span className="text-muted-foreground text-xs">{d.date}</span>
                      <StatusBadge status={d.severity} />
                      <StatusBadge status={d.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      }
    </div>
  );
}