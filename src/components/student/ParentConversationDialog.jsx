import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { formatStudentName } from '@/lib/studentName';
import { formatSchoolDate, getLocalDateString } from '@/lib/dateUtils';

const conversationTypes = ['שיחה טלפונית', 'פגישה', 'מייל', 'הודעה', 'שיחת זום'];

const formatDate = (value) => {
  return formatSchoolDate(value, { day: '2-digit', month: '2-digit', year: 'numeric' }) || '—';
};

export default function ParentConversationDialog({ open, onOpenChange, student }) {
  const today = getLocalDateString();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: today, type: 'שיחה טלפונית', summary: '' });

  useEffect(() => {
    if (!open || !student?.id) return;
    setForm({ date: today, type: 'שיחה טלפונית', summary: '' });
    loadHistory();
  }, [open, student?.id]);

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  async function loadHistory() {
    setLoading(true);
    const rows = await base44.entities.Communication.filter({ student_id: student.id }, '-date', 50);
    setHistory((rows || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    setLoading(false);
  }

  async function saveConversation() {
    if (!form.summary.trim()) {
      toast.error('יש למלא סיכום שיחה');
      return;
    }

    setSaving(true);
    await base44.entities.Communication.create({
      student_id: student.id,
      student_name: formatStudentName(student),
      class_id: student.class_id,
      date: form.date,
      type: form.type,
      with_whom: 'הורה 1',
      summary: form.summary.trim()
    });
    toast.success('שיחת ההורה נוספה');
    setForm({ date: today, type: 'שיחה טלפונית', summary: '' });
    await loadHistory();
    setSaving(false);
  }

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto text-right" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">שיחות הורה – {formatStudentName(student)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4" dir="rtl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 text-right">
              <Label>תאריך</Label>
              <Input type="date" value={form.date} onChange={e => setField('date', e.target.value)} />
            </div>
            <div className="space-y-1 text-right">
              <Label>סוג השיחה</Label>
              <Select value={form.type} onValueChange={value => setField('type', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{conversationTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1 text-right">
            <Label>סיכום שיחה *</Label>
            <Textarea
              value={form.summary}
              onChange={e => setField('summary', e.target.value)}
              rows={4}
              placeholder="כתוב כאן את עיקרי השיחה..."
              className="text-right"
            />
          </div>

          <div className="flex justify-start">
            <Button onClick={saveConversation} disabled={saving} className="gap-2">
              <MessageSquare className="w-4 h-4" />
              {saving ? 'שומר...' : 'שמור שיחה'}
            </Button>
          </div>

          <div className="border-t pt-4 space-y-2 text-right">
            <h3 className="text-sm font-semibold">היסטוריית שיחות</h3>
            {loading ? (
              <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">אין שיחות מתועדות לתלמיד/ה</p>
            ) : (
              <div className="space-y-2">
                {history.map(item => (
                  <div key={item.id} className="rounded-xl bg-muted/50 p-3 text-right" dir="rtl">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium">{item.type}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(item.date)}</span>
                    </div>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{item.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
