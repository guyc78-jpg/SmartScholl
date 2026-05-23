import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

const pick = (row, names) => names.map(name => row[name]).find(Boolean) || '';
const splitList = (value) => String(value || '').split(',').map(item => item.trim()).filter(Boolean);

export default function ApprovedStaffImport({ onImport, saving }) {
  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    const staff = rows.map(row => {
      const role = String(pick(row, ['role', 'תפקיד', 'Role'])).includes('רכז') ? 'coordinator' : 'homeroom_teacher';
      const gradeValue = pick(row, ['grades', 'grade', 'שכבות', 'שכבה', 'Grade']);
      const classValue = pick(row, ['class_names', 'class_name', 'כיתות', 'כיתה', 'Class']);
      const grades = splitList(gradeValue);
      const classNames = splitList(classValue);
      return {
        email: pick(row, ['email', 'אימייל', 'מייל', 'Email']),
        full_name: pick(row, ['full_name', 'שם מלא', 'שם', 'Name']),
        phone: pick(row, ['phone', 'טלפון', 'Phone']),
        role,
        grade: grades[0] || '',
        grades,
        class_name: classNames[0] || '',
        class_names: classNames,
        subject: pick(row, ['subject', 'מקצוע', 'Subject']),
        school_role: pick(row, ['school_role', 'תפקיד בבית הספר'])
      };
    }).filter(item => item.email && item.full_name);

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