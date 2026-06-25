import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Flag, Plus, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import UrgentFlagItem from './UrgentFlagItem';
import UrgentFlagDialog from './UrgentFlagDialog';
import { isDashboardRelevant, sortFlags } from './urgentFlagUtils';
import useDeleteConfirm from '@/hooks/useDeleteConfirm';

/**
 * Dashboard section — shows only urgent / pinned / soon-due flags.
 * Visible to homeroom_teacher / coordinator / admin only.
 * Provides quick add + manage actions.
 */
export default function UrgentFlagsSection({ classId, user, canManage, maxItems = 3, onChanged }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const { confirmDelete, DeleteConfirm } = useDeleteConfirm();

  async function load() {
    setLoading(true);
    // ניסיון חוזר עם השהיה גוברת — מונע קריסה כשמגבלת הקצב נחצית בעומס הדשבורד
    let data = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        data = await base44.entities.UrgentFlag.filter({ class_id: classId });
        break;
      } catch (err) {
        const isRateLimit = /rate limit/i.test(err?.message || '');
        if (!isRateLimit || attempt === 2) {
          console.error('UrgentFlags load error:', err);
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1200 * (attempt + 1)));
      }
    }
    setFlags(sortFlags(data || []));
    setLoading(false);
  }

  useEffect(() => { if (classId) load(); }, [classId]);

  const relevant = flags.filter(isDashboardRelevant);
  const visible = showAll ? relevant : relevant.slice(0, maxItems);
  const hiddenCount = relevant.length - visible.length;

  async function handleTogglePin(flag) {
    await base44.entities.UrgentFlag.update(flag.id, { is_pinned: !flag.is_pinned });
    toast.success(flag.is_pinned ? 'ההצמדה בוטלה' : 'הדגש הוצמד');
    load(); onChanged?.();
  }

  async function handleToggleStatus(flag) {
    const next = flag.status === 'טופל' ? 'פתוח' : 'טופל';
    await base44.entities.UrgentFlag.update(flag.id, {
      status: next,
      resolved_at: next === 'טופל' ? new Date().toISOString() : '',
    });
    toast.success(next === 'טופל' ? 'הדגש סומן כטופל' : 'הדגש הוחזר לפתוח');
    load(); onChanged?.();
  }

  async function handleDelete(flag) {
    const approved = await confirmDelete({
      title: `למחוק את הדגש "${flag.title}"?`,
      description: 'הדגש יימחק מרשימת הטיפול המיידי ולא ניתן יהיה לשחזר אותו.',
    });
    if (!approved) return;
    await base44.entities.UrgentFlag.delete(flag.id);
    toast.success('הדגש נמחק');
    load(); onChanged?.();
  }

  function handleEdit(flag) {
    setEditing(flag);
    setDialogOpen(true);
  }

  function handleAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 lg:p-5" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/15">
            <Flag className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground leading-tight">לטיפול מיידי</h2>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {relevant.length > 0 ? `${relevant.length} דגשים פעילים בכיתה` : 'אין דגשים דחופים כרגע'}
            </p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={handleAdd}
            className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/15 text-primary transition-colors flex items-center justify-center shadow-sm"
            title="דגש חדש"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : relevant.length === 0 ? null : (
        <>
          <div className="space-y-2">
            {visible.map(flag => (
              <UrgentFlagItem
                key={flag.id}
                flag={flag}
                canManage={canManage}
                onEdit={handleEdit}
                onTogglePin={handleTogglePin}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
              />
            ))}
          </div>
          {relevant.length > maxItems && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="mt-3 w-full text-xs font-medium text-primary hover:underline flex items-center justify-center gap-1"
            >
              {showAll ? 'הצג פחות' : 'הצג הכל'} <ChevronLeft className={`w-3 h-3 transition-transform ${showAll ? 'rotate-90' : ''}`} />
            </button>
          )}
        </>
      )}

      {canManage && (
        <UrgentFlagDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          classId={classId}
          flag={editing}
          user={user}
          onSaved={() => { load(); onChanged?.(); }}
        />
      )}
      <DeleteConfirm />
    </section>
  );
}