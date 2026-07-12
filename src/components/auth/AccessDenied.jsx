import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function AccessDenied() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 text-right" dir="rtl">
      <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-sm space-y-4" dir="rtl">
        <div className="flex justify-end">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldX className="w-6 h-6" />
          </div>
        </div>
        <div className="space-y-2 text-right">
          <h1 className="text-xl font-bold text-foreground">המשתמש אינו מורשה להיכנס למערכת</h1>
          <p className="text-sm text-muted-foreground">יש לפנות למנהל/ת המערכת בבית הספר כדי לקבל הרשאה מתאימה.</p>
        </div>
        <Button className="w-full" variant="outline" onClick={() => logout(false)}>
          התנתקות
        </Button>
      </div>
    </div>
  );
}
