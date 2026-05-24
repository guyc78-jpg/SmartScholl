import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Eye, FileUp, Plus } from 'lucide-react';

export default function SmartCalendarEmptyState({ canImport, canAdd, onImport, onAdd, onDemo }) {
  return (
    <Card className="p-6 sm:p-10 text-center overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/10 pointer-events-none" />
      <div className="relative max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CalendarDays className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-2">הלוח החכם מוכן לשימוש</h3>
        <p className="text-sm text-muted-foreground mb-5">ייבאו קובץ לוח מבחנים/פעילויות, הוסיפו אירוע ידנית או צפו בדוגמה כדי לראות איך הלוח ייראה.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-2">
          {canImport && <Button onClick={onImport} className="gap-2"><FileUp className="w-4 h-4" />ייבוא לוח מקובץ</Button>}
          {canAdd && <Button variant="outline" onClick={onAdd} className="gap-2"><Plus className="w-4 h-4" />הוסף אירוע</Button>}
          <Button variant="secondary" onClick={onDemo} className="gap-2"><Eye className="w-4 h-4" />צפה בדוגמה</Button>
        </div>
      </div>
    </Card>
  );
}