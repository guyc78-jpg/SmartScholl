import { Badge } from '@/components/ui/badge';

export default function ClassMappingTable({ mappings = [] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card" dir="rtl">
      <table className="w-full text-sm text-right">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr><th className="p-3">מכיתה</th><th className="p-3">לכיתה</th><th className="p-3">תלמידים</th><th className="p-3">סטטוס</th></tr>
        </thead>
        <tbody>
          {mappings.map((item) => (
            <tr key={item.sourceClassId} className="border-t">
              <td className="p-3 font-medium">{item.sourceClassName}</td>
              <td className="p-3">{item.targetClassName}</td>
              <td className="p-3">{item.studentCount}</td>
              <td className="p-3">
                {item.missingTarget ? <Badge variant="destructive">חסרה כיתת יעד</Badge> : item.isGraduation ? <Badge variant="secondary">בוגרים</Badge> : <Badge>מוכן</Badge>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}