import { createElement, useCallback, useRef, useState } from 'react';
import DeleteConfirmDialog from '@/components/ui/DeleteConfirmDialog';

export default function useDeleteConfirm() {
  const resolverRef = useRef(null);
  const [options, setOptions] = useState(null);

  const close = useCallback((confirmed) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirmDelete = useCallback((nextOptions = {}) => {
    setOptions({
      title: 'למחוק את הפריט?',
      description: 'הפעולה תמחק את הפריט ולא ניתן יהיה לשחזר אותו.',
      confirmLabel: 'מחק',
      cancelLabel: 'ביטול',
      ...nextOptions,
    });
    return new Promise(resolve => { resolverRef.current = resolve; });
  }, []);

  const DeleteConfirm = useCallback(() => createElement(DeleteConfirmDialog, {
    open: !!options,
    title: options?.title,
    description: options?.description,
    confirmLabel: options?.confirmLabel,
    cancelLabel: options?.cancelLabel,
    onConfirm: () => close(true),
    onCancel: () => close(false),
  }), [options, close]);

  return { confirmDelete, DeleteConfirm };
}