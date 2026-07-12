import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';
import webpush from 'npm:web-push@3.6.7';

function isAllowedPushEndpoint(endpoint = '') {
  try {
    const url = new URL(String(endpoint));
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:'
      && !url.username
      && !url.password
      && (!url.port || url.port === '443')
      && (host === 'fcm.googleapis.com'
        || host === 'updates.push.services.mozilla.com'
        || host === 'web.push.apple.com'
        || host.endsWith('.notify.windows.com'));
  } catch {
    return false;
  }
}

function getVapidSubject() {
  const subject = (Deno.env.get('VAPID_SUBJECT') || '').trim();
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(subject)) return subject;
  try {
    const url = new URL(subject);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.toString();
  } catch {
    // Invalid or missing contact subject.
  }
  return '';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = getVapidSubject();
    if (!publicKey || !privateKey || !vapidSubject) {
      return Response.json({ error: 'Push notifications are not configured' }, { status: 500 });
    }

    const payload = await req.json().catch(() => ({}));
    const endpoint = payload?.endpoint;
    if (!endpoint) return Response.json({ error: 'Missing endpoint' }, { status: 400 });

    const rows = await base44.asServiceRole.entities.PushSubscription.filter({ endpoint });
    const subscriptionRecord = (rows || []).find(item => item.is_active !== false && item.user_id === user.id);
    if (!subscriptionRecord) return Response.json({ error: 'Subscription not found' }, { status: 404 });

    webpush.setVapidDetails(vapidSubject, publicKey, privateKey);

    const subscription = JSON.parse(subscriptionRecord.subscription_json);
    if (!isAllowedPushEndpoint(subscriptionRecord.endpoint)
        || subscription.endpoint !== subscriptionRecord.endpoint) {
      await base44.asServiceRole.entities.PushSubscription.update(subscriptionRecord.id, { is_active: false });
      return Response.json({ error: 'Invalid subscription endpoint' }, { status: 400 });
    }
    await webpush.sendNotification(subscription, JSON.stringify({
      title: 'פוש דמו ממערכת ניהול כיתת חינוך',
      body: 'אם קיבלת את ההודעה הזו — ההתראות עובדות במכשיר הזה.',
      url: '/push-notifications',
    }));

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
