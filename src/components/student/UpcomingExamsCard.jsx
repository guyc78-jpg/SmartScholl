import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EventTypeBadge from '@/components/exams/EventTypeBadge';
import { BookOpen, ChevronLeft } from 'lucide-react';

const fmt = d => d ? new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) : '';

export default function UpcomingExamsCard({ exams }) {
  const next = (exams || []).slice(0, 3);
  return (
    <Card dir="rtl" className="text-right">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-purple-500" />מבחנים ואירועים קרובים</CardTitle>
        <Link to="/student-exams" className="text-xs text-primary font-medium flex items-center gap-0.5">הכל<ChevronLeft className="w-3.5 h-3.5" /></Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {next.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין מבחנים או אירועים קרובים 🎉</p>
        ) : next.map(exam => (
          <Link key={exam.id} to="/student-exams" className="flex items-center gap-3 rounded-xl border p-2.5 hover:border-primary/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 flex items-center justify-center text-xs font-bold flex-shrink-0">{fmt(exam.date)}</div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-sm font-medium truncate">{exam.title}</p>
              <p className="text-xs text-muted-foreground truncate">{exam.subject}{exam.time ? ` · ${exam.time}` : ''}</p>
            </div>
            <EventTypeBadge type={exam.type} />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}