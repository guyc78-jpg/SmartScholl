import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ApprovedStaffForm from './ApprovedStaffForm';
import ApprovedStaffImport from './ApprovedStaffImport';
import ApprovedStaffTable from './ApprovedStaffTable';

export default function ApprovedStaffManager() {
  const [staff, setStaff] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadStaff = async () => {
    const res = await base44.functions.invoke('handleApprovalRequest', { action: 'list_approved_staff' });
    setStaff(res.data.staff || []);
  };

  useEffect(() => { loadStaff(); }, []);

  const saveStaff = async (staffData) => {
    setSaving(true);
    await base44.functions.invoke('handleApprovalRequest', { action: 'save_approved_staff', staff: staffData });
    toast.success('איש הצוות נוסף לרשימה המאושרת');
    await loadStaff();
    setSaving(false);
  };

  const importStaff = async (staffList) => {
    setSaving(true);
    await base44.functions.invoke('handleApprovalRequest', { action: 'bulk_save_approved_staff', staff_list: staffList });
    toast.success(`${staffList.length} אנשי צוות יובאו לרשימה המאושרת`);
    await loadStaff();
    setSaving(false);
  };

  const deleteStaff = async (staffId) => {
    await base44.functions.invoke('handleApprovalRequest', { action: 'delete_approved_staff', staff_id: staffId });
    toast.success('הרשומה נמחקה');
    await loadStaff();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">רשימת צוות מאושרת</h2>
          <p className="text-sm text-muted-foreground">מחנכים ורכזים ייכנסו עם Google לפי המייל המאושר ויקבלו שיוך אוטומטי.</p>
        </div>
        <ApprovedStaffImport onImport={importStaff} saving={saving} />
      </div>
      <ApprovedStaffForm onSubmit={saveStaff} saving={saving} />
      <ApprovedStaffTable staff={staff} onDelete={deleteStaff} />
    </div>
  );
}