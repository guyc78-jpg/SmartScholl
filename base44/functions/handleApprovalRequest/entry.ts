import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ROLE_LABELS = {
  admin: 'מנהל/ת מערכת',
  homeroom_teacher: 'מורה / מחנך/ת',
  coordinator: 'רכז/ת שכבה',
  student: 'תלמיד/ה',
  parent: 'הורה',
};

const VALID_ROLES = ['admin', 'homeroom_teacher', 'coordinator', 'student', 'parent'];
const SYSTEM_ROLE_PRIORITY = ['admin', 'coordinator', 'homeroom_teacher', 'student', 'parent'];

function parseRoles(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return trimmed.split(',').map(role => role.trim());
}

function normalizeRoles(...values) {
  return [...new Set(values.flatMap(parseRoles).filter(role => VALID_ROLES.includes(role)))];
}

function getApprovedRoles(user) {
  const roles = normalizeRoles(user?.roles, user?.available_roles, [user?.role]);
  return roles.length ? roles : ['student'];
}

function getSystemRole(roles) {
  return SYSTEM_ROLE_PRIORITY.find(role => roles.includes(role)) || 'student';
}

function requireAdmin(user) {
  return getApprovedRoles(user).includes('admin');
}

function detectSuspicion(data) {
  const flags = [];
  const name = (data.full_name || '').toLowerCase();
  const subject = (data.subject || '').toLowerCase();
  const role = data.requested_role;

  if (name.length < 3) flags.push('שם קצר מאוד');
  if (role === 'homeroom_teacher' && !subject.trim()) flags.push('מקצוע הוראה ריק למורה');
  if (role === 'coordinator' && /^[יא-ת]{1,2}\d/.test(data.class_or_grade || '')) {
    flags.push('שכבה נראית ככיתת תלמיד ולא שכבה');
  }
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

    if (action === 'submit') {
      const { full_name, requested_role, class_or_grade, subject, school_role, extra_roles } = body;
      if (!VALID_ROLES.includes(requested_role) || requested_role === 'admin') {
        return Response.json({ error: 'Invalid role' }, { status: 400 });
      }

      const suspicionFlags = detectSuspicion({ full_name, requested_role, class_or_grade, subject, extra_roles });
      const isSuspicious = suspicionFlags.length >= 2;

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

      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: 'approval_request_submitted',
        actor_email: user.email,
        target_email: user.email,
        target_name: full_name,
        details: `בקשה לתפקיד: ${ROLE_LABELS[requested_role]}${isSuspicious ? ' [חשוד!]' : ''}`,
        metadata: JSON.stringify({ requested_role, class_or_grade, subject, suspicionFlags }),
        severity: isSuspicious ? 'warning' : 'info',
      });

      const allUsers = await base44.asServiceRole.entities.User.list('-updated_date', 200);
      const notifyEmails = new Set(allUsers.filter(u => getApprovedRoles(u).includes('admin')).map(u => u.email));

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
          }).catch(() => {})
        );
      }
      await Promise.all(emailPromises);
      await base44.asServiceRole.entities.ApprovalRequest.update(approvalReq.id, { notification_sent: true });

      return Response.json({ success: true, request_id: approvalReq.id, is_suspicious: isSuspicious });
    }

    if (action === 'approve') {
      if (!requireAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const requests = await base44.asServiceRole.entities.ApprovalRequest.filter({ id: request_id });
      const approvalReq = requests[0];
      if (!approvalReq) return Response.json({ error: 'Not found' }, { status: 404 });

      await base44.asServiceRole.entities.ApprovalRequest.update(request_id, {
        status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
      });

      const targetUsers = await base44.asServiceRole.entities.User.filter({ email: approvalReq.user_email });
      if (targetUsers[0]) {
        const target = targetUsers[0];
        const approvedRoles = normalizeRoles(getApprovedRoles(target), [approvalReq.requested_role]);
        const primaryRole = target.role === 'admin' ? 'admin' : getSystemRole(approvedRoles);
        const classOrGrade = approvalReq.class_or_grade || '';
        const approvedGrade = classOrGrade.replace(/[׳״'"\d\s]/g, '');

        await base44.asServiceRole.entities.User.update(target.id, {
          role: primaryRole,
          roles: approvedRoles,
          available_roles: approvedRoles,
          active_work_role: approvedRoles.includes(target.active_work_role) ? target.active_work_role : primaryRole,
          onboarding_status: 'approved',
          profile_homeroom_class: approvalReq.requested_role === 'homeroom_teacher' || approvalReq.requested_role === 'student' ? classOrGrade : target.profile_homeroom_class || '',
          profile_class: approvalReq.requested_role === 'student' ? classOrGrade : target.profile_class || '',
          profile_grade_managed: approvedGrade || target.profile_grade_managed || '',
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

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: approvalReq.user_email,
        subject: '[כיתה חכמה] בקשתך אושרה!',
        body: `שלום ${approvalReq.full_name},\n\nבקשתך לתפקיד ${ROLE_LABELS[approvalReq.requested_role]} אושרה!\n\nבברכה,\nמערכת כיתה חכמה`,
      }).catch(() => {});

      return Response.json({ success: true });
    }

    if (action === 'reject') {
      if (!requireAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

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

      const targetUsers = await base44.asServiceRole.entities.User.filter({ email: approvalReq.user_email });
      if (targetUsers[0]) {
        await base44.asServiceRole.entities.User.update(targetUsers[0].id, { onboarding_status: 'rejected' });
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

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: approvalReq.user_email,
        subject: '[כיתה חכמה] עדכון בנוגע לבקשתך',
        body: `שלום ${approvalReq.full_name},\n\nלצערנו, בקשתך לתפקיד ${ROLE_LABELS[approvalReq.requested_role]} לא אושרה${rejection_reason ? ': ' + rejection_reason : '.'}\n\nבברכה,\nמערכת כיתה חכמה`,
      }).catch(() => {});

      return Response.json({ success: true });
    }

    if (action === 'list_users') {
      if (!requireAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const users = await base44.asServiceRole.entities.User.list('-updated_date', 200);
      return Response.json({ users });
    }

    if (action === 'admin_update_user') {
      if (!requireAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const { target_user_id, target_role, approved_roles, profile_homeroom_class, profile_grade_managed } = body;
      const approvedRoles = normalizeRoles(approved_roles, [target_role]);
      if (!approvedRoles.length || !approvedRoles.every(role => VALID_ROLES.includes(role)) || !approvedRoles.includes(target_role)) {
        return Response.json({ error: 'Invalid role' }, { status: 400 });
      }

      const targetUsers = await base44.asServiceRole.entities.User.filter({ id: target_user_id });
      const target = targetUsers[0] || {};

      const updatedUser = await base44.asServiceRole.entities.User.update(target_user_id, {
        role: target_role,
        roles: approvedRoles,
        available_roles: approvedRoles,
        active_work_role: approvedRoles.includes(target.active_work_role) ? target.active_work_role : target_role,
        profile_homeroom_class: profile_homeroom_class || '',
        profile_class: approvedRoles.includes('student') ? profile_homeroom_class || '' : target.profile_class || '',
        profile_grade_managed: profile_grade_managed || '',
        onboarding_status: 'approved',
      });

      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: 'role_changed',
        actor_email: user.email,
        action_name: 'admin_update_user_role',
        target_email: body.target_email || '',
        details: `הרשאות משתמש עודכנו: ${approvedRoles.map(role => ROLE_LABELS[role] || role).join(', ')}`,
        metadata: JSON.stringify({ target_user_id, target_role, approvedRoles, profile_homeroom_class, profile_grade_managed }),
        severity: 'warning',
      });

      return Response.json({ success: true, user: updatedUser });
    }

    if (action === 'get_pending') {
      if (!requireAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const pending = await base44.asServiceRole.entities.ApprovalRequest.filter({ status: 'pending' });
      const logs = await base44.asServiceRole.entities.ActivityLog.list('-created_date', 50);
      return Response.json({ pending, logs });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});