import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

function urlBase64ToUint8Array(value) {
  const cleanValue = String(value || '').trim().replace(/^['"]|['"]$/g, '').replace(/\s/g, '');
  const padding = '='.repeat((4 - cleanValue.length % 4) % 4);
  const base64 = (cleanValue + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const key = Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
  if (key.length !== 65) throw new Error('מפתח ההתראות שהוגדר במערכת אינו תקין');
  return key;
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
    const previousEndpoint = endpoint;
    setEnabled(true);
    setBusy(true);
    setMessage('');
    try {
      const permission = await withTimeout(Notification.requestPermission(), 15000, 'בקשת ההרשאה לא הושלמה');
      if (permission !== 'granted') throw new Error('ההתראות לא אושרו בדפדפן');

      const { data } = await withTimeout(base44.functions.invoke('getVapidPublicKey', {}), 15000, 'לא התקבל מפתח התראות');
      if (!data?.publicKey) throw new Error('מפתח ההתראות שהוגדר במערכת אינו תקין');
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
    } catch (error) {
      setEnabled(false);
      setEndpoint(previousEndpoint);
      setMessage(error?.message || 'לא ניתן להפעיל התראות');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    const previousEndpoint = endpoint;
    setEnabled(false);
    setEndpoint('');
    setBusy(true);
    setMessage('');
    try {
      const registration = await withTimeout(navigator.serviceWorker.ready, 15000, 'שירות ההתראות לא זמין');
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await withTimeout(base44.functions.invoke('savePushSubscription', {
          endpoint: subscription.endpoint,
          enabled: false,
        }), 15000, 'שמירת השינוי נכשלה');
        await subscription.unsubscribe();
      }
    } catch (error) {
      setEnabled(true);
      setEndpoint(previousEndpoint);
      setMessage(error?.message || 'לא ניתן לכבות התראות');
    } finally {
      setBusy(false);
    }
  };

  if (!supported) {
    if (!showUnsupported) return null;
    return (
      <div className="w-full rounded-lg px-3 py-2 text-right text-sidebar-foreground/60" dir="rtl">
        <div className="flex items-center gap-2.5 justify-start">
          <Bell className="w-4 h-4 flex-shrink-0" />
          <div className="min-w-0 flex-1 text-right">
            <p className="text-[13px] font-medium">התראות פוש</p>
            <p className="text-[11px] mt-0.5 leading-relaxed">לא זמינות בדפדפן הזה</p>
          </div>
          <span className="relative w-11 h-6 rounded-full bg-muted border border-border flex-shrink-0 opacity-70" aria-hidden="true">
            <span className="absolute top-0.5 start-[18px] w-5 h-5 rounded-full bg-card border border-border" />
          </span>
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
        role="switch"
        aria-checked={enabled}
        onClick={enabled ? disable : enable}
        disabled={busy}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-right disabled:opacity-60',
          enabled ? 'bg-primary/10 text-primary' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
        )}
      >
        <Bell className="w-4 h-4 flex-shrink-0" />
        <span className="text-[13px] flex-1 text-right font-medium">התראות פוש</span>
        <span
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors flex-shrink-0 border',
            enabled ? 'bg-primary border-primary/60' : 'bg-slate-300 border-slate-400/80 dark:bg-muted dark:border-border'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white border border-slate-300 shadow-sm transition-transform',
              enabled ? 'start-0.5' : 'start-[18px]'
            )}
          />
        </span>
      </button>
      {message && <p className="text-[11px] text-destructive px-3 text-right">{message}</p>}
    </div>
  );
}