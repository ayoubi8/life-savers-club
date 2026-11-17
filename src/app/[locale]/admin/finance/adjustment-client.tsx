"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { cancelOperation } from "@/lib/finance/actions";
import { DialogActions, inputClass, labelClass, Modal, useFinanceError } from "./ui";

/** Cancel (never delete) an operation, with a reason. Used for adjustments and in sheets. */
export function CancelDialog({ id, open, onClose, onDone }: { id: string; open: boolean; onClose: () => void; onDone?: () => void }) {
  const t = useTranslations("adminFinance");
  const errorText = useFinanceError();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(form: FormData) {
    setBusy(true);
    const result = await cancelOperation(id, String(form.get("reason") ?? ""));
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result.error));
      if (result.error === "locked") router.refresh();
      return;
    }
    toast.success(t("operation.cancelled"));
    onClose();
    onDone?.();
    router.refresh();
  }

  return (
    <Modal open={open} title={t("operation.cancelTitle")} onClose={onClose}>
      <form action={submit} className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("operation.cancelHelp")}</p>
        <label className={labelClass}>
          {t("columns.reason")}
          <input name="reason" required minLength={3} maxLength={500} autoFocus className={`${inputClass} mt-1`} />
        </label>
        {error && <p role="alert" className="text-sm font-semibold text-pink">{error}</p>}
        <DialogActions busy={busy} danger submitLabel={t("operation.cancel")} onCancel={onClose} />
      </form>
    </Modal>
  );
}

export function CancelAdjustmentButton({ id }: { id: string }) {
  const t = useTranslations("adminFinance");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={t("operation.cancel")} title={t("operation.cancel")} className="rounded-full p-1.5 text-grey hover:bg-muted hover:text-pink">
        <Ban className="h-4 w-4" aria-hidden />
      </button>
      <CancelDialog id={id} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
