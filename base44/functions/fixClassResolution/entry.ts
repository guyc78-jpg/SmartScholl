import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';

function parseRoles(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try { const parsed = JSON.parse(text); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return text.split(',').map(role => role.trim()).filter(Boolean);
}

async function listAll(entity, sort = '-updated_date') {
  const rows = [];
  const pageSize = 5000;
  for (let skip = 0; ; skip += pageSize) {
    const page = await entity.list(sort, pageSize, skip);
    rows.push(...(page || []));
    if (!page || page.length < pageSize) return rows;
  }
}

// Maintenance: pin the homeroom class id on the current admin user's profile,
// so Exams/Schedule resolve the class deterministically (by id, not by name).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = user.role === 'admin' || user.role === 'system_admin' || await (async () => {
      const email = String(user.email || '').trim().toLowerCase();
      if (!email) return false;
      const approved = await base44.asServiceRole.entities.ApprovedUser.filter({ email }, '-created_date', 20).catch(() => []);
      return approved.some(record => record.isActive !== false && [record.role, ...parseRoles(record.roles)].includes('system_admin'));
    })();
    if (!isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    if (body.action === 'backfill_scope_grades') {
      const [classRooms, students] = await Promise.all([
        listAll(base44.asServiceRole.entities.ClassRoom),
        listAll(base44.asServiceRole.entities.Student),
      ]);
      const gradeByClassId = new Map(classRooms.map(classRoom => [classRoom.id, classRoom.grade || '']));
      const studentById = new Map(students.map(student => [student.id, student]));
      const entityNames = [
        'Announcement',
        'AnnouncementRead',
        'AttendanceRecord',
        'Communication',
        'CommunityServiceReport',
        'DisciplineEvent',
        'Exam',
        'ExamCompletion',
        'ExamGradeReport',
        'FamilySensitiveInfo',
        'ParentContact',
        'PerformanceReview',
        'ScheduleSlot',
        'ScheduledConversation',
        'SmartAlert',
        'Task',
        'TeacherNote',
        'TreatmentCase',
        'UrgentFlag',
      ];
      let updated = 0;
      const updatedByEntity = {};
      for (const entityName of entityNames) {
        const entity = base44.asServiceRole.entities[entityName];
        const rows = await listAll(entity);
        for (const row of rows) {
          const student = studentById.get(row.student_id);
          // Preserve an existing historical class assignment. Only entities
          // that never stored class_id are completed from the linked student.
          const classId = row.class_id || student?.class_id || '';
          const grade = gradeByClassId.get(classId) || row.grade || student?.grade || '';
          const patch = {};
          if (!row.class_id && classId) patch.class_id = classId;
          if (grade && row.grade !== grade) patch.grade = grade;
          if (entityName === 'FamilySensitiveInfo' && !row.owner_email && row.created_by) {
            patch.owner_email = String(row.created_by).trim().toLowerCase();
          }
          if (Object.keys(patch).length === 0) continue;
          await entity.update(row.id, patch);
          updated += 1;
          updatedByEntity[entityName] = (updatedByEntity[entityName] || 0) + 1;
        }
      }
      return Response.json({ ok: true, updated, updatedByEntity });
    }

    const className = user.profile_homeroom_class || user.profile_class || '';
    if (!className) {
      return Response.json({ error: 'No homeroom class set on profile' }, { status: 400 });
    }

    const normalize = (v) => String(v || '').replace(/[׳״'"\s]/g, '').trim();
    const classRooms = await base44.asServiceRole.entities.ClassRoom.list('-updated_date', 500);
    const match = classRooms.find(c => normalize(c.name) === normalize(className));

    if (!match) {
      return Response.json({ error: `ClassRoom not found for "${className}"` }, { status: 404 });
    }

    await base44.asServiceRole.entities.User.update(user.id, {
      profile_class_id: match.id,
      profile_homeroom_class_id: match.id,
    });

    return Response.json({ ok: true, class_id: match.id, class_name: match.name });
  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});
