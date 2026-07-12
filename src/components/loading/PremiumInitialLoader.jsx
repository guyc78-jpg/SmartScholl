import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookMarked, RefreshCw } from 'lucide-react';

const STATUS_PROGRESS = {
  'מכינים עבורך את סביבת העבודה': 18,
  'טוענים משתמש, הרשאות ושיוכים': 48,
  'הכול מוכן': 100,
};

const getPrefersReducedMotion = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

export default function PremiumInitialLoader({ status = 'מכינים עבורך את סביבת העבודה', error = '', onRetry, targetProgress, onComplete }) {
  const hasError = !!error;
  const target = useMemo(() => {
    if (hasError) return 100;
    if (typeof targetProgress === 'number') return Math.max(0, Math.min(100, targetProgress));
    return STATUS_PROGRESS[status] || 72;
  }, [hasError, status, targetProgress]);
  const [progress, setProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getPrefersReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(media.matches);
    updatePreference();
    media.addEventListener?.('change', updatePreference);
    return () => media.removeEventListener?.('change', updatePreference);
  }, []);

  useEffect(() => {
    if (hasError) return;
    setProgress(0);
  }, [hasError]);

  useEffect(() => {
    if (hasError) return;
    if (prefersReducedMotion) {
      setProgress(target);
      return;
    }
    const timer = window.setInterval(() => {
      setProgress(current => {
        const ceiling = target >= 100 ? 100 : Math.min(96, target + 18);
        if (current >= ceiling) return current;
        const gap = ceiling - current;
        const step = target >= 100 ? Math.max(8, gap * 0.65) : Math.max(1.8, Math.min(10, gap * 0.28));
        return Math.min(ceiling, current + step);
      });
    }, 50);
    return () => window.clearInterval(timer);
  }, [hasError, prefersReducedMotion, target]);

  const displayProgress = Math.round(progress);

  // ברגע שהפס הגיע ל-100% בפועל — מאותתים לאפליקציה שניתן לפתוח
  useEffect(() => {
    if (hasError || !onComplete) return;
    if (target >= 100 && progress >= 100) {
      const timer = window.setTimeout(() => onComplete(), 80);
      return () => window.clearTimeout(timer);
    }
  }, [hasError, onComplete, target, progress]);

  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center bg-background text-foreground"
      dir="rtl"
      aria-busy={!hasError}
      style={{
        paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
        paddingRight: 'max(1.5rem, env(safe-area-inset-right))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
      }}
    >
      <style>{`
        @keyframes loaderPulse { 0%,100% { transform: scale(.96); opacity:.72 } 50% { transform: scale(1.04); opacity:1 } }
        @keyframes loaderOrbit { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes loaderRise { 0% { transform: translateY(10px); opacity:0 } 100% { transform: translateY(0); opacity:1 } }
        @keyframes progressShine { 0% { transform: translateX(110%) } 100% { transform: translateX(-140%) } }
        @media (prefers-reduced-motion: reduce) {
          .premium-loader-motion { animation: none !important; transition: none !important; }
        }
      `}</style>
      <div className="premium-loader-motion flex min-h-[min(520px,100dvh)] w-full max-w-sm flex-col items-center justify-center gap-6 text-center" style={{ animation: 'loaderRise .55s ease-out both' }}>
        <div className="relative h-28 w-28 shrink-0">
          <div className={`premium-loader-motion absolute inset-0 rounded-[2rem] ${hasError ? 'bg-destructive/10' : 'bg-primary/10'}`} style={{ animation: hasError ? undefined : 'loaderPulse 2.4s ease-in-out infinite' }} />
          <div className={`absolute inset-3 rounded-[1.6rem] border bg-card shadow-sm ${hasError ? 'border-destructive/25' : 'border-primary/20'}`} />
          {!hasError && (
            <div className="premium-loader-motion absolute inset-0" style={{ animation: 'loaderOrbit 2.8s linear infinite' }} aria-hidden="true">
              <span className="absolute right-1 top-1 h-4 w-4 rounded-md bg-secondary shadow-sm" />
              <span className="absolute bottom-2 left-2 h-3 w-8 rounded-full bg-primary/70 shadow-sm" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ${hasError ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}>
              {hasError ? <AlertTriangle className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" /> : <BookMarked className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col items-center justify-center gap-2 text-center">
          <p className="text-center text-lg font-extrabold tracking-tight text-foreground">ניהול כיתת חינוך</p>
          <p
            className="min-h-5 max-w-xs text-center text-sm font-medium leading-relaxed text-muted-foreground"
            role={hasError ? 'alert' : 'status'}
            aria-live={hasError ? 'assertive' : 'polite'}
            aria-atomic="true"
          >
            {hasError ? 'טעינת המערכת נכשלה' : status}
          </p>
          {hasError && <p className="max-w-xs text-center text-sm leading-relaxed text-destructive">{error}</p>}
        </div>

        {hasError ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            נסה שוב
          </button>
        ) : (
          <div className="flex w-full max-w-[15rem] flex-col items-center justify-center gap-2 text-center" dir="rtl">
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-primary/10 ring-1 ring-primary/15"
              role="progressbar"
              aria-label="התקדמות טעינת המערכת"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={displayProgress}
            >
              <div
                className="premium-loader-motion relative h-full overflow-hidden rounded-full bg-primary shadow-sm transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              >
                <span className="premium-loader-motion absolute inset-y-0 right-0 w-2/3 bg-gradient-to-l from-transparent via-primary-foreground/35 to-transparent opacity-80" style={{ animation: 'progressShine 1.45s ease-in-out infinite' }} aria-hidden="true" />
              </div>
            </div>
            <p className="text-center text-[11px] font-bold tabular-nums text-primary" aria-hidden="true">{displayProgress}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
