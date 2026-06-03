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

function AlertSourceDetails({ details, alertType }) {
  const source = details?.source_info;
  if (!source) return null;

  // For exam alerts — show class/group only, never student names
  const isExamAlert = alertType === 'upcoming_exam' || alertType === 'exam_overload';
  const students = isExamAlert ? null : (source.related_student_names || []).slice(0, 4).join(', ');

  return (
    <div className="mt-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-[11px] text-muted-foreground text-right" dir="rtl">
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
        {source.class_or_group && <span>קהל יעד: <strong>{source.class_or_group}</strong></span>}
        {source.exam_date && <span>תאריך: <strong>{source.exam_date}</strong></span>}
        {students && <span>תלמידים: <strong>{students}</strong></span>}
      </div>
    </div>
  );
}

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
          base44.functions.invoke('generateSmartAlerts', { role: userRole }),
          timeoutPromise
        ]);
        const nextAlerts = result?.data?.alerts || [];
        setAlerts(nextAlerts);
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
  }, [userRole]);

  // Only show for approved dashboard roles
  if (!['admin', 'homeroom_teacher', 'coordinator', 'student'].includes(userRole)) {
    return null;
  }

  if (loading) {
    return (
      <Card dir="rtl" className="text-right">
        <CardHeader>
          <CardTitle>התראות חכמות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">טוען...</div>
        </CardContent>
      </Card>
    );
  }

  // For exam alerts use exam_id as key (no student_id); for others use student_id
  const alertKey = (alert) => alert.alert_type === 'upcoming_exam' || alert.alert_type === 'exam_overload'
    ? `exam-${alert.details?.source_info?.exam_id}-${alert.alert_type}`
    : `${alert.student_id}-${alert.alert_type}`;
  const visibleAlerts = alerts.filter(alert => alert.alert_type !== 'open_incident' && !dismissed.has(alertKey(alert)));
  const criticalCount = visibleAlerts.filter(a => a.severity === 'critical').length;
  const highCount = visibleAlerts.filter(a => a.severity === 'high').length;

  if (visibleAlerts.length === 0) {
    return (
      <Card dir="rtl" className="text-right">
        <CardHeader>
          <CardTitle>התראות חכמות</CardTitle>
          <CardDescription>אין התראות פעילות כרגע</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleDismiss = (alert) => {
    setDismissed(prev => new Set(prev).add(alertKey(alert)));
  };

  return (
    <Card dir="rtl" className="text-right">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 text-right" dir="rtl">
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
              <Alert key={idx} className={cn('border-0 text-right', config.bg)} dir="rtl">
                <div className="flex gap-3 items-start text-right" dir="rtl">
                  <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-end gap-2 mb-1">
                      {alert.student_name && (
                        <span className="font-semibold text-sm">{formatStudentName(alert.student_name)}</span>
                      )}
                      <Badge className={severityBadges[alert.severity]} variant="outline">
                        {alert.severity === 'critical' ? 'קריטי' : alert.severity === 'high' ? 'גבוה' : alert.severity === 'medium' ? 'בינוני' : 'נמוך'}
                      </Badge>
                    </div>
                    <AlertDescription className="text-sm text-right" dir="rtl">
                      {alert.message}
                    </AlertDescription>
                    <AlertSourceDetails details={alert.details} alertType={alert.alert_type} />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-7 w-7"
                    onClick={() => handleDismiss(alert)}
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