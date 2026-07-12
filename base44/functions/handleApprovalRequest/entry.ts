import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';

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
const REQUEST_ROLES = ['homeroom_teacher', 'coordinator', 'student'];
const SYSTEM_ROLE_PRIORITY = ['system_admin', 'admin', 'division_manager', 'grade_coordinator', 'coordinator', 'homeroom_teacher', 'student', 'parent'];
const REVIEW_LEASE_MS = 5 * 60 * 1000;
const rateLimitBuckets = new Map<string, number[]>();

function rateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const recent = (rateLimitBuckets.get(key) || []).filter(timestamp => now - timestamp < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  rateLimitBuckets.set(key, recent);
  return true;
}

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

function normalizeScopeValue(value) {
  return String(value || '').replace(/[׳״'"\s]/g, '').trim();
}

function splitScopeValues(...values) {
  return [...new Set(values.flatMap(value => Array.isArray(value) ? value : String(value || '').split(','))
    .map(normalizeScopeValue)
    .filter(Boolean))];
}

function canReviewClassChange(user, request) {
  const roles = getApprovedRoles(user);
  if (roles.includes('admin') || roles.includes('system_admin')) return true;

  const requestedClassId = String(request?.requested_class_id || '');
  const currentClassId = String(request?.current_class_id || '');
  if (roles.includes('homeroom_teacher')) {
    const classIds = splitScopeValues(
      user?.profile_class_id,
      user?.profile_homeroom_class_id,
      user?.homeroomClassId
    );
    if (classIds.includes(requestedClassId) || classIds.includes(currentClassId)) return true;
  }

  if (roles.includes('grade_coordinator') || roles.includes('coordinator')) {
    const managedGrades = splitScopeValues(user?.profile_grade_managed, user?.gradeId);
    return managedGrades.includes(normalizeScopeValue(request?.requested_grade))
      || managedGrades.includes(normalizeScopeValue(request?.current_grade));
  }

  return false;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function mapToApprovedRole(role) {
  if (role === 'admin' || role === 'system_admin') return 'system_admin';
  if (role === 'coordinator' || role === 'grade_coordinator') return 'grade_coordinator';
  if (['homeroom_teacher', 'division_manager'].includes(role)) return role;
  return '';
}

function buildApprovedScope(role, { classId = '', grade = '', division = '' } = {}) {
  if (role === 'homeroom_teacher') return { classId };
  if (role === 'grade_coordinator') return { gradeId: normalizeScopeValue(grade) };
  if (role === 'division_manager') return { divisionType: division };
  return {};
}

function isValidApprovedScope(role, scope) {
  if (role === 'homeroom_teacher') return !!scope.classId;
  if (role === 'grade_coordinator') return !!scope.gradeId;
  if (role === 'division_manager') return ['upper', 'middle'].includes(scope.divisionType);
  return role === 'system_admin';
}

async function upsertApprovedUser(base44, { email, fullName, role, classId = '', grade = '', division = '', subject = '', isActive = true }) {
  const approvedRole = mapToApprovedRole(role);
  const scope = buildApprovedScope(approvedRole, { classId, grade, division });
  if (!approvedRole || !isValidApprovedScope(approvedRole, scope)) {
    throw new Error('Invalid approved role scope');
  }
  const normalizedEmail = normalizeEmail(email);
  const data = {
    fullName: String(fullName || normalizedEmail).trim(),
    email: normalizedEmail,
    role: approvedRole,
    roles: [approvedRole],
    primaryDisplayRole: approvedRole,
    scope,
    homeroomClassId: approvedRole === 'homeroom_teacher' ? classId : '',
    gradeId: approvedRole === 'grade_coordinator' ? scope.gradeId : '',
    divisionType: approvedRole === 'division_manager' ? scope.divisionType : '',
    teachingSubject: String(subject || '').trim().slice(0, 160),
    isActive,
  };
  const existing = await base44.asServiceRole.entities.ApprovedUser.filter({ email: normalizedEmail });
  return existing[0]
    ? base44.asServiceRole.entities.ApprovedUser.update(existing[0].id, data)
    : base44.asServiceRole.entities.ApprovedUser.create(data);
}

async function getVerifiedActor(base44, user) {
  if (['disabled', 'rejected'].includes(user.status)) return null;
  const email = normalizeEmail(user.email);
  const approved = await base44.asServiceRole.entities.ApprovedUser.filter({ email });
  const record = approved.find(item => item.isActive !== false);
  if (record) {
    const roles = normalizeRoles(record.roles, [record.role]);
    const role = roles.includes('system_admin') ? 'system_admin' : roles[0];
    const scope = record.scope || {};
    return {
      ...user,
      role,
      roles,
      available_roles: roles,
      profile_class_id: role === 'homeroom_teacher' ? scope.classId || record.homeroomClassId || '' : '',
      profile_homeroom_class_id: record.homeroomClassId || scope.homeroomClassId || scope.classId || '',
      homeroomClassId: record.homeroomClassId || scope.homeroomClassId || scope.classId || '',
      profile_grade_managed: role === 'grade_coordinator' ? scope.gradeId || record.gradeId || '' : '',
      gradeId: scope.gradeId || record.gradeId || '',
      profile_division: role === 'division_manager' ? scope.divisionType || record.divisionType || '' : '',
    };
  }

  const byUserEmail = await base44.asServiceRole.entities.Student.filter({ user_email: email });
  const byEmail = byUserEmail.length ? byUserEmail : await base44.asServiceRole.entities.Student.filter({ email });
  const student = byEmail.find(item => item.status !== 'סיים');
  if (!student) return null;
  return {
    ...user,
    role: 'student',
    roles: ['student'],
    available_roles: ['student'],
    student_id: student.id,
    profile_class_id: student.class_id || '',
    profile_grade_managed: student.grade || '',
  };
}

function reviewConflict(message = 'Request is already being reviewed') {
  const error = new Error(message);
  error.status = 409;
  return error;
}

function reviewErrorText(error) {
  return String(error?.message || 'Review failed').replace(/\s+/g, ' ').trim().slice(0, 500);
}

async function claimReview(base44, request, action, actorEmail) {
  if (!request?.id) throw reviewConflict('Request not found');
  if (!['approve', 'reject'].includes(action)) throw reviewConflict('Invalid review action');

  const now = new Date();
  const token = crypto.randomUUID();
  const patch = {
    status: 'processing',
    review_action: action,
    review_token: token,
    review_started_at: now.toISOString(),
    reviewed_by: normalizeEmail(actorEmail),
    review_error: '',
  };

  let query;
  if (request.status === 'pending') {
    if (request.review_action && request.review_action !== action) {
      throw reviewConflict(`Request recovery must continue with ${request.review_action}`);
    }
    query = { id: request.id, status: 'pending' };
  } else if (request.status === 'processing') {
    if (request.review_action && request.review_action !== action) {
      throw reviewConflict(`Request is already claimed for ${request.review_action}`);
    }
    const startedAt = new Date(request.review_started_at || 0).getTime();
    const leaseExpired = !Number.isFinite(startedAt) || now.getTime() - startedAt >= REVIEW_LEASE_MS;
    if (request.review_token && !leaseExpired) throw reviewConflict();
    query = {
      id: request.id,
      status: 'processing',
      review_action: request.review_action || action,
      review_token: request.review_token || '',
    };
  } else {
    throw reviewConflict('Request already reviewed');
  }

  const claimed = await base44.asServiceRole.entities.ApprovalRequest.updateMany(query, { $set: patch });
  if (claimed?.updated !== 1) throw reviewConflict();
  return { requestId: request.id, action, token, actorEmail: normalizeEmail(actorEmail) };
}

async function markReviewFailure(base44, claim, error) {
  if (!claim) return;
  await base44.asServiceRole.entities.ApprovalRequest.updateMany(
    { id: claim.requestId, status: 'processing', review_action: claim.action, review_token: claim.token },
    { $set: { status: 'pending', review_token: '', review_started_at: new Date().toISOString(), review_error: reviewErrorText(error) } },
  ).catch(() => {});
}

async function finalizeReview(base44, claim, status, extra = {}) {
  const completedAt = new Date().toISOString();
  const finalized = await base44.asServiceRole.entities.ApprovalRequest.updateMany(
    { id: claim.requestId, status: 'processing', review_action: claim.action, review_token: claim.token },
    { $set: {
      status,
      reviewed_by: claim.actorEmail,
      reviewed_at: completedAt,
      side_effects_completed_at: completedAt,
      review_token: '',
      review_error: '',
      ...extra,
    } },
  );
  if (finalized?.updated !== 1) throw reviewConflict('Review lease was lost before completion');
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
  let reviewFailureContext = null;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, request_id, rejection_reason } = body;
    if (!rateLimit(`${user.email || user.id || 'anonymous'}:${action || 'unknown'}`)) {
      return Response.json({ error: 'Too many requests' }, { status: 429 });
    }
    const verifiedActor = await getVerifiedActor(base44, user);

    if (action === 'update_student_profile') {
      if (verifiedActor?.role !== 'student') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const verifiedEmail = normalizeEmail(user.email);
      const candidateId = String(verifiedActor.student_id || user.authorization_student_id || '').trim();
      const [byId, byUserEmail, byEmail] = await Promise.all([
        candidateId ? base44.asServiceRole.entities.Student.filter({ id: candidateId }) : Promise.resolve([]),
        base44.asServiceRole.entities.Student.filter({ user_email: verifiedEmail }),
        base44.asServiceRole.entities.Student.filter({ email: verifiedEmail }),
      ]);
      const candidates = [...new Map([...byId, ...byUserEmail, ...byEmail].map(item => [item.id, item])).values()];
      const student = candidates.find(item => item.status !== '\u05e1\u05d9\u05d9\u05dd' && (
        item.id === candidateId
        || normalizeEmail(item.user_email) === verifiedEmail
        || normalizeEmail(item.email) === verifiedEmail
      ));
      if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

      const profile = body.profile && typeof body.profile === 'object' && !Array.isArray(body.profile) ? body.profile : {};
      const firstName = String(profile.firstName || '').replace(/\s+/g, ' ').trim();
      const lastName = String(profile.lastName || '').replace(/\s+/g, ' ').trim();
      const phone = String(profile.phone || '').trim();
      const address = String(profile.address || '').replace(/\s+/g, ' ').trim();
      const gender = String(profile.gender || '').trim();
      const photoUrl = String(profile.photo_url || '').trim();
      const requestedEmail = normalizeEmail(profile.email);

      if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80) {
        return Response.json({ error: 'Invalid student name' }, { status: 400 });
      }
      if (phone.length > 30 || (phone && !/^[+0-9()\-\s]+$/.test(phone))) {
        return Response.json({ error: 'Invalid phone number' }, { status: 400 });
      }
      if (address.length > 300 || !['\u05d6\u05db\u05e8', '\u05e0\u05e7\u05d1\u05d4'].includes(gender)) {
        return Response.json({ error: 'Invalid profile details' }, { status: 400 });
      }
      if (photoUrl) {
        try {
          const url = new URL(photoUrl);
          if (url.protocol !== 'https:' || url.username || url.password || photoUrl.length > 2048) throw new Error('invalid');
        } catch {
          return Response.json({ error: 'Invalid photo URL' }, { status: 400 });
        }
      }
      if (requestedEmail) {
        const currentStudentEmail = normalizeEmail(student.email);
        if (requestedEmail !== verifiedEmail || (currentStudentEmail && currentStudentEmail !== verifiedEmail)) {
          return Response.json({ error: 'Student email cannot be changed' }, { status: 400 });
        }
      }

      const fullName = `${firstName} ${lastName}`;
      const patch = {
        firstName,
        lastName,
        first_name: firstName,
        last_name: lastName,
        fullName,
        full_name: fullName,
        phone,
        address,
        gender,
        photo_url: photoUrl,
      };
      if (requestedEmail && !student.email) patch.email = requestedEmail;
      const saved = await base44.asServiceRole.entities.Student.update(student.id, patch);
      return Response.json({ student: saved });
    }

    if (action === 'submit') {
      const { full_name, requested_role, class_or_grade, class_id, subject, school_role, extra_roles } = body;
      const cleanFullName = String(full_name || '').trim().slice(0, 160);
      if (!REQUEST_ROLES.includes(requested_role) || cleanFullName.length < 2) {
        return Response.json({ error: 'Invalid role' }, { status: 400 });
      }

      const suspicionFlags = detectSuspicion({ full_name, requested_role, class_or_grade, subject, extra_roles });
      const isSuspicious = suspicionFlags.length >= 2;

      const approvalReq = await base44.asServiceRole.entities.ApprovalRequest.create({
        user_email: user.email,
        full_name: cleanFullName,
        requested_role,
        class_or_grade: String(class_or_grade || '').slice(0, 120),
        requested_class_id: String(class_id || '').slice(0, 120),
        subject: String(subject || '').slice(0, 160),
        school_role: String(school_role || '').slice(0, 160),
        extra_roles: String(extra_roles || '').slice(0, 300),
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
      if (verifiedActor?.role !== 'student' || !verifiedActor.student_id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const requestedClassId = String(body.requested_class_id || '').trim();
      const requestReason = String(body.request_reason || '').trim().slice(0, 1000);
      if (!requestedClassId || !requestReason) {
        return Response.json({ error: 'Missing class change details' }, { status: 400 });
      }

      const [studentRecords, classRecords] = await Promise.all([
        base44.asServiceRole.entities.Student.filter({ id: verifiedActor.student_id }),
        base44.asServiceRole.entities.ClassRoom.filter({ id: requestedClassId }),
      ]);
      const currentStudent = studentRecords.find(item => item.status !== 'סיים');
      const selectedClass = classRecords[0];
      if (!currentStudent) return Response.json({ error: 'Student not found' }, { status: 404 });
      if (!selectedClass || selectedClass.is_active === false) {
        return Response.json({ error: 'Class not found' }, { status: 400 });
      }
      if (currentStudent.class_id === selectedClass.id) {
        return Response.json({ error: 'Student is already assigned to this class' }, { status: 409 });
      }

      const pendingForUser = await base44.asServiceRole.entities.ApprovalRequest.filter({
        user_email: user.email,
        status: 'pending',
      });
      if (pendingForUser.some(item => item.request_type === 'class_change')) {
        return Response.json({ error: 'A class change request is already pending' }, { status: 409 });
      }

      const fullName = String(currentStudent.full_name || currentStudent.fullName
        || [currentStudent.firstName, currentStudent.lastName].filter(Boolean).join(' ')
        || user.full_name || user.email).trim();
      const currentClassId = currentStudent.class_id || '';
      const currentGrade = currentStudent.grade || '';
      const currentClass = currentStudent.class_name || '';

      const approvalReq = await base44.asServiceRole.entities.ApprovalRequest.create({
        user_email: user.email,
        full_name: fullName,
        request_type: 'class_change',
        requested_role: 'student',
        class_or_grade: selectedClass.name,
        current_class_id: currentClassId,
        current_grade: currentGrade,
        current_class: currentClass,
        requested_class_id: selectedClass.id,
        requested_grade: selectedClass.grade || '',
        requested_class: selectedClass.name,
        request_reason: requestReason,
        school_role: 'בקשת שינוי כיתה מפרופיל תלמיד/ה',
        status: 'pending',
        is_suspicious: false,
        notification_sent: false,
      });

      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: 'approval_request_submitted',
        actor_email: user.email,
        target_email: user.email,
        target_name: fullName,
        details: `בקשת שינוי כיתה: ${currentClass || 'לא הוגדר'} → ${selectedClass.name}`,
        metadata: JSON.stringify({ request_type: 'class_change', current_class_id: currentClassId, current_grade: currentGrade, current_class: currentClass, requested_class_id: selectedClass.id, requested_grade: selectedClass.grade, requested_class: selectedClass.name }),
        severity: 'info',
      });

      const approvedReviewers = await base44.asServiceRole.entities.ApprovedUser.list('fullName', 5000);
      const notificationScope = {
        current_class_id: currentClassId,
        current_grade: currentGrade,
        requested_class_id: selectedClass.id,
        requested_grade: selectedClass.grade,
      };
      const notifyEmails = new Set(approvedReviewers
        .filter(record => record.isActive !== false)
        .map(record => ({
          email: record.email,
          roles: normalizeRoles(record.roles, [record.role]),
          profile_class_id: record.scope?.classId || record.homeroomClassId || '',
          profile_homeroom_class_id: record.scope?.homeroomClassId || record.homeroomClassId || '',
          homeroomClassId: record.homeroomClassId || record.scope?.homeroomClassId || '',
          profile_grade_managed: record.scope?.gradeId || record.gradeId || '',
          gradeId: record.scope?.gradeId || record.gradeId || '',
        }))
        .filter(candidate => canReviewClassChange(candidate, notificationScope))
        .map(candidate => normalizeEmail(candidate.email))
        .filter(Boolean));
      const emailBody = `שלום,\n\nהתקבלה בקשת שינוי כיתה הדורשת אישור.\n\nשם: ${fullName}\nאימייל: ${user.email}\nכיתה נוכחית: ${currentClass || 'לא הוגדרה'}\nכיתה מבוקשת: ${selectedClass.name}\nסיבה: ${requestReason}\n\nלאישור או דחייה, היכנס/י לדף ניהול האישורים במערכת.\n\nבברכה,\nמערכת כיתה חכמה`;

      await Promise.all([...notifyEmails].map(email => base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `[כיתה חכמה] בקשת שינוי כיתה – ${fullName}`,
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
        if (!canReviewClassChange(verifiedActor, approvalReq)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      } else if (!requireAdmin(verifiedActor)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const targetUsers = await base44.asServiceRole.entities.User.filter({ email: approvalReq.user_email });
      const target = targetUsers[0];
      if (!target) return Response.json({ error: 'Target user not found' }, { status: 409 });
      if (approvalReq.request_type === 'class_change') {
        const [byUserEmail, byEmail, requestedClasses] = await Promise.all([
          base44.asServiceRole.entities.Student.filter({ user_email: approvalReq.user_email }),
          base44.asServiceRole.entities.Student.filter({ email: approvalReq.user_email }),
          base44.asServiceRole.entities.ClassRoom.filter({ id: approvalReq.requested_class_id || '' }),
        ]);
        const requestedClass = requestedClasses[0];
        if (!requestedClass || requestedClass.is_active === false) return Response.json({ error: 'Requested class is no longer active' }, { status: 409 });
        const students = [...new Map([...(byUserEmail || []), ...(byEmail || [])].map(student => [student.id, student])).values()]
          .filter(student => student.status !== 'סיים');
        if (!students.length) return Response.json({ error: 'Linked student not found' }, { status: 409 });
        const alreadyApplied = students.every(student => student.class_id === requestedClass.id);
        if (!alreadyApplied && approvalReq.current_class_id && students.some(student => student.class_id !== approvalReq.current_class_id)) {
          return Response.json({ error: 'Student class changed since this request was submitted' }, { status: 409 });
        }
        const nextClassId = requestedClass.id;
        const nextClassName = requestedClass.name;
        const nextGrade = requestedClass.grade || '';

        const claim = await claimReview(base44, approvalReq, 'approve', user.email);
        reviewFailureContext = { base44, claim };
        await Promise.all([
          base44.asServiceRole.entities.User.update(target.id, {
            profile_class_id: nextClassId,
            profile_class: nextClassName,
            profile_homeroom_class: nextClassName,
            profile_grade_managed: nextGrade,
            authorization_class_id: nextClassId,
            authorization_grade: nextGrade,
          }),
          ...students.map(student => base44.asServiceRole.entities.Student.update(student.id, {
            class_id: nextClassId,
            class_name: nextClassName,
            grade: nextGrade,
          })),
        ]);
      } else {
          let approvedRoles;
          let primaryRole;
          const classOrGrade = approvalReq.class_or_grade || '';
          const approvedGrade = classOrGrade.replace(/[׳״'"\d\s]/g, '');
          let approvedClassId = approvalReq.requested_class_id || approvalReq.current_class_id || '';
          let approvedClassName = classOrGrade;
          let approvedGradeValue = approvedGrade;
          let approvedStudentId = '';

          if (approvalReq.requested_role === 'student') {
            const [byUserEmail, byEmail, existingApprovals] = await Promise.all([
              base44.asServiceRole.entities.Student.filter({ user_email: approvalReq.user_email }),
              base44.asServiceRole.entities.Student.filter({ email: approvalReq.user_email }),
              base44.asServiceRole.entities.ApprovedUser.filter({ email: normalizeEmail(approvalReq.user_email) }),
            ]);
            if (existingApprovals.some(item => item.isActive !== false)) {
              return Response.json({ error: 'Existing staff authorization must be changed by an administrator' }, { status: 409 });
            }
            const linkedStudent = [...byUserEmail, ...byEmail].find(item => item.status !== 'סיים');
            if (!linkedStudent) return Response.json({ error: 'Linked student not found' }, { status: 409 });
            approvedRoles = ['student'];
            primaryRole = 'student';
            approvedClassId = linkedStudent.class_id || '';
            approvedClassName = linkedStudent.class_name || '';
            approvedGradeValue = linkedStudent.grade || '';
            approvedStudentId = linkedStudent.id;
            const claim = await claimReview(base44, approvalReq, 'approve', user.email);
            reviewFailureContext = { base44, claim };
          } else {
            const claim = await claimReview(base44, approvalReq, 'approve', user.email);
            reviewFailureContext = { base44, claim };
            const approvedRecord = await upsertApprovedUser(base44, {
              email: approvalReq.user_email,
              fullName: approvalReq.full_name,
              role: approvalReq.requested_role,
              classId: approvalReq.requested_class_id || '',
              grade: approvedGrade,
              subject: approvalReq.subject || '',
            });
            primaryRole = approvedRecord.role;
            approvedRoles = [primaryRole];
            approvedClassId = approvedRecord.scope?.classId || '';
            approvedGradeValue = approvedRecord.scope?.gradeId || '';
          }

          await base44.asServiceRole.entities.User.update(target.id, {
            role: primaryRole,
            roles: approvedRoles,
            available_roles: approvedRoles,
            active_work_role: approvedRoles.includes(target.active_work_role) ? target.active_work_role : primaryRole,
            onboarding_status: 'approved',
            profile_class_id: approvedClassId,
            profile_homeroom_class: approvedClassName,
            profile_class: approvalReq.requested_role === 'student' ? approvedClassName : '',
            profile_grade_managed: approvedGradeValue,
            authorization_class_id: approvedClassId,
            authorization_grade: approvedGradeValue,
            authorization_student_id: approvedStudentId,
            authorization_active: true,
          });
      }

      await finalizeReview(base44, reviewFailureContext.claim, 'approved');
      reviewFailureContext = null;

      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: 'approval_granted',
        actor_email: user.email,
        target_email: approvalReq.user_email,
        target_name: approvalReq.full_name,
        details: approvalReq.request_type === 'class_change'
          ? `אושר שינוי כיתה: ${approvalReq.current_class || 'לא הוגדר'} → ${approvalReq.requested_class || approvalReq.class_or_grade}`
          : `אושר לתפקיד: ${ROLE_LABELS[approvalReq.requested_role]}`,
        severity: 'info',
      }).catch(error => console.error('Approval audit log failed:', error));

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
        if (!canReviewClassChange(verifiedActor, approvalReq)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      } else if (!requireAdmin(verifiedActor)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const isSuspicious = approvalReq.is_suspicious;
      const cleanReason = String(rejection_reason || '').trim().slice(0, 1000);
      const claim = await claimReview(base44, approvalReq, 'reject', user.email);
      reviewFailureContext = { base44, claim };

      if (approvalReq.request_type !== 'class_change') {
        const targetUsers = await base44.asServiceRole.entities.User.filter({ email: approvalReq.user_email });
        if (targetUsers[0]) {
          await base44.asServiceRole.entities.User.update(targetUsers[0].id, { onboarding_status: 'rejected' });
        }
      }

      await finalizeReview(base44, claim, isSuspicious ? 'suspicious' : 'rejected', { rejection_reason: cleanReason });
      reviewFailureContext = null;

      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: isSuspicious ? 'suspicious_activity' : 'approval_rejected',
        actor_email: user.email,
        target_email: approvalReq.user_email,
        target_name: approvalReq.full_name,
        details: `נדחה${isSuspicious ? ' (חשוד)' : ''}: ${cleanReason || 'ללא סיבה'}`,
        metadata: JSON.stringify({ requested_role: approvalReq.requested_role, suspicious_notes: approvalReq.suspicious_notes }),
        severity: isSuspicious ? 'critical' : 'warning',
      }).catch(error => console.error('Rejection audit log failed:', error));

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: approvalReq.user_email,
        subject: '[כיתה חכמה] עדכון בנוגע לבקשתך',
        body: approvalReq.request_type === 'class_change'
          ? `שלום ${approvalReq.full_name},\n\nבקשת שינוי הכיתה שלך לא אושרה${cleanReason ? ': ' + cleanReason : '.'}\n\nבברכה,\nמערכת כיתה חכמה`
          : `שלום ${approvalReq.full_name},\n\nלצערנו, בקשתך לתפקיד ${ROLE_LABELS[approvalReq.requested_role]} לא אושרה${cleanReason ? ': ' + cleanReason : '.'}\n\nבברכה,\nמערכת כיתה חכמה`,
      }).catch(() => {});

      return Response.json({ success: true });
    }

    if (action === 'list_users') {
      if (!requireAdmin(verifiedActor)) return Response.json({ error: 'Forbidden' }, { status: 403 });
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
      if (!requireAdmin(verifiedActor)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { target_user_id } = body;
      if (!target_user_id) return Response.json({ error: 'Missing target_user_id' }, { status: 400 });
      if (target_user_id === user.id) return Response.json({ error: 'Cannot delete yourself' }, { status: 400 });

      const target = (await base44.asServiceRole.entities.User.filter({ id: target_user_id }))[0];
      if (!target) return Response.json({ error: 'Target user not found' }, { status: 404 });
      const targetEmail = normalizeEmail(target.email || target.profile_email);
      const [approvedRecords, staffRecords] = await Promise.all([
        targetEmail ? base44.asServiceRole.entities.ApprovedUser.filter({ email: targetEmail }) : Promise.resolve([]),
        targetEmail ? base44.asServiceRole.entities.ApprovedStaff.filter({ email: targetEmail }) : Promise.resolve([]),
      ]);
      if (approvedRecords.some(record => record.role === 'system_admin' && record.isActive !== false)) {
        const activeAdmins = (await base44.asServiceRole.entities.ApprovedUser.filter({ role: 'system_admin' }))
          .filter(record => record.isActive !== false);
        if (activeAdmins.length <= 1) {
          return Response.json({ error: 'Cannot delete the last active system administrator' }, { status: 409 });
        }
      }

      await Promise.all([
        ...approvedRecords.map(record => base44.asServiceRole.entities.ApprovedUser.update(record.id, { isActive: false })),
        ...staffRecords.map(record => base44.asServiceRole.entities.ApprovedStaff.update(record.id, { status: 'disabled' })),
      ]);
      await base44.asServiceRole.entities.User.delete(target_user_id);

      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: 'role_changed',
        actor_email: user.email,
        action_name: 'admin_delete_user',
        target_email: targetEmail,
        details: `נמחק משתמש מהמערכת: ${targetEmail || target_user_id}`,
        metadata: JSON.stringify({ target_user_id, target_email: targetEmail }),
        severity: 'critical',
      });

      return Response.json({ success: true });
    }

    if (action === 'list_approved_staff') {
      if (!requireAdmin(verifiedActor)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const staff = await base44.asServiceRole.entities.ApprovedStaff.list('-updated_date', 500);
      return Response.json({ staff });
    }

    if (action === 'save_approved_staff') {
      if (!requireAdmin(verifiedActor)) return Response.json({ error: 'Forbidden' }, { status: 403 });
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
      if (!requireAdmin(verifiedActor)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const staffList = Array.isArray(body.staff_list) ? body.staff_list : [];
      if (staffList.length > 1000) return Response.json({ error: 'Too many staff records' }, { status: 413 });
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
      if (!requireAdmin(verifiedActor)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const staff = (await base44.asServiceRole.entities.ApprovedStaff.filter({ id: body.staff_id }))[0];
      if (!staff) return Response.json({ error: 'Not found' }, { status: 404 });
      const approvals = await base44.asServiceRole.entities.ApprovedUser.filter({ email: normalizeEmail(staff.email) });
      await Promise.all(approvals.map(record => base44.asServiceRole.entities.ApprovedUser.update(record.id, { isActive: false })));
      await base44.asServiceRole.entities.ApprovedStaff.delete(staff.id);
      return Response.json({ success: true });
    }

    if (action === 'activate_approved_staff') {
      const email = normalizeEmail(user.email);
      const matches = await base44.asServiceRole.entities.ApprovedStaff.filter({ email });
      const staff = matches.find(item => item.status !== 'disabled');
      if (!staff) return Response.json({ found: false });

      const approvedRecord = await upsertApprovedUser(base44, {
        email,
        fullName: staff.full_name,
        role: staff.role,
        classId: staff.class_id || (staff.class_ids || [])[0] || '',
        grade: staff.grade || (staff.grades || [])[0] || '',
        subject: staff.subject || '',
      });
      const approvedScope = approvedRecord.scope || {};
      const updatedUser = await base44.asServiceRole.entities.User.update(user.id, {
        ...buildStaffUserUpdate(staff),
        role: approvedRecord.role,
        roles: [approvedRecord.role],
        available_roles: [approvedRecord.role],
        active_work_role: approvedRecord.role,
        authorization_class_id: approvedScope.classId || '',
        authorization_grade: approvedScope.gradeId || '',
        authorization_division: approvedScope.divisionType || '',
        authorization_active: true,
      });
      await base44.asServiceRole.entities.ApprovedStaff.update(staff.id, {
        status: 'active',
        activated_user_id: user.id,
        activated_at: new Date().toISOString(),
      });
      return Response.json({ found: true, user: updatedUser });
    }

    if (action === 'admin_update_user') {
      if (!requireAdmin(verifiedActor)) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const {
        target_user_id,
        target_role,
        profile_full_name,
        profile_email,
        profile_phone,
        profile_school_role,
        profile_extra_roles,
        profile_class_id,
        profile_homeroom_class,
        profile_grade_managed,
        profile_division,
        profile_subject,
        onboarding_status,
        status,
      } = body;
      if (!VALID_ROLES.includes(target_role) || target_role === 'parent') {
        return Response.json({ error: 'Invalid role' }, { status: 400 });
      }

      const targetUsers = await base44.asServiceRole.entities.User.filter({ id: target_user_id });
      const target = targetUsers[0];
      if (!target) return Response.json({ error: 'Target user not found' }, { status: 404 });
      const requestedCanonicalRole = target_role === 'student' ? 'student' : mapToApprovedRole(target_role);
      if (target_user_id === user.id && !getApprovedRoles(verifiedActor).includes(requestedCanonicalRole)) {
        return Response.json({ error: 'לא ניתן להוסיף לעצמך תפקיד חדש' }, { status: 400 });
      }
      const targetEmail = normalizeEmail(target.email || profile_email);
      let effectiveRole = target_role;
      let effectiveRoles = [target_role];
      let effectiveClassId = String(profile_class_id || '').trim();
      let effectiveClassName = String(profile_homeroom_class || '').trim();
      let effectiveGrade = normalizeScopeValue(profile_grade_managed || '');
      let effectiveDivision = String(profile_division || '').trim();
      let effectiveStudentId = '';

      if (target_role === 'student') {
        const [byUserEmail, byEmail, existingApprovals] = await Promise.all([
          base44.asServiceRole.entities.Student.filter({ user_email: targetEmail }),
          base44.asServiceRole.entities.Student.filter({ email: targetEmail }),
          base44.asServiceRole.entities.ApprovedUser.filter({ email: targetEmail }),
        ]);
        const linkedStudent = [...byUserEmail, ...byEmail].find(item => item.status !== 'סיים');
        if (!linkedStudent) return Response.json({ error: 'Linked student not found' }, { status: 409 });
        if (existingApprovals.some(record => record.role === 'system_admin' && record.isActive !== false)) {
          const activeAdmins = (await base44.asServiceRole.entities.ApprovedUser.filter({ role: 'system_admin' }))
            .filter(record => record.isActive !== false);
          if (activeAdmins.length <= 1) return Response.json({ error: 'Cannot remove the last active system administrator' }, { status: 409 });
        }

        let selectedClass = null;
        if (effectiveClassId) {
          selectedClass = (await base44.asServiceRole.entities.ClassRoom.filter({ id: effectiveClassId }))[0];
          if (!selectedClass || selectedClass.is_active === false) return Response.json({ error: 'Class not found' }, { status: 400 });
          await base44.asServiceRole.entities.Student.update(linkedStudent.id, {
            class_id: selectedClass.id,
            class_name: selectedClass.name,
            grade: selectedClass.grade,
          });
        }
        effectiveRole = 'student';
        effectiveRoles = ['student'];
        effectiveStudentId = linkedStudent.id;
        effectiveClassId = selectedClass?.id || linkedStudent.class_id || '';
        effectiveClassName = selectedClass?.name || linkedStudent.class_name || '';
        effectiveGrade = selectedClass?.grade || linkedStudent.grade || '';
        effectiveDivision = '';
        await Promise.all(existingApprovals.map(record => base44.asServiceRole.entities.ApprovedUser.update(record.id, { isActive: false })));
      } else {
        const approvedRecord = await upsertApprovedUser(base44, {
          email: targetEmail,
          fullName: profile_full_name || target.full_name || targetEmail,
          role: target_role,
          classId: effectiveClassId,
          grade: effectiveGrade,
          division: effectiveDivision,
          subject: profile_subject || '',
        });
        effectiveRole = approvedRecord.role;
        effectiveRoles = [effectiveRole];
        effectiveClassId = approvedRecord.scope?.classId || '';
        effectiveGrade = approvedRecord.scope?.gradeId || '';
        effectiveDivision = approvedRecord.scope?.divisionType || '';
      }
      const cleanName = String(profile_full_name || '').trim();
      const cleanProfileEmail = normalizeEmail(profile_email || target.profile_email || target.email || '');
      const cleanOnboardingStatus = ['pending', 'awaiting_approval', 'approved', 'rejected'].includes(onboarding_status) ? onboarding_status : 'approved';
      const cleanStatus = ['active', 'pending', 'disabled', 'rejected'].includes(status) ? status : 'active';

      const updatedUser = await base44.asServiceRole.entities.User.update(target_user_id, {
        role: effectiveRole,
        roles: effectiveRoles,
        available_roles: effectiveRoles,
        active_work_role: effectiveRoles.includes(target.active_work_role) ? target.active_work_role : effectiveRole,
        profile_full_name: cleanName,
        profile_email: cleanProfileEmail,
        profile_phone: profile_phone || '',
        profile_school_role: profile_school_role || '',
        profile_extra_roles: profile_extra_roles || '',
        profile_class_id: effectiveClassId,
        profile_homeroom_class: effectiveClassName,
        profile_class: effectiveRole === 'student' ? effectiveClassName : '',
        profile_grade_managed: effectiveGrade,
        profile_division: effectiveDivision,
        profile_subject: profile_subject || '',
        onboarding_status: cleanOnboardingStatus,
        onboardingCompleted: cleanOnboardingStatus === 'approved',
        status: cleanStatus,
        authorization_student_id: effectiveStudentId,
        authorization_class_id: effectiveClassId,
        authorization_grade: effectiveGrade,
        authorization_division: effectiveDivision,
        authorization_active: cleanStatus === 'active' && cleanOnboardingStatus === 'approved',
      });

      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: 'role_changed',
        actor_email: user.email,
        action_name: 'admin_update_user_role',
        target_email: body.target_email || '',
        details: `תפקיד ראשי ופרטי משתמש עודכנו: ${effectiveRoles.map(role => ROLE_LABELS[role] || role).join(', ')}`,
        metadata: JSON.stringify({ target_user_id, target_role: effectiveRole, approvedRoles: effectiveRoles, profile_extra_roles, profile_class_id: effectiveClassId, profile_homeroom_class: effectiveClassName, profile_grade_managed: effectiveGrade }),
        severity: 'warning',
      });

      return Response.json({ success: true, user: updatedUser });
    }

    if (action === 'get_pending') {
      if (!requireApprover(verifiedActor)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const [pendingRows, processingRows] = await Promise.all([
        base44.asServiceRole.entities.ApprovalRequest.filter({ status: 'pending' }),
        base44.asServiceRole.entities.ApprovalRequest.filter({ status: 'processing' }),
      ]);
      const staleProcessing = processingRows.filter(item => {
        const startedAt = new Date(item.review_started_at || 0).getTime();
        return !Number.isFinite(startedAt) || Date.now() - startedAt >= REVIEW_LEASE_MS;
      });
      const pending = [
        ...pendingRows,
        ...staleProcessing.map(item => ({ ...item, status: 'pending', recovery_status: 'processing' })),
      ];
      const visiblePending = requireAdmin(verifiedActor)
        ? pending
        : pending.filter(item => item.request_type === 'class_change' && canReviewClassChange(verifiedActor, item));
      const logs = requireAdmin(verifiedActor)
        ? await base44.asServiceRole.entities.ActivityLog.list('-created_date', 50)
        : [];
      return Response.json({ pending: visiblePending, logs });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    if (reviewFailureContext) {
      await markReviewFailure(reviewFailureContext.base44, reviewFailureContext.claim, error);
    }
    console.error('Function error:', error);
    const status = Number(error?.status);
    if (status >= 400 && status < 500) return Response.json({ error: error.message }, { status });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});
