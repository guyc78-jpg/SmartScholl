import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import PreviewSummary from '@/components/year-transition/PreviewSummary';
import ClassMappingTable from '@/components/year-transition/ClassMappingTable';
import DeleteCountsTable from '@/components/year-transition/DeleteCountsTable';
import TeacherMappingTable from '@/components/year-transition/TeacherMappingTable';
import ConfirmResetCard from '@/components/year-transition/ConfirmResetCard';

export default function YearTransition() {
  const [moveTeachers, setMoveTeachers] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [teacherOverrides, setTeacherOverrides] = useState({});
  const [previousSchoolYear, setPreviousSchoolYear] = useState('');
  const [newSchoolYear, setNewSchoolYear] = useState('');

  const loadPreview = async () => {
    setLoading(true); setError('');
    try {
      const res = await base44.functions.invoke('yearTransitionReset', { mode: 'preview', moveTeachers });
      setPreview(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'לא ניתן לטעון תצוגה מקדימה');
    }
    setLoading(false);
  };

  useEffect(() => { loadPreview(); }, [moveTeachers]);

  const updateTeacher = (classId, field, value) => setTeacherOverrides((prev) => ({ ...prev, [classId]: { ...(prev[classId] || {}), [field]: value } }));

  const execute = async () => {
    setRunning(true); setError('');
    try {
      const res = await base44.functions.invoke('yearTransitionReset', { mode: 'execute', moveTeachers, teacherOverrides, confirmed, confirmationText: confirmText, previousSchoolYear, newSchoolYear });
      setDone(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'ביצוע האיפוס נכשל');
    }
    setRunning(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 text-right" dir="rtl">
      <PageHeader title="מעבר שנת לימודים ואיפוס נתונים" subtitle="שומר תלמידים, פרטי הורים, מידע רגיש והתאמות — ומוחק נתונים תפעוליים של השנה." actions={<Button variant="outline" onClick={loadPreview}>רענון תצוגה מקדימה</Button>} />
      {error && <Alert variant="destructive"><AlertTitle>שגיאה</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {done && <Alert><AlertTitle>הפעולה הושלמה</AlertTitle><AlertDescription>{done.updatedStudents} תלמידים עודכנו, {done.graduatedStudents} סומנו כבוגרים.</AlertDescription></Alert>}
      {loading ? <div className="h-20 flex items-center justify-center"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div> : preview && <>
        <Card><CardHeader><CardTitle>שנת לימודים</CardTitle></CardHeader><CardContent className="grid sm:grid-cols-2 gap-3"><Input value={previousSchoolYear} onChange={(e) => setPreviousSchoolYear(e.target.value)} placeholder="שנה שמסתיימת" /><Input value={newSchoolYear} onChange={(e) => setNewSchoolYear(e.target.value)} placeholder="שנה חדשה" /></CardContent></Card>
        <PreviewSummary totals={preview.totals} />
        {preview.hasBlockingMissingTargets && <Alert variant="destructive"><AlertTitle>חסרות כיתות יעד</AlertTitle><AlertDescription>יש ליצור את כיתות היעד לפני ביצוע המעבר.</AlertDescription></Alert>}
        <Card><CardHeader><CardTitle>מיפוי כיתות</CardTitle></CardHeader><CardContent><ClassMappingTable mappings={preview.classMappings} /></CardContent></Card>
        <Card><CardHeader><CardTitle>נתונים שיימחקו</CardTitle></CardHeader><CardContent><DeleteCountsTable counts={preview.deletionCounts} /></CardContent></Card>
        <Card><CardHeader><CardTitle>מחנכים</CardTitle></CardHeader><CardContent className="space-y-4"><label className="flex items-center gap-3 justify-start"><Switch checked={moveTeachers} onCheckedChange={setMoveTeachers} /><span>העלה מחנכים יחד עם הכיתות</span></label>{moveTeachers && <TeacherMappingTable mappings={preview.teacherMappings} overrides={teacherOverrides} onChange={updateTeacher} />}</CardContent></Card>
        <ConfirmResetCard checked={confirmed} text={confirmText} disabled={preview.hasBlockingMissingTargets} running={running} onCheckedChange={setConfirmed} onTextChange={setConfirmText} onExecute={execute} />
      </>}
    </div>
  );
}