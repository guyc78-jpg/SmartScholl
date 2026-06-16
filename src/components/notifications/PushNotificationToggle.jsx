import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
}

export default function PushNotificationToggle({ compact = false, iconOnly = false }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [endpoint, setEndpoint] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (!ok) return;

    navigator.serviceWorker.ready
      .then(registration => registration.pushManager.getSubscription())
      .then(subscription => {
        setEnabled(!!subscription);
        setEndpoint(subscription?.endpoint || '');
      })
      .catch(() => {});
  }, []);

  const enable = async () => {
    setBusy(true);
    setMessage('');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setMessage('ההתראות לא אושרו בדפדפן');
      setBusy(false);
      return;
    }

    const { data } = await base44.functions.invoke('getVapidPublicKey', {});
    const registration = await navigator.serviceWorker.register('/sw.js');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });

    await base44.functions.invoke('savePushSubscription', {
      subscription: subscription.toJSON(),
      enabled: true,
      userAgent: navigator.userAgent,
    });

    setEndpoint(subscription.endpoint);
    setEnabled(true);
    setMessage('ההתראות הופעלו');
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true);
    setMessage('');
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await base44.functions.invoke('savePushSubscription', {
        endpoint: subscription.endpoint,
        enabled: false,
      });
      await subscription.unsubscribe();
    }
    setEndpoint('');
    setEnabled(false);
    setMessage('ההתראות כובו');
    setBusy(false);
  };

  const sendTest = async () => {
    if (!endpoint) return;
    setBusy(true);
    setMessage('');
    await base44.functions.invoke('sendTestPushNotification', { endpoint });
    setMessage('נשלחה התראת בדיקה');
    setBusy(false);
  };

  if (!supported) return null;

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={enabled ? disable : enable}
        disabled={busy}
        aria-label={enabled ? 'התראות פעילות' : 'הפעל התראות'}
        className={cn(
          'w-11 h-11 flex items-center justify-center rounded-lg transition-colors disabled:opacity-60',
          enabled ? 'text-primary bg-primary/10' : 'text-foreground/70 hover:bg-muted active:bg-muted/80'
        )}
      >
        <Bell className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className={cn('w-full text-right space-y-1', compact && 'px-1')} dir="rtl">
      <button
        type="button"
        onClick={enabled ? disable : enable}
        disabled={busy}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-right disabled:opacity-60',
          enabled ? 'bg-primary/10 text-primary' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
        )}
      >
        <Bell className="w-4 h-4 flex-shrink-0" />
        <span className="text-[13px] flex-1 text-right">{busy ? 'מטפל בהתראות...' : enabled ? 'התראות פעילות' : 'הפעל התראות'}</span>
      </button>
      {enabled && (
        <button
          type="button"
          onClick={sendTest}
          disabled={busy}
          className="w-full text-[11px] text-right px-3 py-1 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 disabled:opacity-60"
        >
          שלח התראת בדיקה למכשיר הזה
        </button>
      )}
      {message && <p className="text-[11px] text-sidebar-foreground/55 px-3 text-right">{message}</p>}
    </div>
  );
}