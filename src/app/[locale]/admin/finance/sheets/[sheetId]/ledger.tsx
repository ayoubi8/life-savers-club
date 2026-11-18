"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Ban, Check, ChevronDown, ChevronRight, Lock, Paperclip, Pencil, Plus, RotateCcw, ShoppingCart, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { restoreOperation, saveOperation } from "@/lib/finance/actions";
import type { LedgerRow } from "@/lib/finance/queries";
import { canEditOperation, categoriesFor, formatDzd, formatQuantity, lineTotal, parseAmount, timeLeft } from "@/lib/finance/schema";
import { cn } from "@/lib/utils";
import { CancelDialog } from "../../adjustment-client";
import { inputClass, primaryButton, secondaryButton, today, useFinanceError } from "../../ui";
import { OperationDialog } from "./operation-dialog";

type Viewer = { id: string; admin: boolean };
type Kind = "expense" | "income";
type Quick = { kind: Kind; date: string; label: string; category: string; quantity: string; price: string; note: string };

const cell = "border-b border-border px-2 py-1.5 align-middle";
const cellInput = "w-full rounded border border-border bg-white px-1.5 py-1 text-sm focus:border-blue focus:outline-none";

const freshQuick = (kind: Kind = "expense", date = today()): Quick => ({
  kind,
  date,
  label: "",
  category: categoriesFor(kind)[0],
  quantity: "1",
  price: "",
  note: "",
});

export function Ledger({
  sheetId,
  rows,
  people,
  viewer,
  writable,
}: {
  sheetId: string;
  rows: LedgerRow[];
  people: Record<string, string>;
  viewer: Viewer;
  /** Year open and sheet not archived. */
  writable: boolean;
}) {
  const t = useTranslations("adminFinance");
  const locale = useLocale();
  const errorText = useFinanceError();
  const router = useRouter();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Filters
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);

  // Editing
  const [dialog, setDialog] = useState<{ kind: Kind; row: LedgerRow | null } | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [inline, setInline] = useState<{ id: string; draft: Quick } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [quick, setQuick] = useState<Quick>(() => freshQuick());
  const [busy, setBusy] = useState(false);
  const quickLabel = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (showCancelled || !row.cancelled_at) &&
        (kind === "all" || row.kind === kind) &&
        (!category || row.category === category) &&
        (!term ||
          [row.label, row.counterparty ?? "", row.note ?? "", ...row.lines.map((line) => line.product)].some((text) =>
            text.toLowerCase().includes(term),
          )),
    );
  }, [rows, kind, category, search, showCancelled]);

  const totals = useMemo(() => {
    let received = 0;
    let spent = 0;
    for (const row of visible) {
      if (row.cancelled_at) continue;
      if (row.kind === "income") received += row.amount;
      if (row.kind === "expense") spent += row.amount;
    }
    return { received, spent };
  }, [visible]);

  const usedCategories = [...new Set(rows.map((row) => row.category))];

  function failed(code: string) {
    toast.error(errorText(code));
    if (code === "locked" || code === "stale") router.refresh();
  }

  /** Saves a single-product row (quick add or in-place edit). */
  async function saveSimple(draft: Quick, row?: LedgerRow) {
    const quantity = draft.kind === "income" ? 1 : parseAmount(draft.quantity, 3);
    const price = parseAmount(draft.price);
    if (!draft.label.trim()) return failed("label_required"), false;
    if (!quantity || quantity <= 0 || price === null || price < 0 || (draft.kind === "income" && price <= 0)) return failed("invalid_amount"), false;
    setBusy(true);
    const result = await saveOperation({
      id: row?.id,
      sheet_id: sheetId,
      kind: draft.kind,
      occurred_on: draft.date,
      category: draft.category,
      label: draft.label.trim(),
      counterparty: row?.counterparty ?? "",
      payment_method: (row?.payment_method as never) ?? null,
      note: draft.note,
      receipt_path: row?.receipt_path ?? null,
      expected_updated_at: row?.updated_at,
      lines: [{ product: draft.label.trim(), quantity, unit_price: price }],
    });
    setBusy(false);
    if (!result.ok) return failed(result.error), false;
    router.refresh();
    return true;
  }

  async function addQuick(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy) return;
    if (await saveSimple(quick)) {
      toast.success(quick.kind === "income" ? t("operation.incomeAdded") : t("operation.purchaseAdded"));
      setQuick(freshQuick(quick.kind, quick.date));
      quickLabel.current?.focus();
    }
  }

  function startInline(row: LedgerRow) {
    if (row.lines.length > 1 || row.kind === "adjustment") {
      setDialog({ kind: row.kind as Kind, row });
      return;
    }
    const line = row.lines[0];
    setInline({
      id: row.id,
      draft: {
        kind: row.kind as Kind,
        date: row.occurred_on,
        label: line?.product ?? row.label,
        category: row.category,
        quantity: String(line?.quantity ?? 1),
        price: String(line?.unit_price ?? row.amount),
        note: row.note ?? "",
      },
    });
  }

  async function saveInline() {
    if (!inline) return;
    const row = rows.find((item) => item.id === inline.id);
    if (row && (await saveSimple(inline.draft, row))) {
      toast.success(t("saved"));
      setInline(null);
    }
  }

  async function restore(id: string) {
    const result = await restoreOperation(id);
    if (!result.ok) return failed(result.error);
    toast.success(t("operation.restored"));
    router.refresh();
  }

  const keys = (onEnter: () => void, onEscape?: () => void) => (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !(event.target instanceof HTMLTextAreaElement)) {
      event.preventDefault();
      onEnter();
    }
    if (event.key === "Escape" && onEscape) {
      event.preventDefault();
      onEscape();
    }
  };

  const quickTotal = (() => {
    const quantity = quick.kind === "income" ? 1 : parseAmount(quick.quantity, 3);
    const price = parseAmount(quick.price);
    return quantity && price !== null ? lineTotal(quantity, price) : null;
  })();

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {writable && (
          <div data-tour="sheet.add" className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setDialog({ kind: "expense", row: null })} className={primaryButton}>
              <ShoppingCart className="h-4 w-4" aria-hidden />
              {t("operation.addPurchase")}
            </button>
            <button type="button" onClick={() => setDialog({ kind: "income", row: null })} className={cn(primaryButton, "bg-green")}>
              <Wallet className="h-4 w-4" aria-hidden />
              {t("operation.addIncome")}
            </button>
          </div>
        )}
        <div data-tour="sheet.filters" className="ml-auto flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="ledger-search">{t("filters.search")}</label>
          <input id="ledger-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("filters.search")} className={cn(inputClass, "w-44 py-1.5")} />
          <label className="sr-only" htmlFor="ledger-kind">{t("columns.type")}</label>
          <select id="ledger-kind" value={kind} onChange={(e) => setKind(e.target.value as "all" | Kind)} className={cn(inputClass, "w-auto py-1.5")}>
            <option value="all">{t("filters.allTypes")}</option>
            <option value="expense">{t("kinds.expense")}</option>
            <option value="income">{t("kinds.income")}</option>
          </select>
          <label className="sr-only" htmlFor="ledger-category">{t("columns.category")}</label>
          <select id="ledger-category" value={category} onChange={(e) => setCategory(e.target.value)} className={cn(inputClass, "w-auto py-1.5")}>
            <option value="">{t("filters.allCategories")}</option>
            {usedCategories.map((value) => (
              <option key={value} value={value}>
                {t(`categories.${value}`)}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1.5 text-sm font-semibold text-grey">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="h-4 w-4 accent-blue" />
            {t("filters.showCancelled")}
          </label>
        </div>
      </div>

      <div data-tour="sheet.table" className="overflow-x-auto rounded-card border border-border bg-white">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-2" />
              <th className="w-32 px-2 py-2">{t("columns.date")}</th>
              <th className="px-2 py-2">{t("columns.productLabel")}</th>
              <th className="w-36 px-2 py-2">{t("columns.category")}</th>
              <th className="w-20 px-2 py-2 text-right">{t("columns.quantity")}</th>
              <th className="w-28 px-2 py-2 text-right">{t("columns.unitPrice")}</th>
              <th className="w-28 px-2 py-2 text-right">{t("columns.total")}</th>
              <th className="w-40 px-2 py-2">{t("columns.note")}</th>
              <th className="w-32 px-2 py-2 text-right">{t("columns.balanceAfter")}</th>
              <th className="w-24 px-2 py-2">{t("columns.by")}</th>
              <th className="w-32 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {rows.length ? t("ledger.noMatch") : t("ledger.empty")}
                </td>
              </tr>
            )}
            {visible.map((row) => {
              const editable = canEditOperation(row, viewer, writable, now);
              const left = !viewer.admin && editable ? timeLeft(row.created_at, now) : null;
              const multi = row.lines.length > 1;
              const open = expanded.has(row.id);
              const sign = row.kind === "income" ? 1 : -1;
              const line = row.lines[0];

              if (inline?.id === row.id) {
                const draft = inline.draft;
                const set = (change: Partial<Quick>) => setInline({ id: row.id, draft: { ...draft, ...change } });
                const onKey = keys(saveInline, () => setInline(null));
                return (
                  <tr key={row.id} className="bg-blue/5" onKeyDown={onKey}>
                    <td className={cell} />
                    <td className={cell}>
                      <input type="date" aria-label={t("columns.date")} value={draft.date} onChange={(e) => set({ date: e.target.value })} className={cellInput} />
                    </td>
                    <td className={cell}>
                      <input autoFocus aria-label={t("columns.productLabel")} value={draft.label} maxLength={200} onChange={(e) => set({ label: e.target.value })} className={cellInput} />
                    </td>
                    <td className={cell}>
                      <select aria-label={t("columns.category")} value={draft.category} onChange={(e) => set({ category: e.target.value })} className={cellInput}>
                        {categoriesFor(draft.kind).map((value) => (
                          <option key={value} value={value}>
                            {t(`categories.${value}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={cell}>
                      {draft.kind === "expense" ? (
                        <input aria-label={t("columns.quantity")} inputMode="decimal" value={draft.quantity} onChange={(e) => set({ quantity: e.target.value })} className={cn(cellInput, "text-right")} />
                      ) : (
                        <span className="block text-right text-muted-foreground">1</span>
                      )}
                    </td>
                    <td className={cell}>
                      <input aria-label={t("columns.unitPrice")} inputMode="decimal" value={draft.price} onChange={(e) => set({ price: e.target.value })} className={cn(cellInput, "text-right")} />
                    </td>
                    <td className={cn(cell, "text-right font-semibold")}>
                      {(() => {
                        const q = draft.kind === "income" ? 1 : parseAmount(draft.quantity, 3);
                        const p = parseAmount(draft.price);
                        return q && p !== null ? formatDzd(lineTotal(q, p), locale) : "—";
                      })()}
                    </td>
                    <td className={cell}>
                      <input aria-label={t("columns.note")} value={draft.note} maxLength={2000} onChange={(e) => set({ note: e.target.value })} className={cellInput} />
                    </td>
                    <td className={cell} />
                    <td className={cell} />
                    <td className={cn(cell, "whitespace-nowrap text-right")}>
                      <button type="button" onClick={saveInline} disabled={busy} aria-label={t("save")} className="rounded-full p-1.5 text-green hover:bg-green/10">
                        <Check className="h-4 w-4" aria-hidden />
                      </button>
                      <button type="button" onClick={() => setInline(null)} aria-label={t("cancel")} className="rounded-full p-1.5 text-grey hover:bg-muted">
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                );
              }

              return (
                <Fragment key={row.id}>
                  <tr
                    className={cn("group hover:bg-muted/50", row.cancelled_at && "text-muted-foreground")}
                    onDoubleClick={() => editable && startInline(row)}
                  >
                    <td className={cn(cell, "text-center")}>
                      {multi && (
                        <button
                          type="button"
                          onClick={() => setExpanded((set) => (set.has(row.id) ? new Set([...set].filter((id) => id !== row.id)) : new Set(set).add(row.id)))}
                          aria-expanded={open}
                          aria-label={t("ledger.showProducts")}
                          className="rounded p-0.5 text-grey hover:bg-muted"
                        >
                          {open ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
                        </button>
                      )}
                    </td>
                    <td className={cn(cell, "whitespace-nowrap")}>{row.occurred_on}</td>
                    <td className={cell}>
                      <span className={cn("font-semibold text-ink", row.cancelled_at && "text-muted-foreground line-through")}>{row.label}</span>
                      <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase", row.kind === "income" ? "bg-green/10 text-green" : "bg-pink/10 text-pink")}>
                        {t(`kinds.${row.kind}`)}
                      </span>
                      {multi && <span className="ml-2 text-xs text-muted-foreground">{t("ledger.products", { count: row.lines.length })}</span>}
                      {row.cancelled_at && <p className="text-xs">{t("status.cancelledBecause", { reason: row.cancel_reason ?? "" })}</p>}
                    </td>
                    <td className={cell}>{t(`categories.${row.category}`)}</td>
                    <td className={cn(cell, "text-right")}>{multi ? "" : formatQuantity(line?.quantity ?? 1, locale)}</td>
                    <td className={cn(cell, "whitespace-nowrap text-right")}>{multi ? "" : formatDzd(line?.unit_price ?? row.amount, locale)}</td>
                    <td className={cn(cell, "whitespace-nowrap text-right font-bold", row.cancelled_at ? "line-through" : row.kind === "income" ? "text-green" : "text-pink")}>
                      {formatDzd(sign * row.amount, locale, { sign: true })}
                    </td>
                    <td className={cn(cell, "max-w-40 truncate")} title={row.note ?? ""}>{row.note}</td>
                    <td className={cn(cell, "whitespace-nowrap text-right font-semibold", row.balance_after < 0 ? "text-pink" : "text-ink")}>
                      {formatDzd(row.balance_after, locale)}
                    </td>
                    <td className={cn(cell, "truncate text-xs")}>{(row.created_by && people[row.created_by]) || ""}</td>
                    <td className={cn(cell, "whitespace-nowrap text-right")}>
                      {row.receipt_path && (
                        <a href={`/api/finance/receipt/${row.id}`} target="_blank" rel="noopener" aria-label={t("operation.viewReceipt")} title={t("operation.viewReceipt")} className="inline-flex rounded-full p-1.5 text-blue hover:bg-muted">
                          <Paperclip className="h-4 w-4" aria-hidden />
                        </a>
                      )}
                      {editable ? (
                        <>
                          {left && (
                            <span className="mr-1 text-[11px] font-semibold text-muted-foreground" title={t("ledger.editWindow")}>
                              {left.hours ? t("ledger.hoursLeft", { hours: left.hours }) : t("ledger.minutesLeft", { minutes: left.minutes })}
                            </span>
                          )}
                          {!row.cancelled_at && (
                            <>
                              <button type="button" onClick={() => startInline(row)} aria-label={t("operation.edit")} title={t("operation.edit")} className="inline-flex rounded-full p-1.5 text-grey hover:bg-muted">
                                <Pencil className="h-4 w-4" aria-hidden />
                              </button>
                              <button type="button" onClick={() => setCancelling(row.id)} aria-label={t("operation.cancel")} title={t("operation.cancel")} className="inline-flex rounded-full p-1.5 text-grey hover:bg-muted hover:text-pink">
                                <Ban className="h-4 w-4" aria-hidden />
                              </button>
                            </>
                          )}
                          {row.cancelled_at && viewer.admin && (
                            <button type="button" onClick={() => restore(row.id)} aria-label={t("operation.restore")} title={t("operation.restore")} className="inline-flex rounded-full p-1.5 text-grey hover:bg-muted">
                              <RotateCcw className="h-4 w-4" aria-hidden />
                            </button>
                          )}
                        </>
                      ) : (
                        writable && (
                          <span className="inline-flex p-1.5 text-muted-foreground" title={t("ledger.lockedHint")} aria-label={t("ledger.lockedHint")}>
                            <Lock className="h-4 w-4" aria-hidden />
                          </span>
                        )
                      )}
                    </td>
                  </tr>
                  {multi &&
                    open &&
                    row.lines.map((item) => (
                      <tr key={item.id} className="bg-muted/30 text-xs text-grey">
                        <td className={cell} />
                        <td className={cell} />
                        <td className={cn(cell, "pl-6")}>{item.product}</td>
                        <td className={cell} />
                        <td className={cn(cell, "text-right")}>{formatQuantity(item.quantity, locale)}</td>
                        <td className={cn(cell, "text-right")}>{formatDzd(item.unit_price, locale)}</td>
                        <td className={cn(cell, "text-right")}>{formatDzd(item.total, locale)}</td>
                        <td className={cell} colSpan={4} />
                      </tr>
                    ))}
                </Fragment>
              );
            })}

            {writable && (
              <tr
                data-tour="sheet.quick"
                className="bg-blue/[0.03]"
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  void addQuick();
                }}
              >
                <td className={cn(cell, "text-center text-blue")}>
                  <Plus className="mx-auto h-4 w-4" aria-hidden />
                </td>
                <td className={cell}>
                  <input type="date" aria-label={t("columns.date")} value={quick.date} onChange={(e) => setQuick({ ...quick, date: e.target.value })} className={cellInput} />
                </td>
                <td className={cell}>
                  <div className="flex gap-1">
                    <select
                      aria-label={t("columns.type")}
                      value={quick.kind}
                      onChange={(e) => setQuick(freshQuick(e.target.value as Kind, quick.date))}
                      className={cn(cellInput, "w-auto")}
                    >
                      <option value="expense">{t("kinds.expense")}</option>
                      <option value="income">{t("kinds.income")}</option>
                    </select>
                    <input
                      ref={quickLabel}
                      aria-label={t("columns.productLabel")}
                      value={quick.label}
                      maxLength={200}
                      onChange={(e) => setQuick({ ...quick, label: e.target.value })}
                      placeholder={quick.kind === "income" ? t("ledger.quickIncome") : t("ledger.quickProduct")}
                      className={cellInput}
                    />
                  </div>
                </td>
                <td className={cell}>
                  <select aria-label={t("columns.category")} value={quick.category} onChange={(e) => setQuick({ ...quick, category: e.target.value })} className={cellInput}>
                    {categoriesFor(quick.kind).map((value) => (
                      <option key={value} value={value}>
                        {t(`categories.${value}`)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={cell}>
                  {quick.kind === "expense" ? (
                    <input aria-label={t("columns.quantity")} inputMode="decimal" value={quick.quantity} onChange={(e) => setQuick({ ...quick, quantity: e.target.value })} className={cn(cellInput, "text-right")} />
                  ) : (
                    <span className="block text-right text-muted-foreground">1</span>
                  )}
                </td>
                <td className={cell}>
                  <input aria-label={quick.kind === "income" ? t("columns.amount") : t("columns.unitPrice")} inputMode="decimal" value={quick.price} onChange={(e) => setQuick({ ...quick, price: e.target.value })} placeholder="0" className={cn(cellInput, "text-right")} />
                </td>
                <td className={cn(cell, "whitespace-nowrap text-right font-semibold text-grey")}>{quickTotal === null ? "—" : formatDzd(quickTotal, locale)}</td>
                <td className={cell}>
                  <input aria-label={t("columns.note")} value={quick.note} maxLength={2000} onChange={(e) => setQuick({ ...quick, note: e.target.value })} className={cellInput} />
                </td>
                <td className={cell} colSpan={2} />
                <td className={cn(cell, "text-right")}>
                  <button type="button" onClick={() => void addQuick()} disabled={busy} className={cn(secondaryButton, "px-3 py-1")}>
                    {t("operation.add")}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-muted text-sm font-bold">
              <td colSpan={6} className="px-2 py-2 text-right text-grey">
                {t("ledger.totalsVisible")}
              </td>
              <td colSpan={5} className="px-2 py-2">
                <span className="mr-4 text-green">
                  {t("totals.received")} {formatDzd(totals.received, locale)}
                </span>
                <span className="mr-4 text-pink">
                  {t("totals.spent")} {formatDzd(totals.spent, locale)}
                </span>
                <span className="text-ink">
                  {t("totals.net")} {formatDzd(totals.received - totals.spent, locale, { sign: true })}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {writable && <p className="mt-2 text-xs text-muted-foreground">{viewer.admin ? t("ledger.helpAdmin") : t("ledger.helpMember")}</p>}

      {dialog && (
        <OperationDialog key={dialog.row?.id ?? dialog.kind} open sheetId={sheetId} kind={dialog.kind} row={dialog.row} onClose={() => setDialog(null)} />
      )}
      {cancelling && <CancelDialog id={cancelling} open onClose={() => setCancelling(null)} />}
    </div>
  );
}
