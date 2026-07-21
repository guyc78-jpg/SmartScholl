import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { getStudentClassId } from '@/lib/studentProfile';
import { getUserApprovedClass, getUserApprovedClassId } from '@/lib/schoolStructure';
import { findClassRoomByName } from '@/lib/classAssignment';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PageHeader from '@/components/ui/PageHeader';
import RtlActionBar from '@/components/ui/RtlActionBar';
import { toast } from 'sonner';
import { FileUp, Palette } from 'lucide-react';
import ImportScheduleDialog from '@/components/schedule/ImportScheduleDialog';
import WeeklyScheduleGrid from '@/components/schedule/WeeklyScheduleGrid';
import CellEditorDialog from '@/components/schedule/CellEditorDialog';
import NowNextCard from '@/components/schedule/NowNextCard';
import { loadBellSchedule, getNowAndNext, getTodayHebrewName } from '@/lib/bellSchedule';
import { autoFixSubjectColors, ensureSubjectForName, loadAndNormalizeSubjects, subjectMapById } from '@/lib/scheduleSubjects';
import { getPageCache, setPageCache } from '@/lib/pageDataCache';

// Build the weekly rows from the bell schedule: lessons plus visible break rows.
function buildPeriodRows(bellPeriods) {
  const visibleRows = (bellPeriods || [])
    .filter(p => p.kind === 'lesson' || p.kind === 'break')
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  if (visibleRows.length === 0) {
    return Array.from({ length: 12 }, (_, i) => ({ kind: 'lesson', period: i + 1, start_time: '', end_time: '', label: `שיעור ${i + 1}` }));
  }

  return visibleRows.map((row, index) => ({
    ...row,
    row_key: row.kind === 'break' ? `break-${row.start_time || index}` : `lesson-${row.period || index}`,
    label: row.label || (row.kind === 'break' ? 'הפסקה' : `שיעור ${row.period}`),
  }));
}

export default function Schedule({ role = 'homeroom_teacher', user }) {
  const initialClassId = role === 'student' ? getStudentClassId(user, '') : getUserApprovedClassId(user, '');
  const cacheKey = `schedule:${initialClassId}`;
  const cached = getPageCache(cacheKey);
  const [slots, setSlots] = useState(cached?.slots || []);
  const [subjects, setSubjects] = useState(cached?.subjects || []);
  const [periods, setPeriods] = useState(cached?.periods || []);
  const [className, setClassName] = useState(cached?.className || '');
  const [classGrade, setClassGrade] = useState(cached?.classGrade || '');
  const [activeClassId, setActiveClassId] = useState(cached?.activeClassId || '');
  const [loading, setLoading] = useState(!cached);

  const [showImport, setShowImport] = useState(false);
  const [fixingColors, setFixingColors] = useState(false);
  const [confirmColorFix, setConfirmColorFix] = useState(false);
  const [editor, setEditor] = useState(null); // { day, period, slot, periodRow }
  const [currentPeriod, setCurrentPeriod] = useState(null);

  const canEdit = role === 'homeroom_teacher' || role === 'admin' || role === 'system_admin';
  const canFixColors = role === 'admin' || role === 'system_admin';
  const classId = role === 'student' ? getStudentClassId(user, '') : getUserApprovedClassId(user, '');
  const fallbackClassName = getUserApprovedClass(user);
  const todayDayName = getTodayHebrewName();

  // Update current-period highlight every 30s
  useEffect(() => {
    if (periods.length === 0) return;
    const fullPeriods = periods.filter(p => p.start_time);
    const tick = () => {
      const { current } = getNowAndNext(fullPeriods);
      setCurrentPeriod(current?.period || null);
    };
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [periods]);

  useEffect(() => { load(); }, [classId]);

  async function load() {
    if (!getPageCache(cacheKey)) setLoading(true);
    try {
    const [bellPeriods, classRooms] = await Promise.all([
      loadBellSchedule('sun_thu'), // weekly view shows Sun–Thu
      base44.entities.ClassRoom.list('-updated_date', 200),
    ]);
    const classRoom = classRooms.find(room => room.id === classId) || findClassRoomByName(classRooms, fallbackClassName);
    const resolvedClassId = classRoom?.id || classId;
    const data = await base44.entities.ScheduleSlot.filter({ class_id: resolvedClassId });
    const normalizedSubjects = await loadAndNormalizeSubjects(data || []);
    const subjectByKey = Object.fromEntries(normalizedSubjects.map(subject => [subject.normalized_key, subject]));
    const normalizedSlots = (data || []).map(slot => {
      const subject = subjectByKey[String(slot.subject || '').trim().replace(/\s+/g, ' ').replace(/["'`׳״]/g, '').toLowerCase()];
      return subject && slot.subject_id !== subject.id ? { ...slot, subject_id: subject.id } : slot;
    });
    const nextPeriods = buildPeriodRows(bellPeriods);
    const nextClassName = classRoom?.name || fallbackClassName || '';
    const nextClassGrade = classRoom?.grade || '';
    setActiveClassId(resolvedClassId);
    setSubjects(normalizedSubjects);
    setSlots(normalizedSlots);
    setPeriods(nextPeriods);
    setClassName(nextClassName);
    setClassGrade(nextClassGrade);
    setPageCache(cacheKey, {
      slots: normalizedSlots,
      subjects: normalizedSubjects,
      periods: nextPeriods,
      className: nextClassName,
      classGrade: nextClassGrade,
      activeClassId: resolvedClassId,
    });
    } catch (error) {
      console.error('Failed to load schedule', error);
      setSlots([]);
      setSubjects([]);
      toast.error('טעינת מערכת השעות נכשלה. אפשר לנסות שוב.');
    } finally {
      setLoading(false);
    }
  }

  const slotsByKey = useMemo(() => {
    const map = {};
    const seen = new Set();
    slots.forEach(s => {
      const key = `${s.day}|${Number(s.period)}`;
      const uniqueKey = `${key}|${String(s.subject || '').trim()}|${String(s.teacher || '').trim()}|${String(s.room || '').trim()}`;
      if (seen.has(uniqueKey)) return;
      seen.add(uniqueKey);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [slots]);

  const subjectsById = useMemo(() => subjectMapById(subjects), [subjects]);

  const openCell = useCallback((day, period, slot, periodRow) => {
    if (!canEdit && !slot) return;
    setEditor({ day, period, slot, periodRow });
  }, [canEdit]);

  const handleSaveCell = useCallback(async (payload) => {
    const { day, period, slot, periodRow } = editor;
    if (!(activeClassId || classId)) {
      toast.error('יש לבחור כיתה לפני שמירת מערכת השעות');
      return;
    }
    const subjectDefinition = await ensureSubjectForName(payload.subject, subjects, payload.subject_color);
    const { subject_color, ...slotPayload } = payload;
    const base = {
      class_id: activeClassId || classId,
      grade: classGrade,
      day,
      period: Number(period),
      start_time: periodRow?.start_time || '',
      end_time: periodRow?.end_time || '',
      ...slotPayload,
      subject_id: subjectDefinition?.id || payload.subject_id || '',
    };
    if (slot?.id) {
      await base44.entities.ScheduleSlot.update(slot.id, base);
      toast.success('עודכן');
    } else {
      await base44.entities.ScheduleSlot.create(base);
      toast.success('נוסף לשיעור');
    }
    setEditor(null);
    load();
  }, [editor, activeClassId, classId, classGrade, subjects]);

  const handleDeleteCell = useCallback(async (id) => {
    await base44.entities.ScheduleSlot.delete(id);
    toast.success('נמחק');
    setEditor(null);
    load();
  }, []);

  async function handleFixColors() {
    if (!canFixColors) {
      toast.error('אין הרשאה לשינוי צבעים בית-ספרי');
      return;
    }
    setConfirmColorFix(false);
    setFixingColors(true);
    try {
      const count = await autoFixSubjectColors();
      await load();
      toast.success(count > 0 ? `עודכנו ${count} מקצועות עם צבעים ייחודיים` : 'כל המקצועות כבר עם צבעים ייחודיים');
    } catch (error) {
      console.error('Failed to update global subject colors', error);
      toast.error('סידור צבעי המקצועות נכשל. לא כל הצבעים עודכנו.');
    } finally {
      setFixingColors(false);
    }
  }

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6 space-y-4" dir="rtl">
      <PageHeader
        title="מערכת שעות"
        subtitle="לוח שבועי לפי הצלצולים — ימים א׳–ו׳"
        actions={canEdit ? (
          <RtlActionBar
            primary={(
              <Button size="sm" variant="outline" className="h-9 gap-2" onClick={() => setShowImport(true)}>
                <FileUp className="w-4 h-4" /> ייבוא קובץ
              </Button>
            )}
            secondary={canFixColors ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-2 text-violet-600 border-violet-200 hover:bg-violet-50 hover:text-violet-700 dark:border-violet-800 dark:text-violet-400"
                  disabled={fixingColors}
                  onClick={() => setConfirmColorFix(true)}
                >
                  <Palette className="w-4 h-4" />
                  {fixingColors ? 'מסדר...' : 'סדר צבעים'}
                </Button>
              </div>
            ) : null}
          />
        ) : null}
      />


      {/* Smart card synced with bells */}
      <NowNextCard classId={activeClassId || classId} />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <WeeklyScheduleGrid
          periods={periods}
          slotsByKey={slotsByKey}
          todayDayName={todayDayName}
          currentPeriod={currentPeriod}
          canEdit={canEdit}
          onCellClick={openCell}
          subjectsById={subjectsById}
        />
      )}

      {showImport && (
        <ImportScheduleDialog
          open={showImport}
          onOpenChange={setShowImport}
          onImported={load}
          classId={activeClassId || classId}
          className={className}
          grade={classGrade}
        />
      )}

      {editor && (
        <CellEditorDialog
          open
          onOpenChange={(v) => !v && setEditor(null)}
          slot={editor.slot}
          day={editor.day}
          period={editor.period}
          periodTime={editor.periodRow?.start_time && editor.periodRow?.end_time
            ? `${editor.periodRow.start_time}–${editor.periodRow.end_time}` : ''}
          onSave={handleSaveCell}
          onDelete={handleDeleteCell}
          subjects={subjects}
        />
      )}

      <AlertDialog open={confirmColorFix} onOpenChange={setConfirmColorFix}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">לסדר מחדש את צבעי המקצועות?</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              הפעולה מעדכנת את צבעי המקצועות לכל בית הספר, ולכן תשפיע על מערכות השעות של כל הכיתות והמשתמשים.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={fixingColors}>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleFixColors} disabled={fixingColors}>
              אשר שינוי גלובלי
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}