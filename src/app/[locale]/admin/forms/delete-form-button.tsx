"use client";

import { useTransition } from "react";
import { Trash } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm";
import { deleteForm } from "@/lib/forms/actions";

export function DeleteFormButton({
  id,
  locale,
  label,
  confirmText,
  showIcon = false,
}: {
  id: string;
  locale: string;
  label: string;
  confirmText: string;
  showIcon?: boolean;
}) {
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({ title: confirmText, confirmLabel: label, danger: true });
        if (!ok) return;
        const data = new FormData();
        data.set("id", id);
        data.set("locale", locale);
        startTransition(() => {
          void deleteForm(data);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-pink hover:bg-pink/10 disabled:opacity-60"
    >
      {showIcon && <Trash className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
