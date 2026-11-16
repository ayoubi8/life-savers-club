"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, Save, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { ColorField, Segmented } from "@/components/admin/fields";
import { EventContent } from "@/components/events/event-content";
import { EventHero } from "@/components/events/event-hero";
import { EventStats } from "@/components/events/event-stats";
import { useRouter } from "@/i18n/navigation";
import { saveEventTheme } from "@/lib/events/actions";
import { isEmptyDoc } from "@/lib/events/content";
import {
  DEFAULT_EVENT_THEME,
  EVENT_THEME_PRESETS,
  eventThemeStyle,
  eventThemeWarnings,
  type EventTheme,
} from "@/lib/events/theme";
import type { EventFull } from "@/lib/events/types";
import { localized } from "@/lib/events/utils";
import { cn } from "@/lib/utils";

const same = (a: EventTheme, b: EventTheme) => JSON.stringify(a) === JSON.stringify(b);

/** Per-event theme: presets, colours, header layout, font and corners, with a live preview. */
export function DesignPanel({ event, locale }: { event: EventFull; locale: string }) {
  const t = useTranslations("adminEvents.design");
  const router = useRouter();
  const [theme, setTheme] = useState(event.theme);
  const [saved, setSaved] = useState(event.theme);
  const [pending, startTransition] = useTransition();
  const dirty = !same(theme, saved);
  const warnings = eventThemeWarnings(theme);
  const patch = (change: Partial<EventTheme>) => setTheme((current) => ({ ...current, ...change }));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function save() {
    startTransition(async () => {
      const result = await saveEventTheme(event.id, theme);
      if (!result.ok) return void toast.error(t("failed"));
      setSaved(theme);
      toast.success(t("saved"));
      router.refresh();
    });
  }

  const preview = useMemo(() => ({ ...event, theme }), [event, theme]);
  const title = localized(event.title_fr, event.title_en, locale);
  const summary = localized(event.description_fr, event.description_en, locale);
  const doc = event.content_fr;

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <div className="space-y-6 self-start rounded-card border border-border bg-white p-5 xl:sticky xl:top-4">
        <section>
          <h2 className="font-extrabold text-grey">{t("presets")}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {EVENT_THEME_PRESETS.map((preset) => {
              // A preset keeps the event's chosen header layout and overlay.
              const candidate = { ...preset.theme, headerLayout: theme.headerLayout, overlay: theme.overlay };
              const active = same(candidate, theme);
              return (
                <button
                  key={preset.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTheme(candidate)}
                  className={cn("overflow-hidden rounded-xl border text-left", active ? "border-blue ring-2 ring-blue/20" : "border-border hover:border-blue/40")}
                >
                  <span
                    className="block h-8"
                    style={{
                      background: preset.theme.header === "solid" ? preset.theme.primary : `linear-gradient(120deg, ${preset.theme.primary}, ${preset.theme.accent})`,
                    }}
                  />
                  <span className="block px-2 py-1.5 text-[11px] font-bold" style={{ background: preset.theme.background, color: preset.theme.text }}>
                    {t(`preset.${preset.key}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-extrabold text-grey">{t("colors")}</h2>
          <ColorField label={t("primary")} value={theme.primary} onChange={(primary) => patch({ primary })} />
          <ColorField label={t("accent")} value={theme.accent} onChange={(accent) => patch({ accent })} />
          <ColorField label={t("background")} value={theme.background} onChange={(background) => patch({ background })} />
          <ColorField label={t("text")} value={theme.text} onChange={(text) => patch({ text })} />
          {warnings.length > 0 && (
            <div role="alert" className="flex gap-2 rounded-xl border border-pink/30 bg-pink/5 p-3 text-xs text-grey">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-pink" aria-hidden />
              <ul className="space-y-1">
                {warnings.map((warning) => (
                  <li key={warning}>{t(`warning.${warning}`)}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <Segmented
            label={t("headerLayout")}
            value={theme.headerLayout}
            onChange={(headerLayout) => patch({ headerLayout })}
            options={(["fullBleed", "split", "minimal"] as const).map((value) => ({ value, label: t(`layouts.${value}`), hint: t(`layoutHints.${value}`) }))}
          />
          {!event.cover_url && <p className="text-xs font-semibold text-pink">{t("noCover")}</p>}
          {theme.headerLayout === "fullBleed" && event.cover_url && (
            <label className="block text-sm font-bold text-grey">
              {t("overlay", { value: theme.overlay })}
              <input
                type="range"
                min={0}
                max={80}
                step={5}
                value={theme.overlay}
                onChange={(e) => patch({ overlay: Number(e.target.value) })}
                className="mt-2 w-full accent-[var(--brand-blue)]"
              />
              <span className="block text-[11px] font-normal text-muted-foreground">{t("overlayHint")}</span>
            </label>
          )}
          <Segmented
            label={t("band")}
            value={theme.header}
            onChange={(header) => patch({ header })}
            options={(["gradient", "solid"] as const).map((value) => ({ value, label: t(value) }))}
          />
          <Segmented
            label={t("font")}
            value={theme.font}
            onChange={(font) => patch({ font })}
            options={(["sans", "serif", "mono"] as const).map((value) => ({ value, label: t(`fonts.${value}`) }))}
          />
          <Segmented
            label={t("radius")}
            value={theme.radius}
            onChange={(radius) => patch({ radius })}
            options={(["sharp", "soft", "round"] as const).map((value) => ({ value, label: t(`radii.${value}`) }))}
          />
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setTheme({ ...DEFAULT_EVENT_THEME, headerLayout: theme.headerLayout })}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-grey hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {t("reset")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="inline-flex items-center gap-2 rounded-full bg-blue px-5 py-2 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden />
            {pending ? t("saving") : t("save")}
          </button>
          <p className={cn("w-full text-right text-xs font-bold", dirty ? "text-pink" : "text-muted-foreground")} aria-live="polite">
            {dirty ? t("unsaved") : t("saved")}
          </p>
        </div>
      </div>

      <section aria-label={t("preview")} className="min-w-0">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("preview")} · <span className="normal-case tracking-normal">{t("previewHint")}</span>
        </p>
        <div className="max-h-[80vh] overflow-y-auto overflow-x-hidden rounded-card border border-border shadow-soft">
          <div className="event-theme pb-10" style={eventThemeStyle(theme)}>
            <EventHero event={preview} title={title} summary={summary} locale={locale} attendeesLabel={null} mapLabel="" />
            <div className="mt-8 space-y-8">
              <EventStats stats={event.stats} locale={locale} label="" />
              <article className="mx-auto max-w-3xl px-4 sm:px-6">
                {isEmptyDoc(doc) ? <p className="opacity-70">{t("previewSample")}</p> : <EventContent doc={doc} />}
              </article>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
