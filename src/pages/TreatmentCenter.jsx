import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Search, Clock, CheckCircle2, AlertCircle, Archive, User, Calendar, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatStudentName } from '@/lib/studentName';
import { formatSchoolDate, getLocalDateString } from '@/lib/dateUtils';

const EVENT_TYPES = {
  discipline: { label: 'משמעת', color: 'text-red-600' },
  attendance: { label: 'נוכחות', color: 'text-orange-600' },
  performance: { label: 'הצילוח', color: 'text-blue-600' },
  communication: { label: 'תקשורת', color: 'text-green-600' },
  community_service: { label: 'מעורבות חברתית', color: 'text-purple-600' },
  other: { label: 'אחר', color: 'text-gray-600' },
};

const STATUS_CONFIG = {
  'פתוח': { icon: AlertCircle, color: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20', badge: 'outline' },
  'בטיפול': { icon: Clock, color: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20', badge: 'secondary' },
  'ממתין_להורה': { icon: User, color: 'bg-purple-50 border-purple-200 dark:bg-purple-950/20', badge: 'outline' },
  'ממתין_לתלמיד': { icon: AlertCircle, color: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20', badge: 'outline' },
  'טופל': { icon: CheckCircle2, color: 'bg-green-50 border-green-200 dark:bg-green-950/20', badge: 'default' },
  'נסגר': { icon: Archive, color: 'bg-gray-50 border-gray-200 dark:bg-gray-950/20', badge: 'secondary' },
};

export default function TreatmentCenter({ user }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('הכל');
  const [filterRole, setFilterRole] = useState('הכל');
  const [editingCase, setEditingCase] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    setLoading(true);
    try {
      const data = await base44.entities.TreatmentCase.list('-created_date', 1000);
      setCases(data.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()));
    } catch (e) {
      console.error(e);
      toast.error('שגיאה בטעינת הנתונים');
    }
    setLoading(false);
  }

  async function updateCaseStatus(caseId, newStatus) {
    try {
      await base44.entities.TreatmentCase.update(caseId, { status: newStatus });
      setCases(cases.map(c => c.id === caseId ? { ...c, status: newStatus } : c));
      toast.success('סטטוס עודכן');
    } catch (e) {
      console.error(e);
      toast.error('שגיאה בעדכון');
    }
  }

  async function addNote() {
    if (!newNote.trim() || !editingCase) return;
    try {
      const updatedNotes = [
        ...(editingCase.notes || []),
        {
          author_email: user?.email,
          author_name: user?.full_name,
          content: newNote,
          timestamp: new Date().toISOString(),
        },
      ];
      await base44.entities.TreatmentCase.update(editingCase.id, { notes: updatedNotes });
      setEditingCase({ ...editingCase, notes: updatedNotes });
      setCases(cases.map(c => c.id === editingCase.id ? { ...c, notes: updatedNotes } : c));
      setNewNote('');
      toast.success('הערה נוספה');
    } catch (e) {
      console.error(e);
      toast.error('שגיאה בהוספת הערה');
    }
  }

  const filtered = cases.filter(c => {
    const matchSearch = String(c.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                       String(c.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'הכל' || c.status === filterStatus;
    const matchRole = filterRole === 'הכל' || c.responsible_role === filterRole;
    return matchSearch && matchStatus && matchRole;
  });

  const openCount = filtered.filter(c => c.status === 'פתוח').length;
  const inProgressCount = filtered.filter(c => c.status === 'בטיפול').length;
  const closedCount = filtered.filter(c => c.status === 'נסגר').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6" dir="rtl">
      <PageHeader
        title="מרכז טיפול ומשימות"
        subtitle="ניהול מרכזי של כל אירוע ומשימה עם סטטוסים וניתוח"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">פתוחים</p>
          <p className="text-2xl font-bold text-amber-600">{openCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">בטיפול</p>
          <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">נסגרים</p>
          <p className="text-2xl font-bold text-green-600">{closedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="חיפוש תלמיד או כותרת..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-3 pr-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            סטטוס
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="הכל">כל הסטטוסים</SelectItem>
            <SelectItem value="פתוח">פתוח</SelectItem>
            <SelectItem value="בטיפול">בטיפול</SelectItem>
            <SelectItem value="ממתין_להורה">ממתין להורה</SelectItem>
            <SelectItem value="ממתין_לתלמיד">ממתין לתלמיד</SelectItem>
            <SelectItem value="טופל">טופל</SelectItem>
            <SelectItem value="נסגר">נסגר</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40">
            אחראי
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="הכל">כל התפקידים</SelectItem>
            <SelectItem value="homeroom_teacher">מחנך</SelectItem>
            <SelectItem value="coordinator">רכז</SelectItem>
            <SelectItem value="admin">מנהל</SelectItem>
            <SelectItem value="parent">הורה</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cases List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground">אין טיפולים התואמים לסינון</p>
          </div>
        ) : (
          filtered.map(treatmentCase => {
            const config = STATUS_CONFIG[treatmentCase.status] || STATUS_CONFIG['פתוח'];
            const Icon = config.icon;
            const eventType = EVENT_TYPES[treatmentCase.event_type] || EVENT_TYPES.other;
            const today = getLocalDateString();
            const isOverdue = treatmentCase.due_date && treatmentCase.due_date < today && treatmentCase.status !== 'נסגר';

            return (
              <div
                key={treatmentCase.id}
                role="button"
                tabIndex={0}
                aria-label={`פתיחת תיק טיפול: ${treatmentCase.title || treatmentCase.student_name || 'ללא כותרת'}`}
                className={cn(
                  'rounded-xl border p-3.5 transition-all cursor-pointer hover:shadow-sm',
                  config.color
                )}
                onClick={() => {
                  setEditingCase(treatmentCase);
                  setShowDialog(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setEditingCase(treatmentCase);
                    setShowDialog(true);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-foreground/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{formatStudentName(treatmentCase.student_name)}</p>
                        <p className="text-xs text-muted-foreground">{treatmentCase.title}</p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1.5">
                        <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full', eventType.color, 'bg-opacity-10')}>
                          {eventType.label}
                        </span>
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-foreground/5 border')}>
                          {treatmentCase.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {treatmentCase.responsible_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {treatmentCase.responsible_name}
                        </span>
                      )}
                      {treatmentCase.due_date && (
                        <span className={cn('flex items-center gap-1', isOverdue && 'text-red-600 font-semibold')}>
                          <Calendar className="w-3 h-3" /> {formatSchoolDate(treatmentCase.due_date)}
                          {isOverdue && ' ⚠️'}
                        </span>
                      )}
                      {treatmentCase.notes?.length > 0 && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <FileText className="w-3 h-3" /> {treatmentCase.notes.length} הערות
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Dialog */}
      {editingCase && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{formatStudentName(editingCase.student_name)} - {editingCase.title}</DialogTitle>
              <DialogDescription>{EVENT_TYPES[editingCase.event_type].label}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Status Change */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">סטטוס</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <button
                      key={status}
                      onClick={() => updateCaseStatus(editingCase.id, status)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-all border',
                        editingCase.status === status
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 text-foreground border-border hover:bg-muted'
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">אחראי</p>
                  <p className="font-semibold">{editingCase.responsible_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">תאריך יעד</p>
                  <p className="font-semibold">{formatSchoolDate(editingCase.due_date) || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">עדיפות</p>
                  <p className="font-semibold">{editingCase.priority}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ההודעה להורה</p>
                  <p className="font-semibold">{editingCase.parent_notification_sent ? '✓ נשלחה' : '✗ לא נשלחה'}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">תיאור</p>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{editingCase.description || '-'}</p>
              </div>

              {/* Notes */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">הערות</p>
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {editingCase.notes?.map((note, i) => (
                    <div key={i} className="bg-muted/50 rounded-lg p-2">
                      <p className="text-xs font-semibold text-foreground">{note.author_name}</p>
                      <p className="text-xs text-muted-foreground mb-1">{formatSchoolDate(note.timestamp, { dateStyle: 'short', timeStyle: 'short' })}</p>
                      <p className="text-sm text-foreground">{note.content}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="הוסף הערה..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addNote()}
                    className="flex-1"
                  />
                  <Button onClick={addNote} variant="outline" size="sm">הוסף</Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>סגור</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
