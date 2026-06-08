import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ROLE_LABELS = {
  system_admin: 'מנהל/ת מערכת',
  admin: 'מנהל/ת מערכת',
  division_manager: 'מנהל/ת חטיבה',
  homeroom_teacher: 'מורה / מחנך/ת',
  grade_coordinator: 'רכז/ת שכבה',
  coordinator: 'רכז/ת שכבה',
  student: 'תלמיד/ה',
  parent: 'הורה',
};

const VALID_ROLES = ['system_admin', 'admin', 'division_manager', 'homeroom_teacher', 'grade_coordinator', 'coordinator', 'student', 'parent'];
const SYSTEM_ROLE_PRIORITY = ['system_admin', 'admin', 'division_manager', 'grade_coordinator', 'coordinator', 'homeroom_teacher', 'student', 'parent'];

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
  const roles = getApprovedRoles(user);
  return roles.includes('admin') || roles.includes('system_admin');
}

function requireApprover(user) {
  return getApprovedRoles(user).some(role => ['system_admin', 'admin', 'homeroom_teacher', 'grade_coordinator', 'coordinator'].includes(role));
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function buildStaffUserUpdate(staff) {
  const roles = [staff.role];
  return {
    role: staff.role,
    roles,
    available_roles: roles,
    active_work_role: staff.role,
    onboarding_status: 'approved',
    onboardingCompleted: false,
    login_type: 'google',
    pre_created_by_admin: true,
    must_change_password: false,
    profile_full_name: staff.full_name || '',
    profile_phone: staff.phone || '',
    profile_subject: staff.subject || '',
    profile_school_role: staff.school_role || '',
    profile_grade_managed: staff.role === 'coordinator' ? (staff.grades || []).join(', ') || staff.grade || '' : staff.grade || '',
    profile_class_id: staff.role === 'homeroom_teacher' ? staff.class_id || (staff.class_ids || [])[0] || '' : '',
    profile_homeroom_class: staff.role === 'homeroom_teacher' ? staff.class_name || (staff.class_names || [])[0] || '' : '',
  };
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
      const { full_name, requested_role, class_or_grade, class_id, subject, school_role, extra_roles } = body;
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
        requested_class_id: class_id || '',
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

    if (action === 'submit_class_change') {
      const { full_name, current_class_id, current_grade, current_class, requested_class_id, requested_grade, requested_class, request_reason } = body;
      if (!requested_grade || !requested_class_id || !request_reason) {
        return Response.json({ error: 'Missing class change details' }, { status: 400 });
      }

      const classRecords = await base44.asServiceRole.entities.ClassRoom.filter({ id: requested_class_id });
      const selectedClass = classRecords[0];
      if (!selectedClass || selectedClass.is_active === false) {
        return Response.json({ error: 'Class not found' }, { status: 400 });
      }

      const approvalReq = await base44.asServiceRole.entities.ApprovalRequest.create({
        user_email: user.email,
        full_name,
        request_type: 'class_change',
        requested_role: 'student',
        class_or_grade: selectedClass.name,
        current_class_id: current_class_id || '',
        current_grade: current_grade || '',
        current_class: current_class || '',
        requested_class_id,
        requested_grade: selectedClass.grade || requested_grade,
        requested_class: selectedClass.name,
        request_reason,
        school_role: 'בקשת שינוי כיתה מפרופיל תלמיד/ה',
        status: 'pending',
        is_suspicious: false,
        notification_sent: false,
      });

      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: 'approval_request_submitted',
        actor_email: user.email,
        target_email: user.email,
        target_name: full_name,
        details: `בקשת שינוי כיתה: ${current_class || 'לא הוגדר'} → ${selectedClass.name}`,
        metadata: JSON.stringify({ request_type: 'class_change', current_class_id, current_grade, current_class, requested_class_id, requested_grade: selectedClass.grade, requested_class: selectedClass.name, request_reason }),
        severity: 'info',
      });

      const allUsers = await base44.asServiceRole.entities.User.list('-updated_date', 200);
      const notifyEmails = new Set(allUsers.filter(u => getApprovedRoles(u).some(role => ['admin', 'homeroom_teacher', 'coordinator'].includes(role))).map(u => u.email));
      const emailBody = `שלום,\n\nהתקבלה בקשת שינוי כיתה הדורשת אישור.\n\nשם: ${full_name}\nאימייל: ${user.email}\nכיתה נוכחית: ${current_class || 'לא הוגדרה'}\nכיתה מבוקשת: ${selectedClass.name}\nסיבה: ${request_reason}\n\nלאישור או דחייה, היכנס/י לדף ניהול האישורים במערכת.\n\nבברכה,\nמערכת כיתה חכמה`;

      await Promise.all([...notifyEmails].map(email => base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `[כיתה חכמה] בקשת שינוי כיתה – ${full_name}`,
        body: emailBody,
      }).catch(() => {})));
      await base44.asServiceRole.entities.ApprovalRequest.update(approvalReq.id, { notification_sent: true });

      return Response.json({ success: true, request_id: approvalReq.id });
    }

    if (action === 'approve') {
      const requests = await base44.asServiceRole.entities.ApprovalRequest.filter({ id: request_id });
      const approvalReq = requests[0];
      if (!approvalReq) return Response.json({ error: 'Not found' }, { status: 404 });
      if (approvalReq.request_type === 'class_change') {
        if (!requireApprover(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      } else if (!requireAdmin(user)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      await base44.asServiceRole.entities.ApprovalRequest.update(request_id, {
        status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
      });

      const targetUsers = await base44.asServiceRole.entities.User.filter({ email: approvalReq.user_email });
      if (targetUsers[0]) {
        const target = targetUsers[0];
        if (approvalReq.request_type === 'class_change') {
          await base44.asServiceRole.entities.User.update(target.id, {
            profile_class_id: approvalReq.requested_class_id || '',
            profile_class: approvalReq.requested_class || approvalReq.class_or_grade || '',
            profile_homeroom_class: approvalReq.requested_class || approvalReq.class_or_grade || '',
            profile_grade_managed: approvalReq.requested_grade || '',
          });
        } else {
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
            profile_class_id: approvalReq.requested_role === 'homeroom_teacher' || approvalReq.requested_role === 'student' ? approvalReq.requested_class_id || approvalReq.current_class_id || '' : target.profile_class_id || '',
            profile_homeroom_class: approvalReq.requested_role === 'homeroom_teacher' || approvalReq.requested_role === 'student' ? classOrGrade : target.profile_homeroom_class || '',
            profile_class: approvalReq.requested_role === 'student' ? classOrGrade : target.profile_class || '',
            profile_grade_managed: approvedGrade || target.profile_grade_managed || '',
          });
        }
      }

      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: 'approval_granted',
        actor_email: user.email,
        target_email: approvalReq.user_email,
        target_name: approvalReq.full_name,
        details: approvalReq.request_type === 'class_change'
          ? `אושר שינוי כיתה: ${approvalReq.current_class || 'לא הוגדר'} → ${approvalReq.requested_class || approvalReq.class_or_grade}`
          : `אושר לתפקיד: ${ROLE_LABELS[approvalReq.requested_role]}`,
        severity: 'info',
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: approvalReq.user_email,
        subject: '[כיתה חכמה] בקשתך אושרה!',
        body: approvalReq.request_type === 'class_change'
          ? `שלום ${approvalReq.full_name},\n\nבקשת שינוי הכיתה שלך אושרה. הכיתה עודכנה ל-${approvalReq.requested_class || approvalReq.class_or_grade}.\n\nבברכה,\nמערכת כיתה חכמה`
          : `שלום ${approvalReq.full_name},\n\nבקשתך לתפקיד ${ROLE_LABELS[approvalReq.requested_role]} אושרה!\n\nבברכה,\nמערכת כיתה חכמה`,
      }).catch(() => {});

      return Response.json({ success: true });
    }

    if (action === 'reject') {
      const requests = await base44.asServiceRole.entities.ApprovalRequest.filter({ id: request_id });
      const approvalReq = requests[0];
      if (!approvalReq) return Response.json({ error: 'Not found' }, { status: 404 });
      if (approvalReq.request_type === 'class_change') {
        if (!requireApprover(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      } else if (!requireAdmin(user)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const isSuspicious = approvalReq.is_suspicious;
      await base44.asServiceRole.entities.ApprovalRequest.update(request_id, {
        status: isSuspicious ? 'suspicious' : 'rejected',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejection_reason || '',
      });

      if (approvalReq.request_type !== 'class_change') {
        const targetUsers = await base44.asServiceRole.entities.User.filter({ email: approvalReq.user_email });
        if (targetUsers[0]) {
          await base44.asServiceRole.entities.User.update(targetUsers[0].id, { onboarding_status: 'rejected' });
        }
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
        body: approvalReq.request_type === 'class_change'
          ? `שלום ${approvalReq.full_name},\n\nבקשת שינוי הכיתה שלך לא אושרה${rejection_reason ? ': ' + rejection_reason : '.'}\n\nבברכה,\nמערכת כיתה חכמה`
          : `שלום ${approvalReq.full_name},\n\nלצערנו, בקשתך לתפקיד ${ROLE_LABELS[approvalReq.requested_role]} לא אושרה${rejection_reason ? ': ' + rejection_reason : '.'}\n\nבברכה,\nמערכת כיתה חכמה`,
      }).catch(() => {});

      return Response.json({ success: true });
    }

    if (action === 'list_users') {
      if (!requireAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      // Paginate to handle more than 200 users
      let allUsers = [];
      let skip = 0;
      const pageSize = 200;
      while (true) {
        const page = await base44.asServiceRole.entities.User.list('-updated_date', pageSize, skip);
        if (!page || page.length === 0) break;
        allUsers = allUsers.concat(page);
        if (page.length < pageSize) break;
        skip += pageSize;
      }
      return Response.json({ users: allUsers });
    }

    if (action === 'delete_user') {
      if (!requireAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { target_user_id, target_email } = body;
      if (!target_user_id) return Response.json({ error: 'Missing target_user_id' }, { status: 400 });
      if (target_user_id === user.id) return Response.json({ error: 'Cannot delete yourself' }, { status: 400 });

      await base44.asServiceRole.entities.User.delete(target_user_id);

      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: 'role_changed',
        actor_email: user.email,
        action_name: 'admin_delete_user',
        target_email: target_email || '',
        details: `נמחק משתמש מהמערכת: ${target_email || target_user_id}`,
        metadata: JSON.stringify({ target_user_id, target_email }),
        severity: 'critical',
      });

      return Response.json({ success: true });
    }

    if (action === 'list_approved_staff') {
      if (!requireAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const staff = await base44.asServiceRole.entities.ApprovedStaff.list('-updated_date', 500);
      return Response.json({ staff });
    }

    if (action === 'save_approved_staff') {
      if (!requireAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const staff = body.staff || {};
      const email = normalizeEmail(staff.email);
      if (!email || !staff.full_name || !['homeroom_teacher', 'coordinator'].includes(staff.role)) {
        return Response.json({ error: 'Invalid staff details' }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.ApprovedStaff.filter({ email });
      const data = { ...staff, email, grades: staff.grades || [staff.grade].filter(Boolean), class_ids: staff.class_ids || [staff.class_id].filter(Boolean), class_names: staff.class_names || [staff.class_name].filter(Boolean), status: staff.status || 'waiting' };
      const saved = existing[0]
        ? await base44.asServiceRole.entities.ApprovedStaff.update(existing[0].id, data)
        : await base44.asServiceRole.entities.ApprovedStaff.create(data);
      return Response.json({ success: true, staff: saved });
    }

    if (action === 'bulk_save_approved_staff') {
      if (!requireAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const staffList = Array.isArray(body.staff_list) ? body.staff_list : [];
      let savedCount = 0;
      for (const staff of staffList) {
        const email = normalizeEmail(staff.email);
        if (!email || !staff.full_name || !['homeroom_teacher', 'coordinator'].includes(staff.role)) continue;
        const existing = await base44.asServiceRole.entities.ApprovedStaff.filter({ email });
        const data = { ...staff, email, grades: staff.grades || [staff.grade].filter(Boolean), class_ids: staff.class_ids || [staff.class_id].filter(Boolean), class_names: staff.class_names || [staff.class_name].filter(Boolean), status: staff.status || 'waiting' };
        if (existing[0]) await base44.asServiceRole.entities.ApprovedStaff.update(existing[0].id, data);
        else await base44.asServiceRole.entities.ApprovedStaff.create(data);
        savedCount += 1;
      }
      return Response.json({ success: true, savedCount });
    }

    if (action === 'delete_approved_staff') {
      if (!requireAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      await base44.asServiceRole.entities.ApprovedStaff.delete(body.staff_id);
      return Response.json({ success: true });
    }

    if (action === 'activate_approved_staff') {
      const email = normalizeEmail(user.email);
      const matches = await base44.asServiceRole.entities.ApprovedStaff.filter({ email });
      const staff = matches.find(item => item.status !== 'disabled');
      if (!staff) return Response.json({ found: false });

      const updatedUser = await base44.asServiceRole.entities.User.update(user.id, buildStaffUserUpdate(staff));
      await base44.asServiceRole.entities.ApprovedStaff.update(staff.id, {
        status: 'active',
        activated_user_id: user.id,
        activated_at: new Date().toISOString(),
      });
      return Response.json({ found: true, user: updatedUser });
    }

    if (action === 'admin_update_user') {
      if (!requireAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const {
        target_user_id,
        target_role,
        approved_roles,
        profile_full_name,
        profile_email,
        profile_phone,
        profile_school_role,
        profile_class_id,
        profile_homeroom_class,
        profile_grade_managed,
        profile_division,
        profile_subject,
        onboarding_status,
        status,
      } = body;
      const approvedRoles = normalizeRoles(approved_roles, [target_role]);
      if (!approvedRoles.length || !approvedRoles.every(role => VALID_ROLES.includes(role)) || !approvedRoles.includes(target_role)) {
        return Response.json({ error: 'Invalid role' }, { status: 400 });
      }

      const targetUsers = await base44.asServiceRole.entities.User.filter({ id: target_user_id });
      const target = targetUsers[0] || {};
      if (target_user_id === user.id) {
        const currentRoles = getApprovedRoles(target);
        const addsNewRole = approvedRoles.some(role => !currentRoles.includes(role));
        if (addsNewRole) {
          return Response.json({ error: 'לא ניתן להוסיף לעצמך תפקיד חדש' }, { status: 400 });
        }
      }

      const cleanName = String(profile_full_name || '').trim();
      const cleanProfileEmail = normalizeEmail(profile_email || target.profile_email || target.email || '');
      const cleanOnboardingStatus = ['pending', 'awaiting_approval', 'approved', 'rejected'].includes(onboarding_status) ? onboarding_status : 'approved';
      const cleanStatus = ['active', 'pending', 'disabled', 'rejected'].includes(status) ? status : 'active';

      const updatedUser = await base44.asServiceRole.entities.User.update(target_user_id, {
        role: target_role,
        roles: approvedRoles,
        available_roles: approvedRoles,
        active_work_role: approvedRoles.includes(target.active_work_role) ? target.active_work_role : target_role,
        profile_full_name: cleanName,
        profile_email: cleanProfileEmail,
        profile_phone: profile_phone || '',
        profile_school_role: profile_school_role || '',
        profile_class_id: profile_class_id || '',
        profile_homeroom_class: profile_homeroom_class || '',
        profile_class: approvedRoles.includes('student') ? profile_homeroom_class || '' : target.profile_class || '',
        profile_grade_managed: profile_grade_managed || '',
        profile_division: approvedRoles.includes('division_manager') ? (profile_division || '') : '',
        profile_subject: profile_subject || '',
        onboarding_status: cleanOnboardingStatus,
        onboardingCompleted: cleanOnboardingStatus === 'approved',
        status: cleanStatus,
      });

      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: 'role_changed',
        actor_email: user.email,
        action_name: 'admin_update_user_role',
        target_email: body.target_email || '',
        details: `הרשאות משתמש עודכנו: ${approvedRoles.map(role => ROLE_LABELS[role] || role).join(', ')}`,
        metadata: JSON.stringify({ target_user_id, target_role, approvedRoles, profile_class_id, profile_homeroom_class, profile_grade_managed }),
        severity: 'warning',
      });

      return Response.json({ success: true, user: updatedUser });
    }

    if (action === 'get_pending') {
      if (!requireApprover(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const pending = await base44.asServiceRole.entities.ApprovalRequest.filter({ status: 'pending' });
      const visiblePending = requireAdmin(user) ? pending : pending.filter(item => item.request_type === 'class_change');
      const logs = await base44.asServiceRole.entities.ActivityLog.list('-created_date', 50);
      return Response.json({ pending: visiblePending, logs });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});