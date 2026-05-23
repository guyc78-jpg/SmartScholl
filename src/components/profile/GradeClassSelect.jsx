import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GRADES, formatGrade } from '@/lib/schoolStructure';

export default function GradeClassSelect({ grade, classNameValue, classId, onGradeChange, onClassChange, onClassIdChange, disabled = false, showClass = true }) {
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    base44.entities.ClassRoom.list('grade').then(data => setClasses(data.filter(item => item.is_active !== false)));
  }, []);

  const gradeClasses = useMemo(() => classes.filter(item => item.grade === grade), [classes, grade]);

  const handleGradeChange = (value) => {
    onGradeChange(value);
    onClassChange('');
    onClassIdChange?.('');
  };

  const handleClassChange = (selectedId) => {
    const selected = classes.find(item => item.id === selectedId);
    onClassIdChange?.(selectedId);
    onClassChange(selected?.name || '');
  };

  const selectedClassId = classId || classes.find(item => item.name === classNameValue)?.id || '';

  return (
    <>
      <div className="space-y-2">
        <Label>שכבה משויכת</Label>
        <Select value={grade || ''} onValueChange={handleGradeChange} disabled={disabled || classes.length === 0}>
          <SelectTrigger className={disabled ? 'bg-muted' : ''}>
            <SelectValue placeholder="בחר/י שכבה" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {GRADES.map(item => <SelectItem key={item} value={item}>{formatGrade(item)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {showClass && grade && (
        <div className="space-y-2">
          <Label>כיתה משויכת</Label>
          <Select value={selectedClassId} onValueChange={handleClassChange} disabled={disabled || gradeClasses.length === 0}>
            <SelectTrigger className={disabled ? 'bg-muted' : ''}>
              <SelectValue placeholder={gradeClasses.length ? 'בחר/י כיתה' : 'אין כיתות מוגדרות לשכבה'} />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {gradeClasses.map(item => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}