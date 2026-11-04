'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Small app-only UI bits. Shared, cross-app components live in packages/ui. */

export const inputClass =
  'w-full rounded-lg bg-surface px-3 py-2 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-accent';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

/**
 * Accessible modal: labelled, closes on Escape / backdrop click, focuses itself on open and
 * returns focus to the previously focused element on close. Full-width sheet on phones.
 */
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without re-running the focus effect (callers pass inline functions).
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-xl bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl outline-none sm:max-w-md sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted hover:text-fg"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{children}</h1>
      {action}
    </div>
  );
}

/** Cozy inline notice (instead of alerts): soft tinted card, announced politely to screen readers. */
export function Notice({
  tone = 'info',
  children,
  onDismiss,
}: {
  tone?: 'info' | 'success' | 'error';
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const styles = {
    info: 'bg-accent-soft text-fg ring-accent/20',
    success: 'bg-accent-soft text-fg ring-success/30',
    error: 'bg-danger/10 text-fg ring-danger/30',
  }[tone];
  const icon = { info: '🌱', success: '✿', error: '⚠︎' }[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ring-1 ${styles}`}
    >
      <span aria-hidden className="mt-px">
        {icon}
      </span>
      <p className="flex-1 leading-relaxed">{children}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 rounded-md px-1 text-muted hover:text-fg"
        >
          ×
        </button>
      )}
    </div>
  );
}
