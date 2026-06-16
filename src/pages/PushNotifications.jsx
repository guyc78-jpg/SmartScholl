import PushNotificationToggle from '@/components/notifications/PushNotificationToggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export default function PushNotifications() {
  return (
    <div className="p-4 lg:p-6 space-y-4 text-right" dir="rtl">
      <div className="text-right">
        <h1 className="text-xl lg:text-2xl font-bold text-foreground">בדיקת התראות Push</h1>
        <p className="text-sm text-muted-foreground mt-1">הפעלת התראות ושליחת התראת בדיקה למכשיר הנוכחי.</p>
      </div>

      <Card className="border-primary/20 bg-primary/5" dir="rtl">
        <CardHeader className="pb-3 text-right">
          <CardTitle className="flex items-center gap-2 justify-start text-right">
            <Bell className="w-5 h-5 text-primary" />
            בדיקת התראות
          </CardTitle>
        </CardHeader>
        <CardContent className="text-right">
          <PushNotificationToggle showUnsupported />
        </CardContent>
      </Card>
    </div>
  );
}