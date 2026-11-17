"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * A small modal with one text field (new folder, rename, typed confirmation).
 * `onSubmit` returns an error message to show, or null to close.
 */
export function NameDialog({
  open,
  title,
  description,
  label,
  initialValue = "",
  submitLabel,
  danger,
  maxLength = 80,
  expected,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  label: string;
  initialValue?: string;
  submitLabel: string;
  danger?: boolean;
  maxLength?: number;
  /** When set, the button stays disabled until the field equals this text (case-insensitive). */
  expected?: string;
  onSubmit: (value: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const t = useTranslations("adminMedia");
  const ref = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setValue(initialValue);
      setError(null);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, initialValue]);

  const blocked = expected !== undefined && value.trim().toLowerCase() !== expected.toLowerCase();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || blocked || !value.trim()) return;
    setBusy(true);
    const message = await onSubmit(value.trim());
    setBusy(false);
    if (message) setError(message);
    else onClose();
  }

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-border bg-white p-0 text-foreground shadow-soft backdrop:bg-black/40"
    >
      <form onSubmit={submit} className="p-6">
        <h2 className="text-lg font-extrabold text-grey">{title}</h2>
        {description && <div className="mt-2 text-sm text-muted-foreground">{description}</div>}
        <label className="mt-4 block text-sm font-semibold text-grey">
          {label}
          <input
            autoFocus
            value={value}
            maxLength={maxLength}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-normal text-ink focus:border-blue focus:outline-none"
          />
        </label>
        {error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-pink">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-bold text-grey hover:bg-muted"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={busy || blocked || !value.trim()}
            className={`rounded-full px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 ${danger ? "bg-pink" : "bg-blue"}`}
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
