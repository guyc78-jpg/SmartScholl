import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, AlertCircle, Zap, TrendingUp, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatStudentName } from '@/lib/studentName';

const alertConfig = {
  high_absences: { icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', label: 'היעדרויות גבוהות' },
  consecutive_lates: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', label: 'איחורים רצופים' },
  upcoming_exam: { icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'מבחן קרוב' },
  exam_overload: { icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50 dark:bg-red-900/20', label: 'עומס מבחנים' },
  pending_task: { icon: CheckCircle2, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', label: 'משימה שלא טופלה' },
  open_incident: { icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50 dark:bg-red-900/20', label: 'אירוע חריג פתוח' }
};

const severityBadges = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

export default function SmartAlerts({ userRole }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    let didFinish = false;

    const loadAlerts = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 8000)
        );
        const result = await Promise.race([
          base44.functions.invoke('generateSmartAlerts', {}),
          timeoutPromise
        ]);
        setAlerts(result?.data?.alerts || []);
      } catch (error) {
        console.error('Failed to load alerts:', error);
        setAlerts([]);
      } finally {
        didFinish = true;
        setLoading(false);
      }
    };

    loadAlerts();

    // Hard safety net — never leave the card in loading forever
    const safetyTimer = setTimeout(() => {
      if (!didFinish) setLoading(false);
    }, 10000);

    return () => clearTimeout(safetyTimer);
  }, []);

  // Only show for staff
  if (!['admin', 'homeroom_teacher', 'coordinator'].includes(userRole)) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>התראות חכמות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">טוען...</div>
        </CardContent>
      </Card>
    );
  }

  const visibleAlerts = alerts.filter(alert => !dismissed.has(`${alert.student_id}-${alert.alert_type}`));
  const criticalCount = visibleAlerts.filter(a => a.severity === 'critical').length;
  const highCount = visibleAlerts.filter(a => a.severity === 'high').length;

  if (visibleAlerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>התראות חכמות</CardTitle>
          <CardDescription>אין התראות פעילות כרגע</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleDismiss = (studentId, alertType) => {
    setDismissed(prev => new Set(prev).add(`${studentId}-${alertType}`));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>התראות חכמות</CardTitle>
            <CardDescription>{visibleAlerts.length} התראות פעילות</CardDescription>
          </div>
          {(criticalCount > 0 || highCount > 0) && (
            <div className="flex gap-2">
              {criticalCount > 0 && (
                <Badge variant="destructive">{criticalCount} קריטיים</Badge>
              )}
              {highCount > 0 && (
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  {highCount} גבוהים
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleAlerts.map((alert, idx) => {
            const config = alertConfig[alert.alert_type];
            const Icon = config.icon;

            return (
              <Alert key={idx} className={cn('border-0', config.bg)}>
                <div className="flex gap-3 items-start">
                  <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{formatStudentName(alert.student_name)}</span>
                      <Badge className={severityBadges[alert.severity]} variant="outline">
                        {alert.severity === 'critical' ? 'קריטי' : alert.severity === 'high' ? 'גבוה' : alert.severity === 'medium' ? 'בינוני' : 'נמוך'}
                      </Badge>
                    </div>
                    <AlertDescription className="text-sm">
                      <span className="font-medium">{config.label}:</span> {alert.message}
                    </AlertDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-7 w-7"
                    onClick={() => handleDismiss(alert.student_id, alert.alert_type)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Alert>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}