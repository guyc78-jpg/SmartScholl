import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { CheckCircle2, Pencil, Trash2, Save, X, Loader2, CalendarDays, User } from 'lucide-react';
import { toast } from 'sonner';

const PRIORITIES = ['נמוכה', 'בינונית', 'גבוהה', 'דחופה'];
const STATUSES = ['לביצוע', 'בטיפול', 'בוצע'];

const priorityStyle = {
  'נמוכה': 'bg-muted text-muted-foreground border-border',
  'בינונית': 'bg-primary/10 text-primary border-primary/20',
  'גבוהה': 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
  'דחופה': 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function OpenTasksDialog({ open, onOpenChange, tasks, onChanged }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteTask, setDeleteTask] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const startEdit = (task) => {
    setEditingId(task.id);
    setEditForm({
      title: task.title || '',
      due_date: task.due_date || '',
      priority: task.priority || 'בינונית',
      status: task.status || 'לביצוע',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const updateTask = async (taskId, data) => {
    setBusyId(taskId);
    await base44.entities.Task.update(taskId, data);
    toast.success('המשימה עודכנה');
    setBusyId(null);
    cancelEdit();
    onChanged?.();
  };

  const markDone = async (task) => {
    await updateTask(task.id, { status: 'בוצע' });
  };

  const saveEdit = async (taskId) => {
    await updateTask(taskId, editForm);
  };

  const confirmDelete = async () => {
    if (!deleteTask) return;
    setBusyId(deleteTask.id);
    await base44.entities.Task.delete(deleteTask.id);
    toast.success('המשימה נמחקה');
    setBusyId(null);
    setDeleteTask(null);
    onChanged?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent dir="rtl" className="w-[calc(100vw-1rem)] max-w-3xl max-h-[88vh] overflow-hidden p-0 text-right">
          <DialogHeader className="px-4 pt-5 pb-3 border-b text-right">
            <DialogTitle className="text-right">משימות פתוחות לטיפול</DialogTitle>
            <DialogDescription className="text-right">
              כל המשימות שעדיין לא סומנו כבוצעו, כולל עדיפות, תאריך ופעולות טיפול.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-3 sm:px-4 py-3 space-y-2" style={{ maxHeight: 'calc(88vh - 120px)' }} dir="rtl">
            {tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                אין משימות פתוחות לטיפול.
              </div>
            ) : tasks.map(task => {
              const editing = editingId === task.id;
              const busy = busyId === task.id;
              return (
                <div key={task.id} className="rounded-xl border bg-card p-3 sm:p-4 text-right" dir="rtl">
                  {editing ? (
                    <div className="space-y-3">
                      <Input
                        value={editForm.title}
                        onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="שם המשימה"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input
                          type="date"
                          value={editForm.due_date}
                          onChange={e => setEditForm(p => ({ ...p, due_date: e.target.value }))}
                        />
                        <select
                          value={editForm.priority}
                          onChange={e => setEditForm(p => ({ ...p, priority: e.target.value }))}
                          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-right"
                        >
                          {PRIORITIES.map(priority => <option key={priority} value={priority}>{priority}</option>)}
                        </select>
                        <select
                          value={editForm.status}
                          onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-right"
                        >
                          {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => saveEdit(task.id)} disabled={busy}>
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          שמור
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit} disabled={busy}>
                          <X className="w-4 h-4" />
                          ביטול
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 text-right">
                          <h3 className="font-semibold text-sm sm:text-base leading-tight truncate">{task.title}</h3>
                          <div className="flex flex-wrap items-center justify-end gap-2 mt-2 text-xs text-muted-foreground">
                            {task.student_name && (
                              <span className="inline-flex items-center gap-1">
                                <User className="w-3.5 h-3.5" />
                                {task.student_name}
                              </span>
                            )}
                            {task.due_date && (
                              <span className="inline-flex items-center gap-1 force-ltr">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {task.due_date}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge variant="outline" className={priorityStyle[task.priority] || priorityStyle['בינונית']}>
                            {task.priority || 'בינונית'}
                          </Badge>
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                            {task.status || 'לביצוע'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" onClick={() => markDone(task)} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          סמן כבוצע
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(task)} disabled={busy}>
                          <Pencil className="w-4 h-4" />
                          ערוך
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleteTask(task)} disabled={busy} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                          מחק
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTask} onOpenChange={(isOpen) => !isOpen && setDeleteTask(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">למחוק את המשימה?</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              הפעולה תמחק את המשימה “{deleteTask?.title}” ולא ניתן יהיה לשחזר אותה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}