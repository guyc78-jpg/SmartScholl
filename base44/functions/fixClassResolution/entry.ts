import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
      return approved.some(record => record.isActive !== false && (record.role === 'system_admin' || String(record.roles || '').includes('system_admin')));
    })();
    if (!isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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

    await base44.auth.updateMe({
      profile_class_id: match.id,
      profile_homeroom_class_id: match.id,
    });

    return Response.json({ ok: true, class_id: match.id, class_name: match.name });
  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});