import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const subscription = payload?.subscription;
    const endpoint = subscription?.endpoint || payload?.endpoint;
    if (!endpoint) return Response.json({ error: 'Missing subscription endpoint' }, { status: 400 });

    const existing = await base44.asServiceRole.entities.PushSubscription.filter({ endpoint });

    if (payload?.enabled === false) {
      await Promise.all((existing || []).map(item => base44.asServiceRole.entities.PushSubscription.update(item.id, {
        is_active: false,
        last_seen_at: new Date().toISOString(),
      })));
      return Response.json({ ok: true, active: false });
    }

    const data = {
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name || user.email || '',
      endpoint,
      subscription_json: JSON.stringify(subscription),
      user_agent: payload?.userAgent || '',
      is_active: true,
      last_seen_at: new Date().toISOString(),
    };

    if (existing?.[0]) {
      await base44.asServiceRole.entities.PushSubscription.update(existing[0].id, data);
      return Response.json({ ok: true, id: existing[0].id, active: true });
    }

    const created = await base44.asServiceRole.entities.PushSubscription.create(data);
    return Response.json({ ok: true, id: created.id, active: true });
  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});