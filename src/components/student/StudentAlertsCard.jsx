import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, AlertCircle } from 'lucide-react';

export default function StudentAlertsCard({ alerts }) {
  if (!alerts?.length) return null;
  return (
    <Card dir="rtl" className="text-right">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {alerts[0]?.alert_type === 'positive_reinforcement'
            ? <Star className="w-4 h-4 text-amber-500" />
            : <AlertCircle className="w-4 h-4 text-orange-500" />}
          התראות חשובות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map(alert => {
          const positive = alert.alert_type === 'positive_reinforcement';
          return (
            <div key={alert.id} className={`p-3 rounded-xl border ${positive ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/30'}`}>
              <div className="flex items-start gap-2">
                {positive
                  ? <Star className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 text-right">
                  <p className="text-sm font-medium">{alert.message}</p>
                  {alert.details?.note && <p className="text-xs text-muted-foreground mt-1">{alert.details.note}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}