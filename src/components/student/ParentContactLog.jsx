import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Phone, MessageCircle, Plus, Trash2, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatStudentName } from '@/lib/studentName';
import useDeleteConfirm from '@/hooks/useDeleteConfirm';
import { formatSchoolDate, getLocalDateString, getSchoolTimeString } from '@/lib/dateUtils';

const CONTACT_TYPES = ['טלפון', 'פנים אל פנים', 'הודעה כתובה', 'WhatsApp', 'דוא״ל'];
const PARENT_OPTIONS = ['הורה 1', 'הורה 2', 'שני הורים'];

export default function ParentContactLog({ studentId, classId, studentName, parentPhone1, parentPhone2, user }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const { confirmDelete, DeleteConfirm } = useDeleteConfirm();
  const [formData, setFormData] = useState({
    date: getLocalDateString(),
    time: getSchoolTimeString(),
    subject: '',
    summary: '',
    contact_type: 'טלפון',
    contacted_parent: 'הורה 1',
    follow_up_needed: false,
    follow_up_date: '',
    parent_phone: parentPhone1 || '',
    notes: '',
  });

  useEffect(() => {
    loadContacts();
  }, [studentId]);

  async function loadContacts() {
    setLoading(true);
    const data = await base44.entities.ParentContact.filter({ student_id: studentId });
    setContacts(data.sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))));
    setLoading(false);
  }

  async function handleSave() {
    if (!formData.subject || !formData.summary) {
      toast.error('מלא את כל השדות החובה');
      return;
    }

    const payload = {
      student_id: studentId,
      student_name: studentName,
      class_id: classId,
      initiated_by: user.full_name,
      ...formData,
    };

    if (editingId) {
      await base44.entities.ParentContact.update(editingId, payload);
      toast.success('הקשר עודכן');
    } else {
      await base44.entities.ParentContact.create(payload);
      toast.success('הקשר נוסף ליומן');
    }
    setShowDialog(false);
    loadContacts();
    resetForm();
  }

  async function handleDelete(id) {
    const approved = await confirmDelete({
      title: 'למחוק את קשר ההורים?',
      description: 'הרישום יימחק מיומן קשר ההורים ולא ניתן יהיה לשחזר אותו.',
    });
    if (!approved) return;
    await base44.entities.ParentContact.delete(id);
    toast.success('הקשר נמחק');
    loadContacts();
  }

  function resetForm() {
    setFormData({
      date: getLocalDateString(),
      time: getSchoolTimeString(),
      subject: '',
      summary: '',
      contact_type: 'טלפון',
      contacted_parent: 'הורה 1',
      follow_up_needed: false,
      follow_up_date: '',
      parent_phone: parentPhone1 || '',
      notes: '',
    });
    setEditingId(null);
  }

  function handleEdit(contact) {
    setFormData(contact);
    setEditingId(contact.id);
    setShowDialog(true);
  }

  function generateWhatsAppMessage() {
    const msg = `שלום, קצר הודעה בנוגע ל${formatStudentName(studentName)}: ${formData.subject}. ${formData.summary.substring(0, 100)}...`;
    const encoded = encodeURIComponent(msg);
    const phone = formData.parent_phone?.replace(/\D/g, '');
    if (!phone) {
      toast.error('אנא הזן מספר טלפון להורה');
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank', 'noopener,noreferrer');
  }

  if (loading) return <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">טוען...</div>;

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">יומן קשר הורים</h3>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
          className="h-8 gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> קשר חדש
        </Button>
      </div>

      {/* Contact List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {contacts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">אין קשרים רשומים עדיין</p>
        ) : (
          contacts.map(contact => (
            <div key={contact.id} className="p-3 bg-muted/50 rounded-lg border border-border/50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{contact.subject}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {formatSchoolDate(contact.date)} ב{contact.time}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-xs"
                    onClick={() => handleEdit(contact)}
                  >
                    ✎
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(contact.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-foreground/75">{contact.summary}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                <span className="px-2 py-0.5 bg-background rounded">{contact.contact_type}</span>
                <span className="px-2 py-0.5 bg-background rounded">{contact.contacted_parent}</span>
                {contact.follow_up_needed && (
                  <span className="flex items-center gap-0.5 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded">
                    <AlertCircle className="w-3 h-3" /> בעקבה
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'עדכן קשר' : 'קשר חדש עם הורה'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium">תאריך</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium">שעה</label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium">נושא</label>
              <Input
                placeholder="לדוגמה: בדיקת התקדמות בלימודים"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium">סיכום השיחה</label>
              <Textarea
                placeholder="כתוב סיכום קצר של השיחה"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                className="text-xs mt-1 h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium">סוג קשר</label>
                <Select value={formData.contact_type} onValueChange={(v) => setFormData({ ...formData, contact_type: v })}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <span>{formData.contact_type}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">איזה הורה</label>
                <Select value={formData.contacted_parent} onValueChange={(v) => setFormData({ ...formData, contacted_parent: v })}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <span>{formData.contacted_parent}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {PARENT_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium">מספר טלפון להורה (ל-WhatsApp)</label>
              <Input
                type="tel"
                placeholder="+972..."
                value={formData.parent_phone}
                onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                className="h-8 text-xs mt-1 force-ltr"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.follow_up_needed}
                onChange={(e) => setFormData({ ...formData, follow_up_needed: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-xs">נדרש משך טיפול</span>
            </label>

            {formData.follow_up_needed && (
              <div>
                <label className="text-xs font-medium">תאריך המשך</label>
                <Input
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium">הערות נוספות</label>
              <Textarea
                placeholder="הערות פרטיות..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="text-xs mt-1 h-16"
              />
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowDialog(false)}>ביטול</Button>
            {!editingId && (
              <Button
                size="sm"
                variant="outline"
                onClick={generateWhatsAppMessage}
                className="gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </Button>
            )}
            <Button size="sm" onClick={handleSave}>{editingId ? 'עדכן' : 'שמור'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteConfirm />
    </div>
  );
}
