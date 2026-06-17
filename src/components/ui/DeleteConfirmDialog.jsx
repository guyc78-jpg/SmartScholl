import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

export default function DeleteConfirmDialog({ open, title, description, confirmLabel = 'מחק', cancelLabel = 'ביטול', onConfirm, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onCancel?.(); }}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-3xl border bg-card p-0 text-right shadow-2xl sm:rounded-3xl" dir="rtl">
        <div className="flex flex-col items-center gap-4 px-5 pb-5 pt-6 text-center" dir="rtl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
            <AlertTriangle className="h-7 w-7" strokeWidth={2.2} />
          </div>

          <div className="space-y-2 text-center">
            <DialogTitle className="text-center text-xl font-extrabold leading-snug text-foreground">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-center text-sm leading-relaxed text-muted-foreground">
                {description}
              </DialogDescription>
            )}
          </div>

          <div className="flex w-full flex-col gap-2 pt-1" dir="rtl">
            <Button type="button" variant="destructive" onClick={onConfirm} className="h-12 w-full rounded-2xl text-base font-bold">
              {confirmLabel}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="h-11 w-full rounded-2xl font-bold text-muted-foreground">
              {cancelLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}