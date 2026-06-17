import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flag, Plus } from 'lucide-react';
import { toast } from 'sonner';
import UrgentFlagItem from './UrgentFlagItem';
import UrgentFlagDialog from './UrgentFlagDialog';
import { sortFlags, STATUSES } from './urgentFlagUtils';
import useDeleteConfirm from '@/hooks/useDeleteConfirm';

/**
 * Full urgent-flags list — used in the class card / class dashboard.
 * Includes status filter and full management.
 */
export default function UrgentFlagsList({ classId, user, canManage }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('פתוח');
  const { confirmDelete, DeleteConfirm } = useDeleteConfirm();

  async function load() {
    setLoading(true);
    const data = await base44.entities.UrgentFlag.filter({ class_id: classId });
    setFlags(sortFlags(data || []));
    setLoading(false);
  }

  useEffect(() => { if (classId) load(); }, [classId]);

  const filtered = filter === 'all'
    ? flags
    : filter === 'active'
      ? flags.filter(f => f.status !== 'טופל')
      : flags.filter(f => f.status === filter);

  async function handleTogglePin(flag) {
    await base44.entities.UrgentFlag.update(flag.id, { is_pinned: !flag.is_pinned });
    toast.success(flag.is_pinned ? 'ההצמדה בוטלה' : 'הדגש הוצמד');
    load();
  }

  async function handleToggleStatus(flag) {
    const next = flag.status === 'טופל' ? 'פתוח' : 'טופל';
    await base44.entities.UrgentFlag.update(flag.id, {
      status: next,
      resolved_at: next === 'טופל' ? new Date().toISOString() : '',
    });
    toast.success(next === 'טופל' ? 'הדגש סומן כטופל' : 'הדגש הוחזר לפתוח');
    load();
  }

  async function handleDelete(flag) {
    const approved = await confirmDelete({
      title: `למחוק את הדגש "${flag.title}"?`,
      description: 'הדגש יימחק מרשימת הטיפול המיידי ולא ניתן יהיה לשחזר אותו.',
    });
    if (!approved) return;
    await base44.entities.UrgentFlag.delete(flag.id);
    toast.success('הדגש נמחק');
    load();
  }

  const filterChips = [
    { key: 'active', label: 'פעילים' },
    ...STATUSES.map(s => ({ key: s, label: s })),
    { key: 'all', label: 'הכל' },
  ];

  return (
    <Card dir="rtl">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Flag className="w-4 h-4 text-primary" />
          לטיפול מיידי
        </CardTitle>
        {canManage && (
          <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }} className="h-8 gap-1">
            <Plus className="w-4 h-4" /> דגש חדש
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {filterChips.map(chip => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={`text-[11.5px] font-medium px-2.5 py-1 rounded-full ring-1 transition-colors ${
                filter === chip.key
                  ? 'bg-primary text-primary-foreground ring-primary'
                  : 'bg-muted/60 text-muted-foreground ring-border hover:bg-muted'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">אין דגשים להצגה.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(flag => (
              <UrgentFlagItem
                key={flag.id}
                flag={flag}
                canManage={canManage}
                onEdit={(f) => { setEditing(f); setDialogOpen(true); }}
                onTogglePin={handleTogglePin}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {canManage && (
          <UrgentFlagDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            classId={classId}
            flag={editing}
            user={user}
            onSaved={load}
          />
        )}
        <DeleteConfirm />
      </CardContent>
    </Card>
  );
}