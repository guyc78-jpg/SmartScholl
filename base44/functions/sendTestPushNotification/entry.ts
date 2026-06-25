import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!publicKey || !privateKey) return Response.json({ error: 'Push notifications are not configured' }, { status: 500 });

    const payload = await req.json().catch(() => ({}));
    const endpoint = payload?.endpoint;
    if (!endpoint) return Response.json({ error: 'Missing endpoint' }, { status: 400 });

    const rows = await base44.asServiceRole.entities.PushSubscription.filter({ endpoint });
    const subscriptionRecord = (rows || []).find(item => item.is_active !== false && item.user_id === user.id);
    if (!subscriptionRecord) return Response.json({ error: 'Subscription not found' }, { status: 404 });

    webpush.setVapidDetails('mailto:' + (user.email || 'admin@example.com'), publicKey, privateKey);

    const subscription = JSON.parse(subscriptionRecord.subscription_json);
    await webpush.sendNotification(subscription, JSON.stringify({
      title: 'פוש דמו ממערכת ניהול כיתת חינוך',
      body: 'אם קיבלת את ההודעה הזו — ההתראות עובדות במכשיר הזה.',
      url: '/push-notifications',
    }));

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});