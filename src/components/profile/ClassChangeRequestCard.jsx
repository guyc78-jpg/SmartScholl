import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, School } from 'lucide-react';
import { toast } from 'sonner';
import GradeClassSelect from '@/components/profile/GradeClassSelect';
import { extractGradeFromClass, formatGrade } from '@/lib/schoolStructure';

export default function ClassChangeRequestCard({ user, displayName }) {
  const currentClass = user?.profile_class || user?.profile_homeroom_class || '';
  const currentClassId = user?.profile_class_id || '';
  const currentGrade = user?.profile_grade_managed || extractGradeFromClass(currentClass) || '';
  const [request, setRequest] = useState({ grade: '', className: '', classId: '', reason: '' });
  const [sending, setSending] = useState(false);

  const submitRequest = async () => {
    if (!request.grade || !request.classId || !request.reason.trim()) {
      toast.error('יש לבחור שכבה, כיתה ולכתוב סיבת בקשה');
      return;
    }

    setSending(true);
    await base44.functions.invoke('handleApprovalRequest', {
      action: 'submit_class_change',
      full_name: displayName,
      current_class_id: currentClassId,
      current_grade: currentGrade,
      current_class: currentClass,
      requested_class_id: request.classId,
      requested_grade: request.grade,
      requested_class: request.className,
      request_reason: request.reason.trim(),
    });
    toast.success('בקשת שינוי הכיתה נשלחה לאישור');
    setRequest({ grade: '', className: '', classId: '', reason: '' });
    setSending(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <School className="w-5 h-5 text-primary" />
          בקשת שינוי כיתה
        </CardTitle>
        <CardDescription>
          לא ניתן לשנות שכבה או כיתה ישירות. השינוי יתבצע רק לאחר אישור מנהל/ת מערכת, מחנך/ת או רכז/ת שכבה.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground mb-1">הכיתה הנוכחית שלך</p>
          <p className="text-xl font-bold text-primary">
            {currentClass || 'לא הוגדרה כיתה'}
            {currentGrade && <span className="text-sm font-medium text-muted-foreground mr-2">שכבה {formatGrade(currentGrade)}</span>}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GradeClassSelect
            grade={request.grade}
            classNameValue={request.className}
            classId={request.classId}
            onGradeChange={(value) => setRequest(prev => ({ ...prev, grade: value, className: '', classId: '' }))}
            onClassChange={(value) => setRequest(prev => ({ ...prev, className: value }))}
            onClassIdChange={(value) => setRequest(prev => ({ ...prev, classId: value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>סיבת הבקשה</Label>
          <Textarea
            value={request.reason}
            onChange={(event) => setRequest(prev => ({ ...prev, reason: event.target.value }))}
            placeholder="כתבו בקצרה מדוע נדרש שינוי כיתה..."
            className="min-h-24"
          />
        </div>

        <Button type="button" variant="outline" onClick={submitRequest} disabled={sending} className="w-full sm:w-auto">
          <Send className="w-4 h-4" />
          {sending ? 'שולח...' : 'שלח בקשת שינוי כיתה'}
        </Button>
      </CardContent>
    </Card>
  );
}