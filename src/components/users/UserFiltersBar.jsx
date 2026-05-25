import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLE_LABELS, SYSTEM_ROLE_PRIORITY } from '@/lib/roleUtils';
import { GRADES, formatGrade } from '@/lib/schoolStructure';

const ROLE_OPTIONS = SYSTEM_ROLE_PRIORITY.filter(r => r !== 'parent');

export default function UserFiltersBar({ search, onSearchChange, roleFilter, onRoleChange, gradeFilter, onGradeChange, classFilter, onClassChange, classOptions }) {
  return (
    <div className="bg-card border rounded-2xl p-3 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]" dir="rtl">
      <div className="relative" dir="rtl">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          dir="rtl"
          placeholder="חיפוש לפי שם או מייל..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="pr-9 pl-3 h-9 text-right placeholder:text-right"
        />
      </div>
      <Select value={roleFilter} onValueChange={onRoleChange}>
        <SelectTrigger className="w-full md:w-40 h-9"><SelectValue placeholder="תפקיד" /></SelectTrigger>
        <SelectContent dir="rtl">
          <SelectItem value="all">כל התפקידים</SelectItem>
          {ROLE_OPTIONS.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={gradeFilter} onValueChange={onGradeChange}>
        <SelectTrigger className="w-full md:w-32 h-9"><SelectValue placeholder="שכבה" /></SelectTrigger>
        <SelectContent dir="rtl">
          <SelectItem value="all">כל השכבות</SelectItem>
          {GRADES.map(g => <SelectItem key={g} value={g}>{formatGrade(g)}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={classFilter} onValueChange={onClassChange}>
        <SelectTrigger className="w-full md:w-36 h-9"><SelectValue placeholder="כיתה" /></SelectTrigger>
        <SelectContent dir="rtl">
          <SelectItem value="all">כל הכיתות</SelectItem>
          {classOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}