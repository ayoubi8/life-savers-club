"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** Red confirm button for destructive actions. */
  danger?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}

/** Branded replacement for window.confirm, built on the native <dialog> (focus trap + Esc for free). */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("adminForms.confirm");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      resolver.current?.(false);
      resolver.current = resolve;
      setOptions(opts);
    });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (options && dialog && !dialog.open) dialog.showModal();
  }, [options]);

  function finish(value: boolean) {
    dialogRef.current?.close();
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onCancel={(event) => {
          event.preventDefault();
          finish(false);
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) finish(false);
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-border bg-white p-0 text-foreground shadow-soft backdrop:bg-black/40"
      >
        {options && (
          <div className="p-6">
            <h2 id="confirm-title" className="text-lg font-extrabold text-grey">
              {options.title}
            </h2>
            {options.message && (
              <p id="confirm-message" className="mt-2 text-sm text-muted-foreground">
                {options.message}
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => finish(false)}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-bold text-grey hover:bg-muted"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => finish(true)}
                className={`rounded-full px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 ${
                  options.danger ? "bg-pink" : "bg-blue"
                }`}
              >
                {options.confirmLabel ?? t("confirm")}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}
