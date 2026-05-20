import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CLASS_NUMBERS, GRADES, buildClassName, formatGrade } from '@/lib/schoolStructure';

export default function GradeClassSelect({ grade, classNameValue, onGradeChange, onClassChange, disabled = false, showClass = true }) {
  const selectedNumber = classNameValue?.replace(/\D/g, '') || '';

  const handleGradeChange = (value) => {
    onGradeChange(value);
    onClassChange('');
  };

  const handleClassNumberChange = (number) => {
    onClassChange(buildClassName(grade, number));
  };

  return (
    <>
      <div className="space-y-2">
        <Label>שכבה משויכת</Label>
        <Select value={grade || ''} onValueChange={handleGradeChange} disabled={disabled}>
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
          <Select value={selectedNumber} onValueChange={handleClassNumberChange} disabled={disabled}>
            <SelectTrigger className={disabled ? 'bg-muted' : ''}>
              <SelectValue placeholder="בחר/י כיתה" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {CLASS_NUMBERS.map(number => {
                const value = buildClassName(grade, number);
                return <SelectItem key={value} value={number}>{value}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}