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

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

export default function PushNotificationToggle({ compact = false, iconOnly = false, showUnsupported = false }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [endpoint, setEndpoint] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (!ok) return;

    navigator.serviceWorker.getRegistration('/sw.js')
      .then(registration => registration?.pushManager.getSubscription())
      .then(subscription => {
        setEnabled(!!subscription);
        setEndpoint(subscription?.endpoint || '');
      })
      .catch(() => {});
  }, []);

  const enable = async () => {
    setBusy(true);
    setMessage('');
    try {
      const permission = await withTimeout(Notification.requestPermission(), 15000, 'בקשת ההרשאה לא הושלמה');
      if (permission !== 'granted') {
        setMessage('ההתראות לא אושרו בדפדפן');
        return;
      }

      const { data } = await withTimeout(base44.functions.invoke('getVapidPublicKey', {}), 15000, 'לא התקבל מפתח התראות');
      const registration = await withTimeout(navigator.serviceWorker.register('/sw.js'), 15000, 'שירות ההתראות לא נטען');
      const subscription = await withTimeout(registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      }), 20000, 'יצירת המנוי להתראות לא הושלמה');

      await withTimeout(base44.functions.invoke('savePushSubscription', {
        subscription: subscription.toJSON(),
        enabled: true,
        userAgent: navigator.userAgent,
      }), 15000, 'שמירת המנוי לא הושלמה');

      setEndpoint(subscription.endpoint);
      setEnabled(true);
      setMessage('ההתראות הופעלו');
    } catch (error) {
      setMessage(error?.message || 'לא ניתן להפעיל התראות בדפדפן הזה');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setMessage('');
    try {
      const registration = await withTimeout(navigator.serviceWorker.ready, 15000, 'שירות ההתראות לא זמין');
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
    } catch (error) {
      setMessage(error?.message || 'לא ניתן לכבות התראות כרגע');
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    if (!endpoint) return;
    setBusy(true);
    setMessage('');
    try {
      await withTimeout(base44.functions.invoke('sendTestPushNotification', { endpoint }), 15000, 'שליחת הבדיקה לא הושלמה');
      setMessage('נשלחה התראת בדיקה');
    } catch (error) {
      setMessage(error?.message || 'לא ניתן לשלוח התראת בדיקה כרגע');
    } finally {
      setBusy(false);
    }
  };

  if (!supported) {
    if (!showUnsupported) return null;
    return (
      <div className="w-full rounded-xl border border-border bg-card p-3 text-right" dir="rtl">
        <div className="flex items-start gap-2.5 justify-start">
          <Bell className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="min-w-0 text-right">
            <p className="text-sm font-semibold text-foreground">התראות Push לא זמינות בדפדפן הזה</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              באייפון צריך לפתוח את האפליקציה מהמסך הראשי אחרי “הוסף למסך הבית”. במחשב מומלץ לבדוק דרך Chrome או Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

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