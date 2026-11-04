'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

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
 * Accessible modal: labelled (aria-modal), closes on Escape / backdrop click, focuses the first
 * field (or itself) on open, traps Tab inside, and returns focus on close. Soft blurred backdrop;
 * gentle fade/scale that is skipped under Reduce Motion. Bottom sheet on phones unless `compact`.
 */
export function Dialog({
  title,
  description,
  onClose,
  children,
  compact,
  hideClose,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  /** Small centered card on every screen size (prompts / confirmations). */
  compact?: boolean;
  hideClose?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  // Keep the latest onClose without re-running the focus effect (callers pass inline functions).
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const box = ref.current;
    const focusables = () =>
      Array.from(
        box?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    const first = box?.querySelector<HTMLElement>('[autofocus], input, select, textarea');
    (first ?? box)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close.current();
      if (e.key !== 'Tab' || !box) return;
      const els = focusables();
      if (els.length === 0) return e.preventDefault();
      const [head, tail] = [els[0]!, els[els.length - 1]!];
      if (e.shiftKey && (document.activeElement === head || document.activeElement === box)) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/30 backdrop-blur-sm motion-safe:animate-[fade-in_160ms_ease-out] ${
        compact ? 'items-center p-4' : 'items-end sm:items-center sm:p-4'
      }`}
      onClick={onClose}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`max-h-[90dvh] w-full overflow-y-auto bg-surface shadow-xl ring-1 ring-line outline-none motion-safe:animate-[dialog-in_180ms_cubic-bezier(.22,1,.36,1)] ${
          compact
            ? 'max-w-sm rounded-2xl p-6'
            : 'rounded-t-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          {!hideClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-muted hover:text-fg"
            >
              ✕
            </button>
          )}
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
