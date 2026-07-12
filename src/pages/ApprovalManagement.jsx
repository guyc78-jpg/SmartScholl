import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  CheckCircle, XCircle, AlertTriangle, Clock,
  BookOpen, Users, ChevronDown, ChevronUp, ScrollText, School
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { formatSchoolDate } from '@/lib/dateUtils';

const ROLE_LABELS = {
  homeroom_teacher: 'מורה / מחנך/ת',
  coordinator: 'רכז/ת שכבה',
};
const STATUS_CONFIG = {
  pending:    { label: 'ממתין', color: 'bg-amber-100 text-amber-700' },
  approved:   { label: 'אושר', color: 'bg-emerald-100 text-emerald-700' },
  rejected:   { label: 'נדחה', color: 'bg-red-100 text-red-700' },
  suspicious: { label: 'חשוד', color: 'bg-red-200 text-red-800 font-bold' },
};
const EVENT_LABELS = {
  approval_request_submitted: 'בקשת הרשמה הוגשה',
  approval_granted: 'בקשה אושרה',
  approval_rejected: 'בקשה נדחתה',
  suspicious_activity: 'פעילות חשודה',
  role_changed: 'תפקיד שונה',
};
const SEVERITY_COLOR = {
  info: 'border-r-4 border-r-blue-400',
  warning: 'border-r-4 border-r-amber-400',
  critical: 'border-r-4 border-r-red-500',
};

function RequestCard({ req, onApprove, onReject, processing }) {
  const [expanded, setExpanded] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const isSuspicious = req.is_suspicious;
  const status = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;

  return (
    <Card className={`transition-all ${isSuspicious ? 'border-red-300 dark:border-red-700' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isSuspicious ? 'bg-red-100 dark:bg-red-900/30' : 'bg-primary/10'}`}>
            {isSuspicious
              ? <AlertTriangle className="w-5 h-5 text-red-600" />
              : (req.request_type === 'class_change'
                ? <School className="w-5 h-5 text-primary" />
                : (req.requested_role === 'coordinator' ? <Users className="w-5 h-5 text-primary" /> : <BookOpen className="w-5 h-5 text-primary" />))
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{req.full_name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
              {isSuspicious && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> חשוד!
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{req.user_email}</p>
            <p className="text-xs text-foreground mt-1">
              {req.request_type === 'class_change' ? (
                <>
                  <span className="text-muted-foreground">בקשה: </span>שינוי כיתה
                  <span> · </span><span className="text-muted-foreground">מ־</span>{req.current_class || 'לא הוגדרה'}
                  <span> </span><span className="text-muted-foreground">אל </span>{req.requested_class || req.class_or_grade}
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">תפקיד: </span>{ROLE_LABELS[req.requested_role]}
                  {req.class_or_grade && <> · <span className="text-muted-foreground">כיתה: </span>{req.class_or_grade}</>}
                  {req.subject && <> · <span className="text-muted-foreground">מקצוע: </span>{req.subject}</>}
                </>
              )}
            </p>
            {req.extra_roles && <p className="text-xs text-muted-foreground mt-0.5">תפקידים נוספים: {req.extra_roles}</p>}
            {isSuspicious && req.suspicious_notes && (
              <p className="text-xs text-red-600 mt-1 font-medium">⚠ {req.suspicious_notes}</p>
            )}
          </div>
          <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t space-y-1 text-xs text-muted-foreground">
                {req.school_role && <p><span className="font-medium">תפקיד בביה"ס:</span> {req.school_role}</p>}
                {req.request_type === 'class_change' && req.request_reason && <p><span className="font-medium">סיבת הבקשה:</span> {req.request_reason}</p>}
                <p><span className="font-medium">נשלח:</span> {formatSchoolDate(req.created_date, { dateStyle: 'short', timeStyle: 'short' }) || '-'}</p>
                {req.reviewed_by && <p><span className="font-medium">טופל ע"י:</span> {req.reviewed_by}</p>}
                {req.rejection_reason && <p><span className="font-medium">סיבת דחייה:</span> {req.rejection_reason}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {req.status === 'pending' && (
          <div className="mt-3 flex flex-col gap-2">
            {!showRejectForm ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-1"
                  disabled={processing}
                  onClick={() => onApprove(req.id)}
                >
                  <CheckCircle className="w-4 h-4" /> אשר
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-1"
                  disabled={processing}
                  onClick={() => setShowRejectForm(true)}
                >
                  <XCircle className="w-4 h-4" /> דחה
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  placeholder="סיבת הדחייה (אופציונלי)"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="text-sm h-16"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 gap-1"
                    disabled={processing}
                    onClick={() => { onReject(req.id, rejectReason); setShowRejectForm(false); }}
                  >
                    <XCircle className="w-4 h-4" /> אשר דחייה
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowRejectForm(false)}>
                    ביטול
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ApprovalManagement({ role }) {
  const [pending, setPending] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState('pending');

  async function loadData() {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('handleApprovalRequest', { action: 'get_pending' });
      setPending(res.data.pending || []);
      setLogs(res.data.logs || []);
    } catch (e) {
      console.error('Load pending error:', e);
      const errorMsg = e?.response?.status === 403
        ? 'אין לך הרשאה לגשת לעמוד זה. זה דורש הרשאות מנהלים או מחנך/ת כיתה.'
        : 'שגיאה בטעינת הנתונים';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleApprove(reqId) {
    setProcessing(true);
    await base44.functions.invoke('handleApprovalRequest', { action: 'approve', request_id: reqId });
    toast.success('הבקשה אושרה בהצלחה');
    await loadData();
    setProcessing(false);
  }

  async function handleReject(reqId, reason) {
    setProcessing(true);
    await base44.functions.invoke('handleApprovalRequest', { action: 'reject', request_id: reqId, rejection_reason: reason });
    toast.success('הבקשה נדחתה');
    await loadData();
    setProcessing(false);
  }

  const pendingReqs = pending.filter(r => r.status === 'pending');
  const suspiciousReqs = pending.filter(r => r.is_suspicious);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-6" dir="rtl">
      <PageHeader
        title="ניהול אישורים"
        subtitle="אישור ודחיית בקשות הרשאה ושינוי כיתה"
        actions={
          <div className="flex items-center gap-2">
            {pendingReqs.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" /> {pendingReqs.length} ממתינות
              </span>
            )}
            {suspiciousReqs.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {suspiciousReqs.length} חשודות
              </span>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {[
          { id: 'pending', label: 'ממתינות לאישור', icon: Clock },
          { id: 'log', label: 'יומן פעילות', icon: ScrollText },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'pending' && (
        <div className="space-y-3">
          {suspiciousReqs.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">
                <strong>שים/י לב:</strong> {suspiciousReqs.length} בקשות מסומנות כחשודות — ייתכן שמדובר בתלמידים המנסים להתחזות לצוות. יש לבדוק ולדחות בהתאם.
              </p>
            </div>
          )}

          {pendingReqs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
              <p className="font-medium">אין בקשות ממתינות</p>
              <p className="text-sm mt-1">כל הבקשות טופלו</p>
            </div>
          ) : (
            pendingReqs
              .sort((a, b) => (b.is_suspicious ? 1 : 0) - (a.is_suspicious ? 1 : 0))
              .map(req => (
                <RequestCard
                  key={req.id}
                  req={req}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  processing={processing}
                />
              ))
          )}
        </div>
      )}

      {tab === 'log' && (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין רשומות ביומן</p>
          ) : logs.map(log => (
            <div key={log.id} className={`bg-card border rounded-xl p-3 ${SEVERITY_COLOR[log.severity] || ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{EVENT_LABELS[log.event_type] || log.event_type}</p>
                  <p className="text-xs text-muted-foreground">{log.target_name || log.target_email} · {log.actor_email}</p>
                  {log.details && <p className="text-xs text-foreground mt-0.5">{log.details}</p>}
                </div>
                <div className="text-left flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    log.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    log.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{log.severity}</span>
                  <p className="text-xs text-muted-foreground mt-1">{formatSchoolDate(log.created_date, { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
