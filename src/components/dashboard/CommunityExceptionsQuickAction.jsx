import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import CommunityExceptionRow from '@/components/dashboard/CommunityExceptionRow';

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.slice(1)}`;
  return digits;
}

function buildStudentName(student) {
  return student.full_name || [student.first_name, student.last_name].filter(Boolean).join(' ') || 'התלמיד/ה';
}

function buildWhatsAppText(student, audience) {
  const name = buildStudentName(student);
  const doneHours = Number(student.community_service_done ?? 0);
  const goalHours = Number(student.community_service_goal ?? 60);
  const missingHours = Math.max(0, goalHours - doneHours);
  const classLabel = student.class_name || student.class_id || 'ללא כיתה';

  if (audience === 'student') {
    return `שלום ${name},\nנכון לעכשיו בוצעו ${doneHours} שעות מעורבות חברתית מתוך יעד של ${goalHours}.\nחסרות לך ${missingHours} שעות להשלמה.\nאנא עדכן/י אותנו על תכנית ההשלמה.`;
  }

  return `שלום,\nל${name} מכיתה ${classLabel} בוצעו עד כה ${doneHours} שעות מעורבות חברתית מתוך יעד של ${goalHours}.\nחסרות ${missingHours} שעות להשלמה.\nנשמח לעדכון והיערכות להשלמת השעות.`;
}

function openWhatsApp(student, audience) {
  const phone = audience === 'student'
    ? normalizePhone(student.phone)
    : normalizePhone(student.parent1_phone || student.parent2_phone);
  const text = encodeURIComponent(buildWhatsAppText(student, audience));
  const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function CommunityExceptionsQuickAction({ students = [], loading = false }) {
  const [gradeFilter, setGradeFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  const exceptions = useMemo(() => {
    return students
      .map((student) => {
        const doneHours = Number(student.community_service_done ?? 0);
        const goalHours = Number(student.community_service_goal ?? 60);
        const missingHours = Math.max(0, goalHours - doneHours);
        if (missingHours <= 0) return null;

        return {
          ...student,
          missingHours,
          severityRank: doneHours <= 0 ? 10_000 + goalHours : missingHours,
          classLabel: student.class_name || student.class_id || 'ללא כיתה',
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.severityRank !== a.severityRank) return b.severityRank - a.severityRank;
        return buildStudentName(a).localeCompare(buildStudentName(b), 'he');
      });
  }, [students]);

  const gradeOptions = useMemo(() => [...new Set(exceptions.map((student) => student.grade).filter(Boolean))], [exceptions]);
  const classOptions = useMemo(() => [...new Set(exceptions.map((student) => student.classLabel).filter(Boolean))], [exceptions]);

  const filteredExceptions = useMemo(() => {
    return exceptions.filter((student) => {
      const matchesGrade = gradeFilter === 'all' || student.grade === gradeFilter;
      const matchesClass = classFilter === 'all' || student.classLabel === classFilter;
      return matchesGrade && matchesClass;
    });
  }, [exceptions, gradeFilter, classFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground" dir="rtl">
        טוען חריגי מעורבות חברתית...
      </div>
    );
  }

  return (
    <div className="space-y-3 text-right" dir="rtl">
      <div className="rounded-2xl border bg-muted/30 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 text-right">
            <p className="text-sm font-semibold text-foreground">חריגי מעורבות חברתית בלבד</p>
            <p className="text-[12px] text-muted-foreground">מוצגים רק תלמידים שלא התחילו או שחסרות להם שעות ביחס ליעד.</p>
          </div>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1 text-right">
          <p className="text-[11px] font-medium text-muted-foreground">סינון לפי כיתה</p>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="text-right"><SelectValue placeholder="כל הכיתות" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הכיתות</SelectItem>
              {classOptions.map((className) => <SelectItem key={className} value={className}>{className}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[11px] font-medium text-muted-foreground">סינון לפי שכבה</p>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="text-right"><SelectValue placeholder="כל השכבות" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל השכבות</SelectItem>
              {gradeOptions.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end">
        <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
          {filteredExceptions.length} חריגים לטיפול
        </span>
      </div>

      {filteredExceptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-6 text-right text-sm text-muted-foreground" dir="rtl">
          אין כרגע חריגים להצגה לפי הסינון שנבחר.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExceptions.map((student) => (
            <CommunityExceptionRow
              key={student.id}
              student={student}
              onStudentWhatsApp={(currentStudent) => openWhatsApp(currentStudent, 'student')}
              onParentsWhatsApp={(currentStudent) => openWhatsApp(currentStudent, 'parents')}
            />
          ))}
        </div>
      )}
    </div>
  );
}