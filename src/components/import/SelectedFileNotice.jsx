import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SelectedFileNotice({ fileName, onRemove, disabled = false }) {
  if (!fileName) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground" dir="rtl">
      <span className="inline-flex items-center gap-1 min-w-0">
        <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="font-medium text-foreground">קובץ נבחר:</span>
        <span className="truncate max-w-[16rem]">{fileName}</span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        onClick={onRemove}
        disabled={disabled}
      >
        <X className="w-3.5 h-3.5" />
        הסר קובץ
      </Button>
    </div>
  );
}