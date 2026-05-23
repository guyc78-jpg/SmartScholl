import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { ShieldCheck } from 'lucide-react';
import UserPermissionEditor from '@/components/profile/UserPermissionEditor';
import ApprovedStaffManager from '@/components/staff/ApprovedStaffManager';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('handleApprovalRequest', { action: 'list_users' });
    setUsers(res.data.users || []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  if (loading) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4" dir="rtl">
      <PageHeader
        title="ניהול משתמשים והרשאות"
        subtitle="הפרדה בין הרשאת מערכת, תפקידים מאושרים ושיוך חינוכי לכיתה או שכבה"
        actions={<ShieldCheck className="w-6 h-6 text-primary" />}
      />
      <ApprovedStaffManager />

      <div className="space-y-3">
        <h2 className="text-xl font-bold">משתמשים קיימים</h2>
        {users.map(user => <UserPermissionEditor key={user.id} targetUser={user} onSaved={loadUsers} />)}
      </div>
    </div>
  );
}