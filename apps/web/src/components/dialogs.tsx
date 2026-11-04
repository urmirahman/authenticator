'use client';

import { Button } from '@repo/ui/button';
import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import { Dialog, inputClass } from './ui';

/**
 * In-app replacements for window.prompt / confirm / alert, in Bloom style. Use the hook:
 *
 *   const { prompt, confirm, dialogs } = useDialogs();
 *   const name = await prompt({ title: 'New folder', placeholder: 'e.g. Work' });
 *   if (await confirm({ title: 'Delete?', danger: true })) ...
 *   return <>{...}{dialogs}</>;
 */

export interface PromptOptions {
  title: string;
  label?: string;
  description?: string;
  placeholder?: string;
  initial?: string;
  confirmLabel?: string;
  maxLength?: number;
  /** Return a gentle message to block submit (e.g. duplicate name), or null. */
  validate?: (value: string) => string | null;
  /** Optional extra destructive action shown under the buttons (e.g. "Delete folder"). */
  extraAction?: string;
}

export type PromptResult = string | null | { extra: true };

export function PromptDialog({
  title,
  label,
  description,
  placeholder,
  initial = '',
  confirmLabel = 'Save',
  maxLength = 40,
  validate,
  extraAction,
  onDone,
}: PromptOptions & { onDone: (v: PromptResult) => void }) {
  const [value, setValue] = useState(initial);
  const trimmed = value.trim();
  const problem = trimmed ? (validate?.(trimmed) ?? null) : null;
  const disabled = !trimmed || !!problem;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!disabled) onDone(trimmed);
  };

  return (
    <Dialog title={title} description={description} onClose={() => onDone(null)} compact hideClose>
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1">
          <span className="sr-only">{label ?? title}</span>
          <input
            autoFocus
            value={value}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            className={`${inputClass} rounded-xl py-2.5 text-base`}
            aria-invalid={!!problem}
            aria-describedby="prompt-hint"
          />
        </label>
        <p id="prompt-hint" aria-live="polite" className="min-h-4 text-xs text-muted">
          {problem ?? (value.length > maxLength - 10 ? `${value.length}/${maxLength}` : '')}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => onDone(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={disabled}>
            {confirmLabel}
          </Button>
        </div>
        {extraAction && (
          <Button type="button" variant="danger" onClick={() => onDone({ extra: true })}>
            {extraAction}
          </Button>
        )}
      </form>
    </Dialog>
  );
}

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive: the confirm button uses the danger style. */
  danger?: boolean;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  danger,
  onDone,
}: ConfirmOptions & { onDone: (ok: boolean) => void }) {
  return (
    <Dialog title={title} onClose={() => onDone(false)} compact hideClose>
      {message && <div className="mb-5 text-sm text-muted">{message}</div>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={() => onDone(false)}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          autoFocus
          variant={danger ? 'danger' : 'primary'}
          className={danger ? '!bg-danger !text-white hover:!opacity-90' : ''}
          onClick={() => onDone(true)}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

type Open =
  | { kind: 'prompt'; opts: PromptOptions; resolve: (v: PromptResult) => void }
  | { kind: 'confirm'; opts: ConfirmOptions; resolve: (v: boolean) => void };

/** Promise-based prompt/confirm; render `dialogs` somewhere in the component. */
export function useDialogs() {
  const [open, setOpen] = useState<Open | null>(null);

  const prompt = useCallback(
    (opts: PromptOptions) =>
      new Promise<PromptResult>((resolve) => setOpen({ kind: 'prompt', opts, resolve })),
    [],
  );
  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setOpen({ kind: 'confirm', opts, resolve })),
    [],
  );

  const dialogs = !open ? null : open.kind === 'prompt' ? (
    <PromptDialog
      {...open.opts}
      onDone={(v) => {
        setOpen(null);
        open.resolve(v);
      }}
    />
  ) : (
    <ConfirmDialog
      {...open.opts}
      onDone={(v) => {
        setOpen(null);
        open.resolve(v);
      }}
    />
  );

  return { prompt, confirm, dialogs };
}
