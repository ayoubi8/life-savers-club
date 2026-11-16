"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { createEvent } from "@/lib/events/actions";

const input =
  "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal outline-none focus:border-blue focus:ring-2 focus:ring-blue/20";

/** "New event" button + small dialog: title and date are enough to start (fast entry of old events). */
export function NewEvent() {
  const t = useTranslations("adminEvents");
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const date = String(data.get("date") ?? "");
    if (title.length < 2 || !date) return;
    // Noon local time keeps the date stable whatever the time zone.
    const startsAt = new Date(`${date}T12:00`).toISOString();
    startTransition(async () => {
      const result = await createEvent({ title, startsAt });
      if (!result.ok) {
        toast.error(t("failed"));
        return;
      }
      setOpen(false);
      router.push(`/admin/events/${result.id}/details`);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 self-start rounded-full bg-pink px-5 py-2.5 text-sm font-extrabold text-white shadow-glow hover:opacity-90 sm:self-auto"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t("new")}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
        aria-labelledby="new-event-title"
        className="m-auto w-[calc(100%-1.5rem)] max-w-md rounded-card border border-border bg-white p-0 shadow-soft backdrop:bg-black/40"
      >
        {open && (
          <form onSubmit={submit} className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 id="new-event-title" className="text-xl font-extrabold text-blue">
                {t("newDialog.title")}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("newDialog.cancel")}
                className="rounded-full p-1.5 text-grey hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-4 block text-xs font-bold text-grey">
              {t("newDialog.name")}
              <input name="title" required minLength={2} maxLength={140} autoFocus placeholder={t("newDialog.namePlaceholder")} className={input} />
            </label>
            <label className="mt-3 block text-xs font-bold text-grey">
              {t("newDialog.date")}
              <input name="date" type="date" required className={input} />
            </label>
            <p className="mt-3 text-xs text-muted-foreground">{t("newDialog.hint")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm font-bold text-grey hover:bg-muted">
                {t("newDialog.cancel")}
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-blue px-5 py-2 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-60"
              >
                {pending ? t("newDialog.creating") : t("newDialog.create")}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
