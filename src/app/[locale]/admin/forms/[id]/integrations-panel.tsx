"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { BadgeCheck, CircleAlert, ExternalLink, FileSpreadsheet, RefreshCw, Unplug } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm";
import { disconnectSheet, runSheetSync } from "@/lib/forms/actions";

export function IntegrationsPanel({
  formId,
  locale,
  sheetId,
  configured,
  notice,
  health,
}: {
  formId: string;
  locale: string;
  sheetId: string | null;
  configured: boolean;
  notice: "connected" | "error" | null;
  health: { pending: number; failed: number; notSynced: number; lastSyncedAt: string | null; lastError: string | null };
}) {
  const t = useTranslations("adminForms");
  const confirm = useConfirm();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, startSync] = useTransition();

  function sync(mode: "retry" | "pending" | "rebuild") {
    startSync(async () => {
      const result = await runSheetSync(formId, mode);
      if (result.ok) toast.success(t("integrations.syncDone", { count: result.synced }));
      else toast.error(t(result.error === "service_role_missing" ? "integrations.syncNoKey" : "integrations.syncFailed"));
      router.refresh();
    });
  }
  const healthy = health.failed === 0 && health.pending === 0 && health.notSynced === 0;
  const startUrl = `/api/integrations/google/start?formId=${encodeURIComponent(
    formId,
  )}&locale=${encodeURIComponent(locale)}`;

  return (
    <div className="max-w-3xl space-y-4">
      <h2 className="text-lg font-extrabold text-grey">{t("integrations.title")}</h2>

      {notice === "connected" && (
        <p className="rounded-card border border-green/30 bg-green/5 px-4 py-3 text-sm font-semibold text-green">
          {t("integrations.googleConnected")}
        </p>
      )}
      {notice === "error" && (
        <p className="rounded-card border border-pink/30 bg-pink/5 px-4 py-3 text-sm font-semibold text-pink">
          {t("integrations.googleError")}
        </p>
      )}

      <section data-tour="integrations.google" className="rounded-card border border-border bg-white p-5">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 text-green" />
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-grey">{t("integrations.googleTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("integrations.googleText")}
            </p>

            {!configured ? (
              <div className="mt-3 rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
                <p className="font-bold text-grey">{t("integrations.notConfigured")}</p>
                <p className="mt-1">{t("integrations.envHint")}</p>
              </div>
            ) : sheetId ? (
              <div className="mt-3 space-y-3">
                <p className="inline-flex items-center gap-2 rounded-full bg-green/10 px-3 py-1 text-xs font-bold text-green">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {t("integrations.connected")}
                </p>
                <div
                  role="status"
                  className={`rounded-xl border p-3 text-sm ${healthy ? "border-green/30 bg-green/5" : "border-pink/30 bg-pink/5"}`}
                >
                  <p className={`flex items-center gap-2 font-bold ${healthy ? "text-green" : "text-pink"}`}>
                    {healthy ? <BadgeCheck className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                    {healthy ? t("integrations.healthOk") : t("integrations.healthIssues")}
                  </p>
                  <ul className="mt-2 space-y-0.5 text-xs text-grey">
                    <li>
                      {t("integrations.lastSync", {
                        date: health.lastSyncedAt
                          ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(health.lastSyncedAt))
                          : t("integrations.never"),
                      })}
                    </li>
                    <li>{t("integrations.waiting", { count: health.pending })}</li>
                    <li>{t("integrations.failedCount", { count: health.failed })}</li>
                    <li>{t("integrations.notSyncedCount", { count: health.notSynced })}</li>
                  </ul>
                  {health.lastError && (
                    <p className="mt-2 break-words rounded-lg bg-white px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                      {health.lastError}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {health.failed + health.pending > 0 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => sync(health.failed > 0 ? "retry" : "pending")}
                        className="inline-flex items-center gap-2 rounded-full bg-blue px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
                        {t("integrations.retry")}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        const ok = await confirm({
                          title: t("integrations.rebuildConfirm"),
                          message: t("integrations.rebuildText"),
                          confirmLabel: t("integrations.rebuild"),
                          danger: true,
                        });
                        if (ok) sync("rebuild");
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-grey hover:border-blue hover:text-blue disabled:opacity-60"
                    >
                      {t("integrations.rebuild")}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-blue px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t("integrations.openSheet")}
                  </a>
                  <a
                    href={startUrl}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-grey hover:border-blue hover:text-blue"
                  >
                    {t("integrations.replace")}
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: t("integrations.disconnectConfirm"),
                        confirmLabel: t("integrations.disconnect"),
                        danger: true,
                      });
                      if (!ok) return;
                      const data = new FormData();
                      data.set("formId", formId);
                      data.set("locale", locale);
                      startTransition(() => {
                        void disconnectSheet(data);
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:border-pink hover:text-pink"
                  >
                    <Unplug className="h-3.5 w-3.5" />
                    {t("integrations.disconnect")}
                  </button>
                </div>
              </div>
            ) : (
              <a
                href={startUrl}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue px-4 py-2 text-xs font-bold text-white hover:opacity-90"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {t("integrations.connect")}
              </a>
            )}
          </div>
        </div>
      </section>

      <section data-tour="integrations.how" className="rounded-card border border-border bg-white p-5">
        <h3 className="font-bold text-grey">{t("integrations.how")}</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>{t("integrations.how1")}</li>
          <li>{t("integrations.how2")}</li>
          <li>{t("integrations.how3")}</li>
        </ol>
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          {t("integrations.backfill")}
        </p>
      </section>
    </div>
  );
}
