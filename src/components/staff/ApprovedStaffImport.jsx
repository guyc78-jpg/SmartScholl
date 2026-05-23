import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

const pick = (row, names) => names.map(name => row[name]).find(Boolean) || '';

export default function ApprovedStaffImport({ onImport, saving }) {
  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    const staff = rows.map(row => ({
      email: pick(row, ['email', 'אימייל', 'מייל', 'Email']),
      full_name: pick(row, ['full_name', 'שם מלא', 'שם', 'Name']),
      role: String(pick(row, ['role', 'תפקיד', 'Role'])).includes('רכז') ? 'coordinator' : 'homeroom_teacher',
      grade: pick(row, ['grade', 'שכבה', 'Grade']),
      class_name: pick(row, ['class_name', 'כיתה', 'Class']),
      subject: pick(row, ['subject', 'מקצוע', 'Subject']),
      school_role: pick(row, ['school_role', 'תפקיד בבית הספר'])
    })).filter(item => item.email && item.full_name);

    if (!staff.length) { toast.error('לא נמצאו שורות תקינות בקובץ'); return; }
    await onImport(staff);
    event.target.value = '';
  };

  return (
    <label className="inline-flex">
      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} disabled={saving} />
      <Button type="button" variant="outline" className="gap-2" disabled={saving} asChild>
        <span><Upload className="w-4 h-4" /> ייבוא Excel</span>
      </Button>
    </label>
  );
}