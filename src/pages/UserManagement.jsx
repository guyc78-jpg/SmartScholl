import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import EmptyState from '@/components/ui/EmptyState';
import { ShieldCheck, Users, X, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { getAvailableRoles, getUserDisplayName } from '@/lib/roleUtils';
import { normalizeGrade } from '@/lib/schoolStructure';
import UserFiltersBar from '@/components/users/UserFiltersBar';
import UserRow from '@/components/users/UserRow';
import UserEditSheet from '@/components/users/UserEditSheet';
import BulkEditSheet from '@/components/users/BulkEditSheet';

export default function UserManagement() {
  const { user: currentUser, updateCurrentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editTarget, setEditTarget] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    const [usersRes, classesRes] = await Promise.all([
      base44.functions.invoke('handleApprovalRequest', { action: 'list_users' }),
      base44.entities.ClassRoom.list('grade', 500),
    ]);
    setUsers(usersRes.data.users || []);
    setClasses((classesRes || []).filter(c => c.is_active !== false));
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const classOptions = useMemo(() => {
    const gradeOrder = ['ז', 'ח', 'ט', 'י', 'יא', 'יב'];
    const extractNum = (name = '') => {
      const m = String(name).match(/(\d+)\s*$/);
      return m ? parseInt(m[1], 10) : 9999;
    };
    const list = gradeFilter === 'all' ? classes : classes.filter(c => normalizeGrade(c.grade) === gradeFilter);
    return [...list].sort((a, b) => {
      const gd = gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade);
      return gd !== 0 ? gd : extractNum(a.name) - extractNum(b.name);
    });
  }, [classes, gradeFilter]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter(u => {
      if (term) {
        const haystack = `${getUserDisplayName(u)} ${u.email || ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (roleFilter !== 'all') {
        if (!getAvailableRoles(u).includes(roleFilter)) return false;
      }
      if (gradeFilter !== 'all') {
        if (normalizeGrade(u.profile_grade_managed || '') !== gradeFilter) return false;
      }
      if (classFilter !== 'all') {
        const cls = classes.find(c => c.id === classFilter);
        if (!cls) return false;
        const matchesId = u.profile_class_id === classFilter;
        const matchesName = (u.profile_homeroom_class || u.profile_class) === cls.name;
        if (!matchesId && !matchesName) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, gradeFilter, classFilter, classes]);

  const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));
  const someSelected = filteredUsers.some(u => selectedIds.has(u.id)) && !allSelected;

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allSelected) filteredUsers.forEach(u => next.delete(u.id));
    else filteredUsers.forEach(u => next.add(u.id));
    setSelectedIds(next);
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleSaved = (updatedUser, isSelf) => {
    if (isSelf && updatedUser) updateCurrentUser(updatedUser);
    clearSelection();
    loadUsers();
  };

  const selectedUsers = users.filter(u => selectedIds.has(u.id));
  const selectedDeletable = selectedUsers.filter(u => u.id !== currentUser?.id);

  const runBulkDelete = async () => {
    setBulkDeleting(true);
    let failed = 0;
    for (let i = 0; i < selectedDeletable.length; i++) {
      const u = selectedDeletable[i];
      try {
        await base44.functions.invoke('handleApprovalRequest', {
          action: 'delete_user',
          target_user_id: u.id,
          target_email: u.email,
        });
      } catch (err) {
        failed += 1;
      }
      if (i < selectedDeletable.length - 1) await new Promise(r => setTimeout(r, 250));
    }
    if (failed) toast.error(`נמחקו ${selectedDeletable.length - failed}, נכשלו ${failed}`);
    else toast.success(`נמחקו ${selectedDeletable.length} משתמשים`);
    setBulkDeleting(false);
    setConfirmBulkDelete(false);
    clearSelection();
    loadUsers();
  };

  if (loading) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4" dir="rtl">
      <PageHeader
        title="ניהול משתמשים והרשאות"
        subtitle={`${users.length} משתמשים במערכת · חיפוש, סינון ועריכה מהירה`}
        actions={<ShieldCheck className="w-6 h-6 text-primary" />}
      />

      <UserFiltersBar
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleChange={setRoleFilter}
        gradeFilter={gradeFilter}
        onGradeChange={(v) => { setGradeFilter(v); setClassFilter('all'); }}
        classFilter={classFilter}
        onClassChange={setClassFilter}
        classOptions={classOptions}
      />

      {/* Bulk action bar */}
      <div className="bg-primary/10 border border-primary/30 rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-primary">
          {selectedIds.size > 0 ? `${selectedIds.size} נבחרו` : `${filteredUsers.length} משתמשים מוצגים`}
        </span>
        <div className="flex gap-2 mr-auto flex-wrap">
          <Button size="sm" variant="outline" onClick={toggleSelectAll} disabled={filteredUsers.length === 0}>
            {allSelected ? 'בטל בחירה' : `בחר הכל (${filteredUsers.length})`}
          </Button>
          {selectedIds.size > 0 && (
            <>
              <Button size="sm" onClick={() => setBulkOpen(true)}>עדכון מרובה</Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive gap-1"
                onClick={() => setConfirmBulkDelete(true)}
                disabled={selectedDeletable.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                מחק ({selectedDeletable.length})
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection} className="gap-1"><X className="w-4 h-4" />נקה</Button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[auto_2fr_2fr_1fr_1fr_2fr_auto] items-center gap-3 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleSelectAll}
            aria-label="בחר הכל"
            data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
          />
          <div>שם</div>
          <div>מייל</div>
          <div>תפקיד ראשי</div>
          <div>שכבה</div>
          <div>כיתה</div>
          <div>תפקידים נוספים</div>
          <div className="sr-only">פעולות</div>
        </div>
        {/* Mobile header (select all only) */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
          <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="בחר הכל" />
          <span className="text-xs text-muted-foreground">בחר/י הכל ({filteredUsers.length})</span>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Users} title="לא נמצאו משתמשים" description="נסה לשנות את החיפוש או הסינון" />
          </div>
        ) : (
          <div>
            {filteredUsers.map(u => (
              <UserRow
                key={u.id}
                user={u}
                selected={selectedIds.has(u.id)}
                onSelectToggle={() => toggleSelect(u.id)}
                onEdit={() => setEditTarget(u)}
              />
            ))}
          </div>
        )}
      </div>

      <UserEditSheet
        targetUser={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        onSaved={handleSaved}
        onDeleted={() => { clearSelection(); loadUsers(); }}
        currentUserId={currentUser?.id}
      />

      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק {selectedDeletable.length} משתמשים?</AlertDialogTitle>
            <AlertDialogDescription>
              הפעולה תמחק לצמיתות את כל המשתמשים שנבחרו (למעט המשתמש הנוכחי). לא ניתן לבטל.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={bulkDeleting}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); runBulkDelete(); }}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? 'מוחק...' : 'מחק'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkEditSheet
        users={selectedUsers}
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onSaved={(updatedSelf) => handleSaved(updatedSelf, !!updatedSelf)}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}