"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Archive, ArchiveRestore, FilePlus2, Lock, LockOpen, Mail, MoreVertical, Pencil, Scale, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useConfirm } from "@/components/ui/confirm";
import { adjustBalance, openYear, setOpeningBalance, setShareEmail, setSheetArchived, setYearStatus, createSheet, updateSheet } from "@/lib/finance/actions";
import { formatDzd, parseAmount } from "@/lib/finance/schema";
import { DialogActions, inputClass, labelClass, Modal, primaryButton, secondaryButton, today, useFinanceError } from "./ui";

/** Admins: start the year with the money the club has now. */
export function OpenYearButton({ suggestedLabel }: { suggestedLabel: string }) {
  const t = useTranslations("adminFinance");
  const errorText = useFinanceError();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(form: FormData) {
    setBusy(true);
    const result = await openYear({
      label: String(form.get("label") ?? ""),
      openingBalance: String(form.get("opening") ?? ""),
      startsOn: String(form.get("startsOn") ?? ""),
    });
    setBusy(false);
    if (!result.ok) return setError(errorText(result.error));
    setOpen(false);
    toast.success(t("year.opened"));
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primaryButton}>
        <Wallet className="h-4 w-4" aria-hidden />
        {t("year.open")}
      </button>
      <Modal open={open} title={t("year.open")} onClose={() => setOpen(false)}>
        <form action={submit} className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("year.openHelp")}</p>
          <label className={labelClass}>
            {t("year.label")}
            <input name="label" required maxLength={40} defaultValue={suggestedLabel} className={`${inputClass} mt-1`} />
          </label>
          <label className={labelClass}>
            {t("year.openingBalance")}
            <input name="opening" required inputMode="decimal" placeholder="250 000" className={`${inputClass} mt-1`} />
          </label>
          <label className={labelClass}>
            {t("year.startsOn")}
            <input name="startsOn" type="date" required defaultValue={today()} className={`${inputClass} mt-1`} />
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-pink">{error}</p>}
          <DialogActions busy={busy} submitLabel={t("year.openConfirm")} onCancel={() => setOpen(false)} />
        </form>
      </Modal>
    </>
  );
}

/** Admins: adjust the balance, change the opening amount, close or reopen the year. */
export function YearAdminActions({ year }: { year: { id: string; label: string; status: "open" | "closed"; opening_balance: number } }) {
  const t = useTranslations("adminFinance");
  const locale = useLocale();
  const errorText = useFinanceError();
  const router = useRouter();
  const confirm = useConfirm();
  const [dialog, setDialog] = useState<"adjust" | "opening" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<"add" | "remove">("add");

  const close = () => {
    setDialog(null);
    setError(null);
  };

  async function adjust(form: FormData) {
    const amount = parseAmount(String(form.get("amount") ?? ""));
    if (!amount || amount <= 0) return setError(errorText("invalid_amount"));
    setBusy(true);
    const result = await adjustBalance({
      yearId: year.id,
      amount: String(direction === "add" ? amount : -amount),
      reason: String(form.get("reason") ?? ""),
      date: String(form.get("date") ?? today()),
    });
    setBusy(false);
    if (!result.ok) return setError(errorText(result.error));
    close();
    toast.success(t("year.adjusted"));
    router.refresh();
  }

  async function opening(form: FormData) {
    setBusy(true);
    const result = await setOpeningBalance(year.id, String(form.get("opening") ?? ""));
    setBusy(false);
    if (!result.ok) return setError(errorText(result.error));
    close();
    toast.success(t("saved"));
    router.refresh();
  }

  async function toggleStatus() {
    const closing = year.status === "open";
    const ok = await confirm({
      title: closing ? t("year.closeTitle", { label: year.label }) : t("year.reopenTitle", { label: year.label }),
      message: closing ? t("year.closeText") : t("year.reopenText"),
      confirmLabel: closing ? t("year.close") : t("year.reopen"),
      danger: closing,
    });
    if (!ok) return;
    const result = await setYearStatus(year.id, closing ? "closed" : "open");
    if (!result.ok) return void toast.error(errorText(result.error));
    toast.success(closing ? t("year.closed") : t("year.reopened"));
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {year.status === "open" && (
        <>
          <button type="button" onClick={() => setDialog("adjust")} className={secondaryButton}>
            <Scale className="h-4 w-4" aria-hidden />
            {t("year.adjust")}
          </button>
          <button type="button" onClick={() => setDialog("opening")} className={secondaryButton}>
            <Pencil className="h-4 w-4" aria-hidden />
            {t("year.editOpening")}
          </button>
        </>
      )}
      <button type="button" onClick={toggleStatus} className={secondaryButton}>
        {year.status === "open" ? <Lock className="h-4 w-4" aria-hidden /> : <LockOpen className="h-4 w-4" aria-hidden />}
        {year.status === "open" ? t("year.close") : t("year.reopen")}
      </button>

      <Modal open={dialog === "adjust"} title={t("year.adjust")} onClose={close}>
        <form action={adjust} className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("year.adjustHelp")}</p>
          <div role="radiogroup" aria-label={t("year.direction")} className="grid grid-cols-2 gap-2">
            {(["add", "remove"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={direction === value}
                onClick={() => setDirection(value)}
                className={`rounded-lg border px-3 py-2 text-sm font-bold ${direction === value ? "border-blue bg-blue/5 text-blue" : "border-border text-grey"}`}
              >
                {t(`year.${value}`)}
              </button>
            ))}
          </div>
          <label className={labelClass}>
            {t("columns.amount")}
            <input name="amount" required inputMode="decimal" className={`${inputClass} mt-1`} />
          </label>
          <label className={labelClass}>
            {t("columns.reason")}
            <input name="reason" required minLength={3} maxLength={500} placeholder={t("year.reasonPlaceholder")} className={`${inputClass} mt-1`} />
          </label>
          <label className={labelClass}>
            {t("columns.date")}
            <input name="date" type="date" required defaultValue={today()} className={`${inputClass} mt-1`} />
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-pink">{error}</p>}
          <DialogActions busy={busy} submitLabel={t("save")} onCancel={close} />
        </form>
      </Modal>

      <Modal open={dialog === "opening"} title={t("year.editOpening")} onClose={close}>
        <form action={opening} className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("year.openingHelp", { amount: formatDzd(year.opening_balance, locale) })}</p>
          <label className={labelClass}>
            {t("year.openingBalance")}
            <input name="opening" required inputMode="decimal" defaultValue={String(year.opening_balance)} className={`${inputClass} mt-1`} />
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-pink">{error}</p>}
          <DialogActions busy={busy} submitLabel={t("save")} onCancel={close} />
        </form>
      </Modal>
    </div>
  );
}

/** Any finance member: a new sheet with a free name. */
export function NewSheetButton({ yearId }: { yearId: string }) {
  const t = useTranslations("adminFinance");
  const errorText = useFinanceError();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(form: FormData) {
    setBusy(true);
    const result = await createSheet({ yearId, name: String(form.get("name") ?? ""), description: String(form.get("description") ?? "") });
    setBusy(false);
    if (!result.ok) return setError(errorText(result.error));
    setOpen(false);
    router.push(`/admin/finance/sheets/${result.id}`);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primaryButton}>
        <FilePlus2 className="h-4 w-4" aria-hidden />
        {t("sheets.new")}
      </button>
      <Modal open={open} title={t("sheets.new")} onClose={() => setOpen(false)}>
        <form action={submit} className="space-y-4">
          <label className={labelClass}>
            {t("sheets.name")}
            <input name="name" required maxLength={120} placeholder={t("sheets.namePlaceholder")} className={`${inputClass} mt-1`} />
          </label>
          <label className={labelClass}>
            {t("sheets.description")}
            <textarea name="description" rows={2} maxLength={1000} className={`${inputClass} mt-1`} />
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-pink">{error}</p>}
          <DialogActions busy={busy} submitLabel={t("sheets.create")} onCancel={() => setOpen(false)} />
        </form>
      </Modal>
    </>
  );
}

/** Rename / archive a sheet (its author or an admin). */
export function SheetMenu({ sheet }: { sheet: { id: string; name: string; description: string | null; archived: boolean } }) {
  const t = useTranslations("adminFinance");
  const errorText = useFinanceError();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rename(form: FormData) {
    setBusy(true);
    const result = await updateSheet(sheet.id, { name: String(form.get("name") ?? ""), description: String(form.get("description") ?? "") });
    setBusy(false);
    if (!result.ok) return setError(errorText(result.error));
    setEditing(false);
    toast.success(t("saved"));
    router.refresh();
  }

  async function archive() {
    setMenu(false);
    const result = await setSheetArchived(sheet.id, !sheet.archived);
    if (!result.ok) return void toast.error(errorText(result.error));
    toast.success(sheet.archived ? t("sheets.restored") : t("sheets.archived"));
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t("sheets.actions", { name: sheet.name })}
        aria-expanded={menu}
        onClick={() => setMenu((value) => !value)}
        className="rounded-full p-1.5 text-grey hover:bg-muted"
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>
      {menu && (
        <>
          <button type="button" aria-hidden tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} />
          <div role="menu" className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-soft">
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setMenu(false);
                setEditing(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-grey hover:bg-muted"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              {t("sheets.rename")}
            </button>
            <button role="menuitem" type="button" onClick={archive} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-grey hover:bg-muted">
              {sheet.archived ? <ArchiveRestore className="h-4 w-4" aria-hidden /> : <Archive className="h-4 w-4" aria-hidden />}
              {sheet.archived ? t("sheets.restore") : t("sheets.archive")}
            </button>
          </div>
        </>
      )}
      <Modal open={editing} title={t("sheets.rename")} onClose={() => setEditing(false)}>
        <form action={rename} className="space-y-4">
          <label className={labelClass}>
            {t("sheets.name")}
            <input name="name" required maxLength={120} defaultValue={sheet.name} className={`${inputClass} mt-1`} />
          </label>
          <label className={labelClass}>
            {t("sheets.description")}
            <textarea name="description" rows={2} maxLength={1000} defaultValue={sheet.description ?? ""} className={`${inputClass} mt-1`} />
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-pink">{error}</p>}
          <DialogActions busy={busy} submitLabel={t("save")} onCancel={() => setEditing(false)} />
        </form>
      </Modal>
    </div>
  );
}

/** Which Gmail opens the Google copies. */
export function ShareEmailSetting({ current, accountEmail }: { current: string | null; accountEmail: string }) {
  const t = useTranslations("adminFinance");
  const errorText = useFinanceError();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(form: FormData) {
    setBusy(true);
    const result = await setShareEmail(String(form.get("email") ?? ""));
    setBusy(false);
    if (!result.ok) return setError(errorText(result.error));
    setOpen(false);
    toast.success(t("saved"));
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Mail className="h-3.5 w-3.5" aria-hidden />
      {t.rich("google.opensWith", { email: current || accountEmail, b: (chunks) => <strong className="break-all text-grey">{chunks}</strong> })}
      <button type="button" onClick={() => setOpen(true)} className="font-bold text-blue hover:underline">
        {t("google.change")}
      </button>
      <Modal open={open} title={t("google.emailTitle")} onClose={() => setOpen(false)}>
        <form action={submit} className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("google.emailHelp")}</p>
          <label className={labelClass}>
            Gmail
            <input name="email" type="email" maxLength={320} defaultValue={current ?? ""} placeholder={accountEmail} className={`${inputClass} mt-1`} />
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-pink">{error}</p>}
          <DialogActions busy={busy} submitLabel={t("save")} onCancel={() => setOpen(false)} />
        </form>
      </Modal>
    </div>
  );
}
