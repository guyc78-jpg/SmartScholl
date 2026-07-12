self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'התראה חדשה';
  const options = {
    body: data.body || '',
    icon: '/app-icon.svg',
    badge: '/app-icon.svg',
    dir: 'rtl',
    lang: 'he',
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let targetUrl = '/';
  try {
    const requestedUrl = new URL(event.notification?.data?.url || '/', self.location.origin);
    if (requestedUrl.origin === self.location.origin) {
      targetUrl = `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`;
    }
  } catch {
    // Invalid or cross-origin destinations fall back to the app home page.
  }

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(targetUrl);
        return;
      }
    }
    if (clients.openWindow) await clients.openWindow(targetUrl);
  })());
});
