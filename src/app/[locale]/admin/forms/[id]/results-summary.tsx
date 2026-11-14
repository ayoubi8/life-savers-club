import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { QuestionSummary } from "@/lib/forms/responses-query";
import { typeIcons } from "./builder-shared";

function Bars({ summary, total }: { summary: QuestionSummary; total: number }) {
  const t = useTranslations("adminForms.results.summary");
  const bars = summary.bars ?? [];
  const max = Math.max(1, ...bars.map((bar) => bar.count));
  const isNps = summary.type === "nps";

  return (
    <ul className="mt-3 space-y-2">
      {bars.map((bar, index) => {
        const label =
          summary.type === "yes_no" || summary.type === "consent"
            ? t(bar.label === "yes" ? "yes" : "no")
            : bar.label;
        const color = isNps
          ? index <= 6
            ? "bg-pink"
            : index <= 8
              ? "bg-blue/50"
              : "bg-green"
          : "bg-blue";
        const pct = summary.answered > 0 ? Math.round((bar.count / summary.answered) * 100) : 0;
        return (
          <li key={`${bar.label}-${index}`} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate text-grey" title={label}>
              {label}
            </span>
            <span className="h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${label}: ${bar.count}`}>
              <span className={cn("block h-full rounded-full", color)} style={{ width: `${(bar.count / max) * 100}%` }} />
            </span>
            <span className="w-20 text-right text-xs tabular-nums text-muted-foreground">
              {bar.count} · {pct}%
            </span>
          </li>
        );
      })}
      {total === 0 && <li className="text-sm text-muted-foreground">{t("noAnswers")}</li>}
    </ul>
  );
}

export function ResultsSummary({
  summaries,
  total,
  truncated,
}: {
  summaries: QuestionSummary[];
  total: number;
  truncated: boolean;
}) {
  const t = useTranslations("adminForms.results.summary");

  if (summaries.length === 0) {
    return <p className="rounded-card border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {truncated && (
        <p className="rounded-card border border-pink/30 bg-pink/5 p-3 text-xs text-grey lg:col-span-2">{t("truncated")}</p>
      )}
      {summaries.map((summary) => {
        const Icon = typeIcons[summary.type];
        return (
          <section key={summary.id} className="rounded-card border border-border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 font-bold text-grey">
                  <Icon className="h-4 w-4 shrink-0 text-blue" aria-hidden />
                  <span className="truncate">{summary.label || "—"}</span>
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("answered", { answered: summary.answered, total })}
                </p>
              </div>
              {summary.nps !== undefined && (
                <div className="text-right">
                  <p className={cn("text-3xl font-extrabold leading-none", summary.nps >= 0 ? "text-green" : "text-pink")}>
                    {summary.nps > 0 ? "+" : ""}
                    {summary.nps}
                  </p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t("nps")}</p>
                </div>
              )}
              {summary.nps === undefined && summary.average !== undefined && summary.type !== "number" && (
                <div className="text-right">
                  <p className="text-3xl font-extrabold leading-none text-blue">{summary.average.toFixed(1)}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t("average")}</p>
                </div>
              )}
            </div>

            {summary.bars && <Bars summary={summary} total={summary.answered} />}

            {summary.type === "number" && summary.average !== undefined && (
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                {[
                  [t("average"), summary.average.toFixed(2)],
                  [t("min"), summary.min],
                  [t("max"), summary.max],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg bg-muted p-2">
                    <dt className="text-[11px] font-bold uppercase text-muted-foreground">{label}</dt>
                    <dd className="font-extrabold text-grey">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {summary.latest && summary.latest.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t("latest")}</p>
                <ul className="mt-1.5 space-y-1.5">
                  {summary.latest.map((text, index) => (
                    <li key={index} className="rounded-lg bg-muted px-3 py-2 text-sm text-grey">
                      <span className="line-clamp-3 whitespace-pre-line">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.type === "file" && (
              <p className="mt-3 text-sm text-muted-foreground">{t("files", { count: summary.answered })}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
