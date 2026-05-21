import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { X, Edit, Check, AlertCircle, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const EXAM_TYPES = ['מבחן', 'בחינה', 'בגרות', 'עבודה', 'פרויקט', 'משימה', 'מוקד ב״ג', 'חזרה', 'חג', 'איחור שכבתי', 'אחר'];
const GRADES = ['י', 'יא', 'יב'];

export default function ImportExamsPreview({ events: initialEvents, classId, onConfirm, onCancel }) {
  const [events, setEvents] = useState(initialEvents.map((e, i) => ({ ...e, id: e.id || `temp_${i}` })));
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const startEdit = (event) => {
    setEditingId(event.id);
    setEditForm({ ...event });
  };

  const saveEdit = () => {
    if (!editForm.title?.trim()) {
      toast.error('חובה להזין שם אירוע');
      return;
    }
    if (!editForm.date) {
      toast.error('חובה להזין תאריך');
      return;
    }
    setEvents(events.map(e => e.id === editingId ? editForm : e));
    setEditingId(null);
  };

  const deleteEvent = (id) => {
    setEvents(events.filter(e => e.id !== id));
    toast.success('אירוע הוסר');
  };

  const handleConfirm = () => {
    if (events.length === 0) {
      toast.error('אין אירועים לייבוא');
      return;
    }
    onConfirm(events);
  };

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto" dir="rtl">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-2">
        <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {events.length} אירועים נמצאו. בדוק, ערוך או מחק לפני ההשמרה
        </p>
      </div>

      <div className="space-y-2">
        {events.map((event) => (
          <div
            key={event.id}
            className={cn(
              'p-3 rounded-lg border transition-all',
              editingId === event.id
                ? 'border-primary/50 bg-primary/5'
                : 'border-border bg-card hover:border-primary/30'
            )}
          >
            {editingId === event.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">תאריך</Label>
                    <Input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">שעה (לא חובה)</Label>
                    <Input
                      type="time"
                      value={editForm.time}
                      onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">שם אירוע</Label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    placeholder="לדוגמה: מבחן בשפה עברית"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">סוג אירוע</Label>
                    <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXAM_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">שכבה</Label>
                    <Select value={editForm.class_or_grade} onValueChange={(v) => setEditForm({ ...editForm, class_or_grade: v })}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="בחר" /></SelectTrigger>
                      <SelectContent>
                        {GRADES.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">הערות</Label>
                  <Input
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="הערות נוספות (לא חובה)"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    בטל
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveEdit}
                    className="gap-1"
                  >
                    <Check className="w-3 h-3" />
                    שמור עריכה
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-sm">{event.title}</p>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{event.type}</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>
                      📅 {event.date}
                      {event.time && ` · 🕐 ${event.time}`}
                      {event.class_or_grade && ` · 📚 ${event.class_or_grade}`}
                    </p>
                    {event.notes && <p>📝 {event.notes}</p>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => startEdit(event)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:text-destructive"
                    onClick={() => deleteEvent(event.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <Button onClick={handleConfirm} className="gap-1">
          <FileUp className="w-4 h-4" />
          ייבא {events.length} אירועים
        </Button>
      </div>
    </div>
  );
}