import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function cleanName(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function splitLegacyFullName(fullName) {
  const parts = cleanName(fullName).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function needsNameFix(student) {
  const fullName = cleanName(student.fullName || student.full_name || '');
  const first = cleanName(student.firstName ?? student.first_name ?? '');
  const last = cleanName(student.lastName ?? student.last_name ?? '');
  return fullName && (!first || !last || (first === fullName && last === fullName));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const students = await base44.asServiceRole.entities.Student.list('-updated_date', 1000);
    let updated = 0;
    let relatedUpdated = 0;
    const studentDisplayNames = new Map();

    for (const student of students || []) {
      const fullName = cleanName(student.fullName || student.full_name || '');
      const currentFirst = cleanName(student.firstName ?? student.first_name ?? '');
      const currentLast = cleanName(student.lastName ?? student.last_name ?? '');
      const { first, last } = needsNameFix(student)
        ? splitLegacyFullName(fullName)
        : { first: currentFirst, last: currentLast };

      if (!first || !last) continue;
      studentDisplayNames.set(student.id, `${last} ${first}`);

      if (!needsNameFix(student)) continue;
      await base44.asServiceRole.entities.Student.update(student.id, {
        firstName: first,
        lastName: last,
        first_name: first,
        last_name: last,
        fullName: `${first} ${last}`,
        full_name: `${first} ${last}`,
      });
      updated++;
    }

    const relatedEntities = [
      'AttendanceRecord',
      'DisciplineEvent',
      'Communication',
      'Task',
      'CommunityServiceReport',
      'ExamGradeReport',
      'PerformanceReview',
      'StudentAccommodation',
    ];

    for (const entityName of relatedEntities) {
      const rows = await base44.asServiceRole.entities[entityName].list('-updated_date', 1000);
      for (const row of rows || []) {
        const displayName = studentDisplayNames.get(row.student_id);
        if (!displayName || row.student_name === displayName) continue;
        await base44.asServiceRole.entities[entityName].update(row.id, { student_name: displayName });
        relatedUpdated++;
      }
    }

    return Response.json({ success: true, updated, relatedUpdated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});