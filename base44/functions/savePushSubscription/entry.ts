import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';

function isAllowedPushEndpoint(url: URL) {
  const host = url.hostname.toLowerCase();
  return url.protocol === 'https:'
    && !url.username
    && !url.password
    && (!url.port || url.port === '443')
    && (host === 'fcm.googleapis.com'
      || host === 'updates.push.services.mozilla.com'
      || host === 'web.push.apple.com'
      || host.endsWith('.notify.windows.com'));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const subscription = payload?.subscription;
    let endpoint = subscription?.endpoint || payload?.endpoint;
    if (!endpoint) return Response.json({ error: 'Missing subscription endpoint' }, { status: 400 });
    let endpointUrl;
    try {
      endpointUrl = new URL(String(endpoint));
    } catch {
      return Response.json({ error: 'Invalid subscription endpoint' }, { status: 400 });
    }
    if (!isAllowedPushEndpoint(endpointUrl) || String(endpoint).length > 2048) {
      return Response.json({ error: 'Invalid subscription endpoint' }, { status: 400 });
    }
    endpoint = endpointUrl.toString();
    if (subscription) subscription.endpoint = endpoint;

    const existing = await base44.asServiceRole.entities.PushSubscription.filter({ endpoint });
    const ownRecords = (existing || []).filter(item => item.user_id === user.id);

    if (payload?.enabled === false) {
      if (!ownRecords.length) return Response.json({ error: 'Subscription not found' }, { status: 404 });
      await Promise.all(ownRecords.map(item => base44.asServiceRole.entities.PushSubscription.update(item.id, {
        is_active: false,
        last_seen_at: new Date().toISOString(),
      })));
      return Response.json({ ok: true, active: false });
    }

    if (!subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return Response.json({ error: 'Invalid subscription payload' }, { status: 400 });
    }
    const subscriptionJson = JSON.stringify(subscription);
    if (subscriptionJson.length > 10_000) {
      return Response.json({ error: 'Subscription payload too large' }, { status: 413 });
    }

    const foreignRecord = (existing || []).find(item => item.user_id !== user.id);
    if (foreignRecord) {
      return Response.json({ error: 'Subscription belongs to another user' }, { status: 409 });
    }

    const data = {
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name || user.email || '',
      endpoint,
      subscription_json: subscriptionJson,
      user_agent: String(payload?.userAgent || '').slice(0, 500),
      is_active: true,
      last_seen_at: new Date().toISOString(),
    };

    if (ownRecords[0]) {
      await base44.asServiceRole.entities.PushSubscription.update(ownRecords[0].id, data);
      return Response.json({ ok: true, id: ownRecords[0].id, active: true });
    }

    const created = await base44.asServiceRole.entities.PushSubscription.create(data);
    return Response.json({ ok: true, id: created.id, active: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
