import { useEffect, useMemo, useState } from 'react';
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
  const progressText = doneHours <= 0
    ? 'עדיין לא התחלת את שעות המעורבות החברתית שלך השנה.'
    : `בוצעו עד כה ${doneHours} שעות מתוך יעד של ${goalHours}, וחסרות עוד ${missingHours} שעות להשלמה.`;

  if (audience === 'student') {
    return `שלום ${name},\n${progressText}\nנשמח שתעדכן/י מה תוכנית ההשלמה ומתי צפויות להתבצע השעות החסרות.\nתודה.`;
  }

  return `שלום,\nלתלמיד/ה ${name} מכיתה ${classLabel} יש כרגע חריגה במעורבות החברתית.\n${progressText}\nנשמח לעדכון לגבי המשך התוכנית והשלמת השעות.\nתודה.`;
}

function openWhatsApp(student, audience) {
  const phone = audience === 'student'
    ? normalizePhone(student.phone)
    : normalizePhone(student.parent1_phone || student.parent2_phone);
  const text = encodeURIComponent(buildWhatsAppText(student, audience));
  const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

const FILTER_COPY = {
  homeroom_teacher: 'מוצגים רק תלמידי כיתת החינוך שלך שיש להם חריגה במעורבות החברתית.',
  coordinator: 'מוצגים רק חריגים מתוך שכבת האחריות שלך. ניתן לבחור כיתה אחת להצגה.',
  division_manager: 'מוצגים רק חריגים מתוך החטיבה שלך. ניתן לבחור שכבה ואז כיתה.',
  admin: 'מוצגים רק חריגים בלבד. ניתן לבחור כל שכבה וכל כיתה.',
};

export default function CommunityExceptionsQuickAction({ students = [], loading = false, role = 'homeroom_teacher' }) {
  const [gradeFilter, setGradeFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  const canFilterByGrade = role === 'division_manager' || role === 'admin';
  const canFilterByClass = role === 'coordinator' || role === 'division_manager' || role === 'admin';

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
          gradeValue: String(student.grade || '').trim(),
          classKey: student.class_id || student.class_name || 'no-class',
          classLabel: student.class_name || student.class_id || 'ללא כיתה',
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.severityRank !== a.severityRank) return b.severityRank - a.severityRank;
        return buildStudentName(a).localeCompare(buildStudentName(b), 'he');
      });
  }, [students]);

  const scopedOptions = useMemo(() => {
    return Array.from(new Map(
      students.map((student) => {
        const gradeValue = String(student.grade || '').trim();
        const classKey = student.class_id || student.class_name || 'no-class';
        const classLabel = student.class_name || student.class_id || 'ללא כיתה';
        return [`${gradeValue}-${classKey}`, { gradeValue, classKey, classLabel }];
      })
    ).values());
  }, [students]);

  const gradeOptions = useMemo(() => {
    return [...new Set(scopedOptions.map((student) => student.gradeValue).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'he'));
  }, [scopedOptions]);

  const classOptions = useMemo(() => {
    const source = canFilterByGrade && gradeFilter !== 'all'
      ? scopedOptions.filter((student) => student.gradeValue === gradeFilter)
      : scopedOptions;

    return Array.from(new Map(
      source.map((student) => [student.classKey, { value: student.classKey, label: student.classLabel }])
    ).values()).sort((a, b) => a.label.localeCompare(b.label, 'he'));
  }, [scopedOptions, canFilterByGrade, gradeFilter]);

  useEffect(() => {
    if (!classOptions.some((option) => option.value === classFilter)) {
      setClassFilter('all');
    }
  }, [classOptions, classFilter]);

  const filteredExceptions = useMemo(() => {
    return exceptions.filter((student) => {
      const matchesGrade = !canFilterByGrade || gradeFilter === 'all' || student.gradeValue === gradeFilter;
      const matchesClass = !canFilterByClass || classFilter === 'all' || student.classKey === classFilter;
      return matchesGrade && matchesClass;
    });
  }, [exceptions, canFilterByGrade, canFilterByClass, gradeFilter, classFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground" dir="rtl">
        טוען חריגי מעורבות חברתית...
      </div>
    );
  }

  return (
    <div className="space-y-3 text-right" dir="rtl">
      <div className="rounded-2xl border bg-muted/30 p-3" dir="rtl">
        <div className="flex items-start justify-between gap-3" dir="rtl">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive flex-shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="flex-1 text-right">
            <p className="text-sm font-semibold text-foreground">חריגי מעורבות חברתית בלבד</p>
            <p className="text-[12px] text-muted-foreground">{FILTER_COPY[role] || FILTER_COPY.homeroom_teacher}</p>
          </div>
        </div>
      </div>

      {(canFilterByGrade || canFilterByClass) && (
        <div className={`grid gap-2 ${canFilterByGrade && canFilterByClass ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`} dir="rtl">
          {canFilterByGrade && (
            <div className="space-y-1 text-right">
              <p className="text-[11px] font-medium text-muted-foreground">שכבה</p>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="text-right" dir="rtl"><SelectValue placeholder="כל השכבות" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל השכבות</SelectItem>
                  {gradeOptions.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {canFilterByClass && (
            <div className="space-y-1 text-right">
              <p className="text-[11px] font-medium text-muted-foreground">כיתה</p>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="text-right" dir="rtl"><SelectValue placeholder="כל הכיתות" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הכיתות</SelectItem>
                  {classOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end" dir="rtl">
        <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
          {filteredExceptions.length} חריגים לטיפול
        </span>
      </div>

      {filteredExceptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-5 text-right text-sm text-muted-foreground" dir="rtl">
          אין כרגע תלמידים חריגים להצגה לפי הבחירה הנוכחית.
        </div>
      ) : (
        <div className="space-y-2" dir="rtl">
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