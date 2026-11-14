"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, ChevronLeft, ChevronRight, Download, Inbox, Search, Trash, X } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { answerToText, type FormField } from "@/lib/forms/schema";
import { deleteResponses, setResponseStatus } from "@/lib/forms/response-actions";
import {
  filtersToParams,
  PAGE_SIZE,
  RESPONSE_STATUSES,
  type QuestionSummary,
  type ResponseRow,
  type ResponseStatus,
  type ResultsFilters,
} from "@/lib/forms/responses-query";
import { ResponseDrawer } from "./response-drawer";
import { ResultsSummary } from "./results-summary";
import { StatusChip } from "./status-chip";

const UNDO_MS = 6000;

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function ResultsPanel({
  formId,
  locale,
  fields,
  rows,
  total,
  truncated,
  filters,
  summary,
  openRow,
}: {
  formId: string;
  locale: string;
  fields: FormField[];
  rows: ResponseRow[];
  total: number;
  truncated: boolean;
  filters: ResultsFilters;
  summary: QuestionSummary[] | null;
  openRow: ResponseRow | null;
}) {
  const t = useTranslations("adminForms.results");
  const tUndo = useTranslations("adminForms");
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [qInput, setQInput] = useState(filters.q);
  const [, startTransition] = useTransition();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeletes = useRef(new Map<string, { ids: string[]; timer: ReturnType<typeof setTimeout> }>());

  const dateFormat = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const visibleRows = rows.filter((row) => !hidden.has(row.id));
  const selectedIds = visibleRows.filter((row) => selected.has(row.id)).map((row) => row.id);
  const columns = fields.slice(0, 4);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(filters.q || filters.status || filters.from || filters.to);

  const go = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(search.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      if (!("page" in patch) && !("r" in patch)) params.delete("page");
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [pathname, router, search],
  );

  const refresh = useCallback(() => router.refresh(), [router]);

  // Deletions are delayed so they can be undone; flush whatever is pending when leaving.
  useEffect(() => {
    const map = pendingDeletes.current;
    return () => {
      for (const { ids, timer } of map.values()) {
        clearTimeout(timer);
        void deleteResponses(ids);
      }
      map.clear();
    };
  }, []);

  function queueDelete(ids: string[]) {
    if (ids.length === 0) return;
    const key = ids.join(",");
    setHidden((current) => new Set([...current, ...ids]));
    setSelected(new Set());
    if (openRow && ids.includes(openRow.id)) go({ r: null });

    const timer = setTimeout(() => {
      pendingDeletes.current.delete(key);
      startTransition(async () => {
        const result = await deleteResponses(ids);
        if (!result.ok) {
          toast.error(t("failed"));
          setHidden((current) => new Set([...current].filter((id) => !ids.includes(id))));
        }
        router.refresh();
      });
    }, UNDO_MS);
    pendingDeletes.current.set(key, { ids, timer });

    toast(t("deleted", { count: ids.length }), {
      duration: UNDO_MS,
      action: {
        label: tUndo("undo"),
        onClick: () => {
          const entry = pendingDeletes.current.get(key);
          if (entry) clearTimeout(entry.timer);
          pendingDeletes.current.delete(key);
          setHidden((current) => new Set([...current].filter((id) => !ids.includes(id))));
        },
      },
    });
  }

  function bulkStatus(status: ResponseStatus) {
    const ids = selectedIds;
    startTransition(async () => {
      const result = await setResponseStatus(ids, status);
      if (result.ok) {
        toast.success(t("updated", { count: ids.length }));
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error(t("failed"));
      }
    });
  }

  function exportSelection() {
    const chosen = visibleRows.filter((row) => selected.has(row.id));
    const header = ["Submitted at", "Status", "Name", "Email", ...fields.map((f) => f.label || f.type), "Note"];
    const body = chosen.map((row) => [
      row.created_at,
      row.status,
      row.respondent_name ?? "",
      row.respondent_email ?? "",
      ...fields.map((field) => answerToText(row.answers[field.id], field)),
      row.review_note ?? "",
    ]);
    const csv = "﻿" + [header, ...body].map((line) => line.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "selection.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const exportParams = filtersToParams({ ...filters, view: "table", page: 1 });
  const exportHref = (format: "csv" | "xlsx") => {
    const params = new URLSearchParams(exportParams);
    params.set("format", format);
    return `/api/forms/${formId}/export?${params}`;
  };

  const viewHref = (view: "table" | "summary") => {
    const params = filtersToParams({ ...filters, view, page: 1 });
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  };

  const control =
    "rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20";

  const index = openRow ? visibleRows.findIndex((row) => row.id === openRow.id) : -1;
  const position =
    openRow && index >= 0
      ? {
          index,
          count: visibleRows.length,
          prevId: visibleRows[index - 1]?.id ?? null,
          nextId: visibleRows[index + 1]?.id ?? null,
        }
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-grey">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("count", { count: total })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" className="flex rounded-full border border-border bg-white p-1">
            {(["table", "summary"] as const).map((view) => (
              <Link
                key={view}
                role="tab"
                aria-selected={filters.view === view}
                href={viewHref(view)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-bold",
                  filters.view === view ? "bg-blue text-white" : "text-muted-foreground hover:text-grey",
                )}
              >
                {t(`view.${view}`)}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border bg-white p-1">
            <Download className="ml-2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <a href={exportHref("csv")} className="rounded-full px-3 py-1.5 text-xs font-bold text-grey hover:bg-muted">
              CSV
            </a>
            <a href={exportHref("xlsx")} className="rounded-full px-3 py-1.5 text-xs font-bold text-grey hover:bg-muted">
              Excel
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-card border border-border bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="relative min-w-0 flex-1 sm:min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={qInput}
            onChange={(event) => {
              const value = event.target.value;
              setQInput(value);
              if (debounce.current) clearTimeout(debounce.current);
              debounce.current = setTimeout(() => go({ q: value.trim() || null }), 400);
            }}
            placeholder={t("search")}
            aria-label={t("search")}
            className={cn(control, "w-full pl-9")}
          />
        </label>
        <select
          value={filters.status}
          onChange={(event) => go({ status: event.target.value || null })}
          aria-label={t("filterStatus")}
          className={control}
        >
          <option value="">{t("allStatuses")}</option>
          {RESPONSE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`status.${status}`)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          {t("from")}
          <input type="date" value={filters.from} onChange={(event) => go({ from: event.target.value || null })} className={control} />
        </label>
        <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          {t("to")}
          <input type="date" value={filters.to} onChange={(event) => go({ to: event.target.value || null })} className={control} />
        </label>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQInput("");
              go({ q: null, status: null, from: null, to: null });
            }}
            className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold text-pink hover:bg-pink/10"
          >
            <X className="h-3.5 w-3.5" />
            {t("clear")}
          </button>
        )}
      </div>

      {filters.view === "summary" && summary ? (
        <ResultsSummary summaries={summary} total={total} truncated={truncated} />
      ) : (
        <>
          {truncated && filters.q && (
            <p className="rounded-card border border-pink/30 bg-pink/5 p-3 text-xs text-grey">{t("searchTruncated")}</p>
          )}

          {selectedIds.length > 0 && (
            <div role="region" aria-label={t("bulk.label")} className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-card border border-blue/30 bg-white p-3 shadow-soft">
              <span className="text-sm font-bold text-blue">{t("bulk.selected", { count: selectedIds.length })}</span>
              <select
                value=""
                onChange={(event) => event.target.value && bulkStatus(event.target.value as ResponseStatus)}
                aria-label={t("bulk.markAs")}
                className={control}
              >
                <option value="">{t("bulk.markAs")}</option>
                {RESPONSE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`status.${status}`)}
                  </option>
                ))}
              </select>
              <button type="button" onClick={exportSelection} className="rounded-full border border-border px-4 py-2 text-xs font-bold text-grey hover:border-blue hover:text-blue">
                {t("bulk.export")}
              </button>
              <button type="button" onClick={() => queueDelete(selectedIds)} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-pink hover:bg-pink/10">
                <Trash className="h-3.5 w-3.5" />
                {t("delete")}
              </button>
              <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs font-bold text-muted-foreground hover:text-grey">
                {t("bulk.clear")}
              </button>
            </div>
          )}

          {visibleRows.length === 0 ? (
            <div className="flex flex-col items-center rounded-card border border-dashed border-border bg-white px-6 py-14 text-center">
              <Inbox className="h-10 w-10 text-blue/40" />
              <p className="mt-3 font-bold text-grey">{hasFilters ? t("noMatch") : t("empty")}</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hasFilters ? t("noMatchHint") : t("emptyHint")}</p>
            </div>
          ) : (
            <>
              {/* Phones: cards */}
              <ul className="space-y-2 md:hidden">
                {visibleRows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => go({ r: row.id })}
                      className="w-full rounded-card border border-border bg-white p-4 text-left hover:border-blue"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-bold text-grey">{row.respondent_name || row.respondent_email || "—"}</span>
                        <StatusChip status={row.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{dateFormat.format(new Date(row.created_at))}</p>
                      {columns[0] && (
                        <p className="mt-2 line-clamp-2 text-sm text-grey">{answerToText(row.answers[columns[0].id], columns[0]) || "—"}</p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>

              {/* Desktop: table */}
              <div className="hidden overflow-x-auto rounded-card border border-border bg-white md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={t("bulk.selectAll")}
                          checked={selectedIds.length === visibleRows.length && visibleRows.length > 0}
                          onChange={(event) =>
                            setSelected(event.target.checked ? new Set(visibleRows.map((row) => row.id)) : new Set())
                          }
                          className="h-4 w-4 accent-[var(--brand-blue)]"
                        />
                      </th>
                      <th className="px-4 py-3 font-bold">{t("columns.status")}</th>
                      <th className="whitespace-nowrap px-4 py-3 font-bold">{t("columns.submitted")}</th>
                      <th className="px-4 py-3 font-bold">{t("columns.respondent")}</th>
                      {columns.map((field) => (
                        <th key={field.id} className="max-w-[200px] truncate px-4 py-3 font-bold">
                          {field.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibleRows.map((row) => (
                      <tr
                        key={row.id}
                        className={cn("cursor-pointer align-top hover:bg-blue/5", row.status === "new" && "bg-pink/[0.03]")}
                        onClick={() => go({ r: row.id })}
                      >
                        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={t("bulk.select")}
                            checked={selected.has(row.id)}
                            onChange={(event) =>
                              setSelected((current) => {
                                const next = new Set(current);
                                if (event.target.checked) next.add(row.id);
                                else next.delete(row.id);
                                return next;
                              })
                            }
                            className="h-4 w-4 accent-[var(--brand-blue)]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip status={row.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            {dateFormat.format(new Date(row.created_at))}
                            {row.synced_to_sheet && <BadgeCheck className="h-3.5 w-3.5 text-green" aria-label={t("synced")} />}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs">
                          <span className="block font-semibold text-grey">{row.respondent_name || "—"}</span>
                          <span className="block text-muted-foreground">{row.respondent_email || ""}</span>
                        </td>
                        {columns.map((field) => {
                          const raw = row.answers[field.id];
                          const file = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as { name?: string }) : null;
                          const text = file ? file.name || t("drawer.file") : answerToText(raw, field);
                          return (
                            <td key={field.id} className="max-w-[220px] px-4 py-3 text-sm text-grey">
                              <span className="line-clamp-2 whitespace-pre-line" title={text}>
                                {text || "—"}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {pages > 1 && (
            <nav aria-label={t("pagination")} className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={filters.page <= 1}
                onClick={() => go({ page: String(filters.page - 1) })}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-grey hover:border-blue disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                {t("prev")}
              </button>
              <span className="text-xs text-muted-foreground">{t("page", { page: filters.page, pages })}</span>
              <button
                type="button"
                disabled={filters.page >= pages}
                onClick={() => go({ page: String(filters.page + 1) })}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-grey hover:border-blue disabled:opacity-40"
              >
                {t("next")}
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          )}
        </>
      )}

      {openRow && !hidden.has(openRow.id) && (
        <ResponseDrawer
          key={openRow.id}
          formId={formId}
          locale={locale}
          row={openRow}
          fields={fields}
          position={position}
          onClose={() => go({ r: null })}
          onNavigate={(id) => go({ r: id })}
          onDelete={queueDelete}
          onChanged={refresh}
        />
      )}
    </div>
  );
}
