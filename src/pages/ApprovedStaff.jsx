import PageHeader from '@/components/ui/PageHeader';
import ApprovedStaffManager from '@/components/staff/ApprovedStaffManager';
import { UserCheck } from 'lucide-react';

export default function ApprovedStaff() {
  return (
    <div className="p-4 lg:p-6 space-y-4" dir="rtl">
      <PageHeader
        title="רשימת צוות מאושרת"
        subtitle="ייבוא Excel או הוספה ידנית של מחנכים ורכזים שייכנסו עם Google לפי מייל מאושר מראש"
        actions={<UserCheck className="w-6 h-6 text-primary" />}
      />
      <ApprovedStaffManager />
    </div>
  );
}