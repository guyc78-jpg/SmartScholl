import { AlertTriangle, BookMarked, RefreshCw } from 'lucide-react';

export default function PremiumInitialLoader({ status = 'מכינים עבורך את סביבת העבודה', error = '', onRetry }) {
  const hasError = !!error;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background text-foreground text-right" dir="rtl">
      <style>{`
        @keyframes loaderPulse { 0%,100% { transform: scale(.96); opacity:.72 } 50% { transform: scale(1.04); opacity:1 } }
        @keyframes loaderOrbit { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes loaderRise { 0% { transform: translateY(10px); opacity:0 } 100% { transform: translateY(0); opacity:1 } }
      `}</style>
      <div className="relative flex w-full max-w-sm flex-col items-center px-6 text-right">
        <div className="relative mb-7 h-28 w-28">
          <div className={`absolute inset-0 rounded-[2rem] ${hasError ? 'bg-destructive/10' : 'bg-primary/10'}`} style={{ animation: hasError ? undefined : 'loaderPulse 2.4s ease-in-out infinite' }} />
          <div className={`absolute inset-3 rounded-[1.6rem] border bg-card shadow-sm ${hasError ? 'border-destructive/25' : 'border-primary/20'}`} />
          {!hasError && (
            <div className="absolute inset-0" style={{ animation: 'loaderOrbit 2.8s linear infinite' }}>
              <span className="absolute right-1 top-1 h-4 w-4 rounded-md bg-secondary shadow-sm" />
              <span className="absolute bottom-2 left-2 h-3 w-8 rounded-full bg-primary/70 shadow-sm" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ${hasError ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}>
              {hasError ? <AlertTriangle className="h-7 w-7" strokeWidth={2.2} /> : <BookMarked className="h-7 w-7" strokeWidth={2.2} />}
            </div>
          </div>
        </div>

        <div className="w-full space-y-2 text-right" style={{ animation: 'loaderRise .55s ease-out both' }}>
          <p className="text-lg font-extrabold tracking-tight text-foreground">ניהול כיתת חינוך</p>
          <p className="text-sm font-medium text-muted-foreground">{hasError ? 'טעינת המערכת נכשלה' : status}</p>
          {hasError && <p className="max-w-xs text-sm text-destructive">{error}</p>}
        </div>

        {hasError ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            נסה שוב
          </button>
        ) : (
          <div className="mt-6 flex h-1.5 w-44 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 rounded-full bg-primary" style={{ animation: 'loaderPulse 1.2s ease-in-out infinite' }} />
          </div>
        )}
      </div>
    </div>
  );
}