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
  }, Object.create(null));
}

function parseRoles(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return text.split(',').map(role => role.trim()).filter(Boolean);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function filterAll(entity, filter, sort = 'created_date') {
  const rows = [];
  const pageSize = 5000;
  for (let skip = 0; ; skip += pageSize) {
    const page = await entity.filter(filter, sort, pageSize, skip);
    rows.push(...(page || []));
    if (!page || page.length < pageSize) return rows;
  }
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
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const roles = [...new Set([...parseRoles(user.roles), ...parseRoles(user.available_roles), user.role].filter(Boolean))];
    if (user?.is_service !== true && !roles.includes('admin') && !roles.includes('system_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = getVapidSubject();
    if (!publicKey || !privateKey || !vapidSubject) {
      return Response.json({ error: 'Push notifications are not configured' }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, publicKey, privateKey);

    const queueEntity = base44.asServiceRole.entities.PushNotificationQueue;
    const nowDate = new Date();
    const staleBefore = new Date(nowDate.getTime() - 10 * 60 * 1000).toISOString();
    const staleLeases = await filterAll(queueEntity, { status: 'processing' });
    await Promise.all(staleLeases
      .filter(item => !item.locked_at || item.locked_at < staleBefore)
      .map(item => queueEntity.update(item.id, { status: 'pending', lease_id: '', locked_at: '' })));

    const leaseId = crypto.randomUUID();
    const lockedAt = nowDate.toISOString();
    await queueEntity.updateMany(
      { status: 'pending' },
      { $set: { status: 'processing', lease_id: leaseId, locked_at: lockedAt } },
    );

    const [queueItems, subscriptions] = await Promise.all([
      filterAll(queueEntity, { status: 'processing', lease_id: leaseId }),
      filterAll(base44.asServiceRole.entities.PushSubscription, { is_active: true }),
    ]);

    const activeSubscriptionsByUser = groupBy(subscriptions || [], item => item.user_id || '');
    const itemsByUser = groupBy(queueItems || [], item => item.recipient_user_id || '');
    const now = nowDate.toISOString();
    let sentGroups = 0;
    let sentNotifications = 0;

    for (const [userId, items] of Object.entries(itemsByUser)) {
      if (!userId || !items.length) continue;
      const userSubscriptions = activeSubscriptionsByUser[userId] || [];
      if (!userSubscriptions.length) {
        await Promise.all(items.map(item => base44.asServiceRole.entities.PushNotificationQueue.update(item.id, {
          status: 'failed',
          sent_at: now,
          lease_id: '',
          locked_at: '',
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
          if (!isAllowedPushEndpoint(subscriptionRecord.endpoint)
              || subscription.endpoint !== subscriptionRecord.endpoint) {
            await base44.asServiceRole.entities.PushSubscription.update(subscriptionRecord.id, {
              is_active: false,
              last_seen_at: now,
            });
            continue;
          }
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
        lease_id: '',
        locked_at: '',
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
