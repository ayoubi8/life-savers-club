"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Paperclip, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { compressImage } from "@/lib/events/upload";
import { saveOperation } from "@/lib/finance/actions";
import type { LedgerRow } from "@/lib/finance/queries";
import {
  categoriesFor,
  formatDzd,
  lineTotal,
  MAX_LINES,
  MAX_RECEIPT_BYTES,
  parseAmount,
  RECEIPT_TYPES,
  type PaymentMethod,
} from "@/lib/finance/schema";
import { createClient } from "@/lib/supabase/client";
import { DialogActions, inputClass, labelClass, Modal, today, useFinanceError } from "../../ui";

type Draft = { product: string; quantity: string; unit_price: string };
const emptyLine = (): Draft => ({ product: "", quantity: "1", unit_price: "" });

/** Uploads a receipt (photos compressed) to the private bucket, under the sheet. */
async function uploadReceipt(sheetId: string, file: File) {
  if (!RECEIPT_TYPES.includes(file.type)) return { error: "receipt_type" as const };
  let blob: Blob = file;
  let ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1].replace("jpeg", "jpg");
  let type = file.type;
  if (file.type.startsWith("image/")) {
    const compressed = await compressImage(file);
    blob = compressed.blob;
    ext = compressed.ext;
    type = compressed.type;
  }
  if (blob.size > MAX_RECEIPT_BYTES) return { error: "receipt_too_large" as const };
  const path = `${sheetId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient().storage.from("finance-receipts").upload(path, blob, { contentType: type });
  return error ? { error: "failed" as const } : { path };
}

/**
 * Add or edit a purchase (one or more products) or an income. Totals are previewed here;
 * the database computes the saved ones.
 */
export function OperationDialog({
  open,
  onClose,
  sheetId,
  kind,
  row,
}: {
  open: boolean;
  onClose: () => void;
  sheetId: string;
  kind: "expense" | "income";
  row?: LedgerRow | null;
}) {
  const t = useTranslations("adminFinance");
  const locale = useLocale();
  const errorText = useFinanceError();
  const router = useRouter();
  const editing = !!row;

  const [date, setDate] = useState(row?.occurred_on ?? today());
  const [label, setLabel] = useState(row?.label ?? "");
  const [category, setCategory] = useState(row?.category ?? categoriesFor(kind)[0]);
  // No longer asked; values saved before are kept when an old operation is edited.
  const counterparty = row?.counterparty ?? "";
  const payment = (row?.payment_method as PaymentMethod | null) ?? null;
  const [note, setNote] = useState(row?.note ?? "");
  const [receipt, setReceipt] = useState<string | null>(row?.receipt_path ?? null);
  const [uploading, setUploading] = useState(false);
  const [lines, setLines] = useState<Draft[]>(
    row?.lines.length
      ? row.lines.map((line) => ({ product: line.product, quantity: String(line.quantity), unit_price: String(line.unit_price) }))
      : [emptyLine()],
  );
  const [amount, setAmount] = useState(row && kind === "income" ? String(row.amount) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = lines.map((line) => {
    const quantity = parseAmount(line.quantity, 3);
    const price = parseAmount(line.unit_price);
    return quantity && price !== null ? lineTotal(quantity, price) : null;
  });
  const sum = kind === "income" ? (parseAmount(amount) ?? 0) : totals.reduce<number>((total, value) => total + (value ?? 0), 0);

  function updateLine(index: number, change: Partial<Draft>) {
    setLines((list) => list.map((line, i) => (i === index ? { ...line, ...change } : line)));
  }

  async function attach(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const result = await uploadReceipt(sheetId, file);
    setUploading(false);
    if ("error" in result) return void toast.error(errorText(result.error ?? "failed"));
    setReceipt(result.path);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    let parsedLines: { product: string; quantity: number; unit_price: number }[];
    if (kind === "income") {
      const value = parseAmount(amount);
      if (value === null || value <= 0) return setError(errorText("invalid_amount"));
      parsedLines = [{ product: label.trim() || t(`categories.${category}`), quantity: 1, unit_price: value }];
    } else {
      parsedLines = [];
      for (const line of lines) {
        if (!line.product.trim() && !line.unit_price.trim()) continue; // empty spare line
        const quantity = parseAmount(line.quantity, 3);
        const price = parseAmount(line.unit_price);
        if (!line.product.trim() || !quantity || quantity <= 0 || price === null || price < 0) return setError(errorText("invalid_line"));
        parsedLines.push({ product: line.product.trim(), quantity, unit_price: price });
      }
      if (!parsedLines.length) return setError(errorText("invalid_line"));
    }

    setBusy(true);
    const result = await saveOperation({
      id: row?.id,
      sheet_id: sheetId,
      kind,
      occurred_on: date,
      category,
      label: label.trim() || parsedLines[0].product,
      counterparty,
      payment_method: payment,
      note,
      receipt_path: receipt,
      expected_updated_at: row?.updated_at,
      lines: parsedLines,
    });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result.error));
      if (result.error === "locked" || result.error === "stale") router.refresh();
      return;
    }
    toast.success(editing ? t("saved") : kind === "income" ? t("operation.incomeAdded") : t("operation.purchaseAdded"));
    onClose();
    router.refresh();
  }

  const title = editing ? t("operation.edit") : kind === "income" ? t("operation.addIncome") : t("operation.addPurchase");

  return (
    <Modal open={open} title={title} onClose={onClose} wide={kind === "expense"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {t("columns.date")}
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className={labelClass}>
            {kind === "income" ? t("operation.source") : t("columns.category")}
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClass} mt-1`}>
              {categoriesFor(kind).map((value) => (
                <option key={value} value={value}>
                  {t(`categories.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            {kind === "income" ? t("operation.incomeLabel") : t("operation.purchaseLabel")}
            <input
              value={label}
              maxLength={200}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={kind === "income" ? t("operation.incomePlaceholder") : t("operation.purchasePlaceholder")}
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>

        {kind === "income" ? (
          <label className={labelClass}>
            {t("columns.amount")}
            <input required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50 000" className={`${inputClass} mt-1`} />
          </label>
        ) : (
          <fieldset>
            <legend className={labelClass}>{t("operation.products")}</legend>
            <div className="mt-1 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="pb-1 font-semibold">{t("columns.product")}</th>
                    <th className="w-24 pb-1 font-semibold">{t("columns.quantity")}</th>
                    <th className="w-32 pb-1 font-semibold">{t("columns.unitPrice")}</th>
                    <th className="w-32 pb-1 text-right font-semibold">{t("columns.total")}</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index}>
                      <td className="py-1 pr-2">
                        <input aria-label={t("columns.product")} value={line.product} maxLength={200} onChange={(e) => updateLine(index, { product: e.target.value })} className={inputClass} />
                      </td>
                      <td className="py-1 pr-2">
                        <input aria-label={t("columns.quantity")} inputMode="decimal" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} className={inputClass} />
                      </td>
                      <td className="py-1 pr-2">
                        <input aria-label={t("columns.unitPrice")} inputMode="decimal" value={line.unit_price} onChange={(e) => updateLine(index, { unit_price: e.target.value })} className={inputClass} />
                      </td>
                      <td className="py-1 text-right font-semibold text-ink">{totals[index] === null ? "—" : formatDzd(totals[index]!, locale)}</td>
                      <td className="py-1 pl-1">
                        {lines.length > 1 && (
                          <button type="button" onClick={() => setLines((list) => list.filter((_, i) => i !== index))} aria-label={t("operation.removeLine")} className="rounded-full p-1 text-grey hover:text-pink">
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {lines.length < MAX_LINES && (
              <button type="button" onClick={() => setLines((list) => [...list, emptyLine()])} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-blue hover:underline">
                <Plus className="h-4 w-4" aria-hidden />
                {t("operation.addLine")}
              </button>
            )}
          </fieldset>
        )}

        <label className={labelClass}>
          {t("columns.note")}
          <textarea rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} mt-1`} />
        </label>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex cursor-pointer items-center gap-1.5 font-bold text-blue hover:underline">
            <Paperclip className="h-4 w-4" aria-hidden />
            {uploading ? t("operation.uploading") : receipt ? t("operation.replaceReceipt") : t("operation.attachReceipt")}
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" disabled={uploading} onChange={(e) => attach(e.target.files?.[0])} />
          </label>
          {receipt && (
            <>
              <span className="text-green">{t("operation.receiptAttached")}</span>
              <button type="button" onClick={() => setReceipt(null)} className="font-semibold text-grey hover:text-pink">
                {t("operation.removeReceipt")}
              </button>
            </>
          )}
        </div>

        <p className="flex items-baseline justify-between rounded-lg bg-muted px-4 py-3">
          <span className="text-sm font-bold text-grey">{t("columns.total")}</span>
          <span className={`text-lg font-extrabold ${kind === "income" ? "text-green" : "text-pink"}`}>{formatDzd(sum, locale)}</span>
        </p>

        {error && <p role="alert" className="text-sm font-semibold text-pink">{error}</p>}
        <DialogActions busy={busy || uploading} submitLabel={editing ? t("save") : t("operation.add")} onCancel={onClose} />
      </form>
    </Modal>
  );
}
