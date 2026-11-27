import React, { useEffect, useRef } from 'react';

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="ui-card p-6 text-center" role="alert">
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <button type="button" className="ui-btn-outline mt-4" onClick={onRetry}>
          重新加载
        </button>
      )}
    </div>
  );
}

export function InlineNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="font-medium underline" onClick={onRetry}>
          重试
        </button>
      )}
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmText = '确认', onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancelHandlerRef = useRef(onCancel);
  cancelHandlerRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelHandlerRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onMouseDown={event => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <div className="w-full max-w-sm rounded-xl bg-paper-card p-5 shadow-lift" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title" className="font-display text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button ref={cancelRef} type="button" className="ui-btn-outline" onClick={onCancel}>取消</button>
          <button type="button" className="ui-btn-primary bg-red-600 hover:bg-red-700" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
