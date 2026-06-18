const labels = {
  AttendanceRecord: 'נוכחות', DisciplineEvent: 'משמעת', Communication: 'יומן תקשורת', TeacherNote: 'הערות מורים', Task: 'משימות', Announcement: 'הודעות', AnnouncementRead: 'אישורי קריאה', Exam: 'מבחנים ואירועים', ExamCompletion: 'השלמות מבחנים', ExamGradeReport: 'דיווחי ציונים', PerformanceReview: 'הערכות', SmartAlert: 'התראות חכמות', ScheduledConversation: 'שיחות מתוכננות', PushNotificationQueue: 'תור התראות', UrgentFlag: 'דגלים דחופים', CommunityServiceReport: 'דיווחי מעורבות', ScheduleSlot: 'מערכת שעות'
};

export default function DeleteCountsTable({ counts = {} }) {
  return (
    <div className="space-y-3 text-right" dir="rtl">
      <p className="text-sm text-muted-foreground leading-relaxed">
        הנתונים הבאים הם נתוני עבודה של השנה הנוכחית ויימחקו רק לאחר אישור סופי של האיפוס.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {Object.keys(counts).map((key) => (
          <div key={key} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-right">
            <span className="font-medium">{labels[key] || key}</span>
            <span className="text-destructive font-bold">יימחק</span>
          </div>
        ))}
      </div>
    </div>
  );
}