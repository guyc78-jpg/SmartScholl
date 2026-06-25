import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import webpush from 'npm:web-push@3.6.7';

const EVENT_LABELS = {
  attendance_exception: 'חריג נוכחות',
  community_exception: 'מעורבות חברתית',
  parent_communication: 'שיחת הורים',
  discipline_event: 'משמעת',
  new_task: 'משימה',
  urgent_treatment: 'טיפול דחוף',
  conversation_reminder: 'תזכורת שיחה',
  exam_grade: 'ציון מבחן',
};

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildNotification(items) {
  if (items.length === 1) {
    const item = items[0];
    return { title: item.title, body: item.body, url: item.url || '/' };
  }

  const labels = unique(items.map(item => EVENT_LABELS[item.event_type] || item.title)).slice(0, 3);
  const students = unique(items.map(item => item.student_name)).slice(0, 2);
  const urls = unique(items.map(item => item.url));
  const bodyParts = [];
  if (students.length) bodyParts.push(students.join(', '));
  if (labels.length) bodyParts.push(labels.join(' · '));

  return {
    title: `יש ${items.length} עדכונים חשובים`,
    body: bodyParts.join(' — ') || 'נוספו עדכונים שמצריכים תשומת לב',
    url: urls.length === 1 ? urls[0] : '/',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuthenticated = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuthenticated) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!publicKey || !privateKey) return Response.json({ error: 'Push notifications are not configured' }, { status: 500 });

    webpush.setVapidDetails('mailto:notifications@example.com', publicKey, privateKey);

    const [queueItems, subscriptions] = await Promise.all([
      base44.asServiceRole.entities.PushNotificationQueue.filter({ status: 'pending' }, 'created_date', 500),
      base44.asServiceRole.entities.PushSubscription.filter({ is_active: true }),
    ]);

    const activeSubscriptionsByUser = groupBy(subscriptions || [], item => item.user_id || '');
    const itemsByUser = groupBy(queueItems || [], item => item.recipient_user_id || '');
    const now = new Date().toISOString();
    let sentGroups = 0;
    let sentNotifications = 0;

    for (const [userId, items] of Object.entries(itemsByUser)) {
      if (!userId || !items.length) continue;
      const userSubscriptions = activeSubscriptionsByUser[userId] || [];
      if (!userSubscriptions.length) {
        await Promise.all(items.map(item => base44.asServiceRole.entities.PushNotificationQueue.update(item.id, {
          status: 'failed',
          sent_at: now,
          error: 'אין מנוי פוש פעיל למשתמש',
        })));
        continue;
      }

      const notification = buildNotification(items);
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        url: notification.url,
      });

      let groupSent = false;
      for (const subscriptionRecord of userSubscriptions) {
        try {
          const subscription = JSON.parse(subscriptionRecord.subscription_json);
          await webpush.sendNotification(subscription, payload);
          groupSent = true;
          sentNotifications += 1;
        } catch (error) {
          const statusCode = error?.statusCode || error?.status;
          if (statusCode === 404 || statusCode === 410) {
            await base44.asServiceRole.entities.PushSubscription.update(subscriptionRecord.id, {
              is_active: false,
              last_seen_at: now,
            });
          }
        }
      }

      await Promise.all(items.map(item => base44.asServiceRole.entities.PushNotificationQueue.update(item.id, {
        status: groupSent ? 'sent' : 'failed',
        sent_at: now,
        error: groupSent ? '' : 'שליחת הפוש נכשלה בכל המכשירים',
      })));
      if (groupSent) sentGroups += 1;
    }

    return Response.json({ ok: true, groups: sentGroups, notifications: sentNotifications, queued: (queueItems || []).length });
  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});