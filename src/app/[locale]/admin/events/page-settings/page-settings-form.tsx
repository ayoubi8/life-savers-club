"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { ColorField, Segmented } from "@/components/admin/fields";
import { YearDivider } from "@/components/events/year-divider";
import { saveEventsPageSettings } from "@/lib/events/actions";
import { DIVIDER_STYLES, LIST_LAYOUTS, type EventsPageSettings } from "@/lib/events/types";
import { cn } from "@/lib/utils";

const input =
  "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal outline-none focus:border-blue focus:ring-2 focus:ring-blue/20 disabled:bg-muted";
const card = "rounded-card border border-border bg-white p-5";
const SWATCHES = ["#ef4a6c", "#2d74ba", "#6ebd45", "#414042", "#d97706", "#6240e8"];

/** Look of the public /events page: texts, grid layout, year divider style/colour, notes per year. */
export function PageSettingsForm({
  initial,
  years,
  locale,
  canEdit,
}: {
  initial: EventsPageSettings;
  years: number[];
  locale: string;
  canEdit: boolean;
}) {
  const t = useTranslations("adminEvents.pageSettings");
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const patch = (change: Partial<EventsPageSettings>) => setValues((current) => ({ ...current, ...change }));
  const setNote = (year: number, lang: "fr" | "en", value: string) =>
    setValues((current) => ({
      ...current,
      yearNotes: { ...current.yearNotes, [year]: { fr: current.yearNotes[year]?.fr ?? "", en: current.yearNotes[year]?.en ?? "", [lang]: value } },
    }));

  function save() {
    startTransition(async () => {
      const result = await saveEventsPageSettings(values);
      if (!result.ok) return void toast.error(t("failed"));
      setSaved(values);
      toast.success(t("saved"));
    });
  }

  const sampleYear = years[0] ?? new Date().getFullYear();

  return (
    <div className="space-y-4 pb-24">
      {!canEdit && (
        <p role="status" className="flex items-center gap-2 rounded-card border border-border bg-white px-4 py-3 text-sm font-semibold text-grey">
          <Lock className="h-4 w-4 text-pink" aria-hidden />
          {t("adminOnly")}
        </p>
      )}

      <fieldset disabled={!canEdit} className="space-y-4">
        <section className={card} aria-labelledby="ps-texts">
          <h2 id="ps-texts" className="text-lg font-extrabold text-grey">{t("texts")}</h2>
          <p className="text-xs text-muted-foreground">{t("defaultHint")}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(["title_fr", "title_en"] as const).map((key) => (
              <label key={key} className="block text-xs font-bold text-grey">
                {t(key === "title_fr" ? "titleFr" : "titleEn")}
                <input value={values[key]} maxLength={80} onChange={(e) => patch({ [key]: e.target.value })} className={input} />
              </label>
            ))}
            {(["subtitle_fr", "subtitle_en"] as const).map((key) => (
              <label key={key} className="block text-xs font-bold text-grey">
                {t(key === "subtitle_fr" ? "subtitleFr" : "subtitleEn")}
                <textarea rows={2} value={values[key]} maxLength={200} onChange={(e) => patch({ [key]: e.target.value })} className={input} />
              </label>
            ))}
          </div>
        </section>

        <section className={cn(card, "space-y-5")}>
          <Segmented
            label={t("layout")}
            value={values.layout}
            onChange={(layout) => patch({ layout })}
            options={LIST_LAYOUTS.map((value) => ({ value, label: t(`layouts.${value}`) }))}
          />
          <Segmented
            label={t("divider")}
            value={values.divider}
            onChange={(divider) => patch({ divider })}
            options={DIVIDER_STYLES.map((value) => ({ value, label: t(`dividers.${value}`) }))}
          />
          <div className="space-y-2">
            <ColorField label={t("dividerColor")} value={values.dividerColor} onChange={(dividerColor) => patch({ dividerColor })} />
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => patch({ dividerColor: color })}
                  aria-label={color}
                  aria-pressed={values.dividerColor === color}
                  className={cn("h-7 w-7 rounded-full ring-1 ring-black/10", values.dividerColor === color && "ring-2 ring-blue ring-offset-2")}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t("preview")}</p>
            <YearDivider
              year={sampleYear}
              style={values.divider}
              color={values.dividerColor}
              note={(locale === "en" ? values.yearNotes[sampleYear]?.en : values.yearNotes[sampleYear]?.fr) || values.yearNotes[sampleYear]?.fr}
              count={t("sampleCount")}
            />
            <div className={cn("grid gap-3", values.layout === "grid3" ? "grid-cols-3" : values.layout === "grid2" ? "grid-cols-2" : "grid-cols-1")}>
              {Array.from({ length: values.layout === "grid3" ? 3 : 2 }, (_, index) => (
                <div key={index} className={cn("overflow-hidden rounded-xl border border-border bg-white", values.layout === "list" && "flex")}>
                  <div className={cn("bg-gradient-to-br from-blue/40 to-pink/40", values.layout === "list" ? "h-16 w-1/3" : "aspect-[16/10]")} />
                  <div className="space-y-1.5 p-2">
                    <div className="h-2 w-2/3 rounded bg-border" />
                    <div className="h-2 w-1/2 rounded bg-border/70" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={card} aria-labelledby="ps-notes">
          <h2 id="ps-notes" className="text-lg font-extrabold text-grey">{t("yearNotes")}</h2>
          <p className="text-xs text-muted-foreground">{t("yearNotesHint")}</p>
          {years.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("noYears")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {years.map((year) => (
                <li key={year} className="grid items-end gap-3 sm:grid-cols-[4rem_1fr_1fr]">
                  <span className="pb-2 text-lg font-extrabold" style={{ color: values.dividerColor }}>
                    {year}
                  </span>
                  <label className="block text-xs font-bold text-grey">
                    {t("noteFr", { year })}
                    <input value={values.yearNotes[year]?.fr ?? ""} maxLength={120} onChange={(e) => setNote(year, "fr", e.target.value)} className={input} />
                  </label>
                  <label className="block text-xs font-bold text-grey">
                    {t("noteEn", { year })}
                    <input value={values.yearNotes[year]?.en ?? ""} maxLength={120} onChange={(e) => setNote(year, "en", e.target.value)} className={input} />
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      </fieldset>

      {canEdit && (
        <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-full border border-border bg-white/95 px-4 py-2 shadow-soft backdrop-blur">
          <a href={`/${locale}/events`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue hover:underline">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            {t("view")}
          </a>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="inline-flex items-center gap-2 rounded-full bg-blue px-5 py-2 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden />
            {pending ? t("saving") : t("save")}
          </button>
        </div>
      )}
    </div>
  );
}
