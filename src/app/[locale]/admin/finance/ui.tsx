"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Translates a finance error key, with a generic fallback. */
export function useFinanceError() {
  const t = useTranslations("adminFinance.errors");
  return (code: string) => (t.has(code) ? t(code) : t("failed"));
}

/** Modal built on the native <dialog> (focus trap and Esc for free). */
export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const t = useTranslations("adminFinance");
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-card border border-border bg-white p-0 text-foreground shadow-soft backdrop:bg-black/40",
        wide ? "max-w-3xl" : "max-w-md",
      )}
    >
      {open && (
        <div className="max-h-[85dvh] overflow-y-auto p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-lg font-extrabold text-grey">{title}</h2>
            <button type="button" onClick={onClose} aria-label={t("close")} className="rounded-full p-1 text-grey hover:bg-muted">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink focus:border-blue focus:outline-none disabled:bg-muted";
export const labelClass = "block text-sm font-semibold text-grey";
export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-blue px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50";
export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-grey hover:bg-muted disabled:opacity-50";

/** Footer of a dialog form: cancel + submit. */
export function DialogActions({ busy, submitLabel, onCancel, danger }: { busy: boolean; submitLabel: string; onCancel: () => void; danger?: boolean }) {
  const t = useTranslations("adminFinance");
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} disabled={busy} className={secondaryButton}>
        {t("cancel")}
      </button>
      <button type="submit" disabled={busy} className={cn(primaryButton, danger && "bg-pink")}>
        {submitLabel}
      </button>
    </div>
  );
}

export const today = () => new Date().toISOString().slice(0, 10);
