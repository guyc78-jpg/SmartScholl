import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ROLE_LABELS = {
  homeroom_teacher: 'מורה / מחנך/ת',
  coordinator: 'רכז/ת שכבה',
};

// Basic heuristic: suspicion flags
function detectSuspicion(data) {
  const flags = [];
  const name = (data.full_name || '').toLowerCase();
  const subject = (data.subject || '').toLowerCase();
  const role = data.requested_role;

  // Very young-sounding name patterns (simple heuristic)
  if (name.length < 3) flags.push('שם קצר מאוד');
  // Subject field left empty for teacher role
  if (role === 'homeroom_teacher' && !subject.trim()) flags.push('מקצוע הוראה ריק למורה');
  // Grade/class looks like a student class (e.g. "י1", "יא2") for coordinator
  if (role === 'coordinator' && /^[יא-ת]{1,2}\d/.test(data.class_or_grade || '')) {
    flags.push('שכבה נראית ככיתת תלמיד ולא שכבה');
  }
  // Suspicious keywords in extra roles
  const suspiciousWords = ['תלמיד', 'student', 'ילד', 'כיתה'];
  if (suspiciousWords.some(w => (data.extra_roles || '').toLowerCase().includes(w))) {
    flags.push('תפקידים נוספים מכילים מילות חשד');
  }

  return flags;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, request_id, rejection_reason } = body;

    // === ACTION: submit new approval request ===
    if (action === 'submit') {
      const { full_name, requested_role, class_or_grade, subject, school_role, extra_roles } = body;

      const suspicionFlags = detectSuspicion({ full_name, requested_role, class_or_grade, subject, extra_roles });
      const isSuspicious = suspicionFlags.length >= 2;

      // Create approval request record
      const approvalReq = await base44.asServiceRole.entities.ApprovalRequest.create({
        user_email: user.email,
        full_name,
        requested_role,
        class_or_grade: class_or_grade || '',
        subject: subject || '',
        school_role: school_role || '',
        extra_roles: extra_roles || '',
        status: 'pending',
        is_suspicious: isSuspicious,
        suspicious_notes: suspicionFlags.join(', '),
        notification_sent: false,
      });

      // Log the event
      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: 'approval_request_submitted',
        actor_email: user.email,
        target_email: user.email,
        target_name: full_name,
        details: `בקשה לתפקיד: ${ROLE_LABELS[requested_role]}${isSuspicious ? ' [חשוד!]' : ''}`,
        metadata: JSON.stringify({ requested_role, class_or_grade, subject, suspicionFlags }),
        severity: isSuspicious ? 'warning' : 'info',
      });

      // Find admins to notify
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const homerooms = await base44.asServiceRole.entities.User.filter({ role: 'homeroom_teacher' });
      const coordinators = await base44.asServiceRole.entities.User.filter({ role: 'coordinator' });

      const notifyEmails = new Set([
        ...admins.map(u => u.email),
        ...homerooms.map(u => u.email),
        ...coordinators.map(u => u.email),
      ]);

      const roleLabel = ROLE_LABELS[requested_role] || requested_role;
      const suspicionNote = isSuspicious
        ? `\n\n⚠️ התראת חשד: הבקשה מסומנת כחשודה (${suspicionFlags.join(', ')}). יש לבדוק בקפידה.`
        : '';

      const emailBody = `
שלום,

התקבלה בקשת הרשמה חדשה במערכת כיתה חכמה הדורשת את אישורך.

📋 פרטי הבקשה:
• שם: ${full_name}
• אימייל: ${user.email}
• תפקיד מבוקש: ${roleLabel}
• כיתה/שכבה: ${class_or_grade || 'לא צוין'}
• מקצוע: ${subject || 'לא צוין'}
• תפקיד בבית הספר: ${school_role || 'לא צוין'}
• תפקידים נוספים: ${extra_roles || 'לא צוין'}
${suspicionNote}

לאישור או דחיית הבקשה, היכנס/י לדף ניהול האישורים במערכת.

בברכה,
מערכת כיתה חכמה
      `.trim();

      const emailPromises = [];
      for (const email of notifyEmails) {
        emailPromises.push(
          base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: `[כיתה חכמה] בקשת הרשמה חדשה – ${full_name}${isSuspicious ? ' ⚠️ חשוד' : ''}`,
            body: emailBody,
          }).catch(() => {}) // don't fail if email errors
        );
      }
      await Promise.all(emailPromises);

      // Mark notification sent
      await base44.asServiceRole.entities.ApprovalRequest.update(approvalReq.id, { notification_sent: true });

      return Response.json({ success: true, request_id: approvalReq.id, is_suspicious: isSuspicious });
    }

    // === ACTION: approve ===
    if (action === 'approve') {
      if (!['admin', 'homeroom_teacher', 'coordinator'].includes(user.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const requests = await base44.asServiceRole.entities.ApprovalRequest.filter({ id: request_id });
      const approvalReq = requests[0];
      if (!approvalReq) return Response.json({ error: 'Not found' }, { status: 404 });

      await base44.asServiceRole.entities.ApprovalRequest.update(request_id, {
        status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
      });

      // Update the target user's role and onboarding status
      const targetUsers = await base44.asServiceRole.entities.User.filter({ email: approvalReq.user_email });
      if (targetUsers[0]) {
        await base44.asServiceRole.entities.User.update(targetUsers[0].id, {
          role: approvalReq.requested_role,
          onboarding_status: 'approved',
        });
      }

      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: 'approval_granted',
        actor_email: user.email,
        target_email: approvalReq.user_email,
        target_name: approvalReq.full_name,
        details: `אושר לתפקיד: ${ROLE_LABELS[approvalReq.requested_role]}`,
        severity: 'info',
      });

      // Notify the applicant
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: approvalReq.user_email,
        subject: '[כיתה חכמה] בקשתך אושרה!',
        body: `שלום ${approvalReq.full_name},\n\nבקשתך לתפקיד ${ROLE_LABELS[approvalReq.requested_role]} אושרה!\nתוכל/י כעת להיכנס למערכת כיתה חכמה עם הרשאות מלאות.\n\nבברכה,\nמערכת כיתה חכמה`,
      }).catch(() => {});

      return Response.json({ success: true });
    }

    // === ACTION: reject ===
    if (action === 'reject') {
      if (!['admin', 'homeroom_teacher', 'coordinator'].includes(user.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const requests = await base44.asServiceRole.entities.ApprovalRequest.filter({ id: request_id });
      const approvalReq = requests[0];
      if (!approvalReq) return Response.json({ error: 'Not found' }, { status: 404 });

      const isSuspicious = approvalReq.is_suspicious;

      await base44.asServiceRole.entities.ApprovalRequest.update(request_id, {
        status: isSuspicious ? 'suspicious' : 'rejected',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejection_reason || '',
      });

      // Keep user's onboarding_status as awaiting_approval (they stay blocked)
      const targetUsers = await base44.asServiceRole.entities.User.filter({ email: approvalReq.user_email });
      if (targetUsers[0]) {
        await base44.asServiceRole.entities.User.update(targetUsers[0].id, {
          onboarding_status: 'rejected',
        });
      }

      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: isSuspicious ? 'suspicious_activity' : 'approval_rejected',
        actor_email: user.email,
        target_email: approvalReq.user_email,
        target_name: approvalReq.full_name,
        details: `נדחה${isSuspicious ? ' (חשוד)' : ''}: ${rejection_reason || 'ללא סיבה'}`,
        metadata: JSON.stringify({ requested_role: approvalReq.requested_role, suspicious_notes: approvalReq.suspicious_notes }),
        severity: isSuspicious ? 'critical' : 'warning',
      });

      // Notify applicant of rejection
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: approvalReq.user_email,
        subject: '[כיתה חכמה] עדכון בנוגע לבקשתך',
        body: `שלום ${approvalReq.full_name},\n\nלצערנו, בקשתך לתפקיד ${ROLE_LABELS[approvalReq.requested_role]} לא אושרה${rejection_reason ? ': ' + rejection_reason : '.'}\n\nלשאלות פנה/י למנהל בית הספר.\n\nבברכה,\nמערכת כיתה חכמה`,
      }).catch(() => {});

      return Response.json({ success: true });
    }

    // === ACTION: get_pending ===
    if (action === 'get_pending') {
      if (!['admin', 'homeroom_teacher', 'coordinator'].includes(user.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const pending = await base44.asServiceRole.entities.ApprovalRequest.filter({ status: 'pending' });
      const logs = await base44.asServiceRole.entities.ActivityLog.list('-created_date', 50);
      return Response.json({ pending, logs });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});