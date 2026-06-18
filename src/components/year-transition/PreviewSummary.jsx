import { Card, CardContent } from '@/components/ui/card';

const items = [
  ['studentsToUpdate', 'תלמידים שיעלו כיתה'],
  ['graduatingStudents', 'תלמידי י״ב לבוגרים'],
  ['classesToUpdate', 'כיתות בתהליך'],
  ['teachersToUpdate', 'מחנכים שיעודכנו'],
];

export default function PreviewSummary({ totals = {} }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" dir="rtl">
      {items.map(([key, label]) => (
        <Card key={key} className="text-right">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-primary">{totals[key] || 0}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}