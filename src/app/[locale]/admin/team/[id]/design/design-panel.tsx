"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { ColorField, Segmented } from "@/components/admin/fields";
import { DepartmentBody } from "@/components/team/department-body";
import { DepartmentCard } from "@/components/team/department-card";
import { DepartmentHero } from "@/components/team/department-hero";
import { localized } from "@/lib/events/utils";
import { saveDepartmentTheme } from "@/lib/team/actions";
import { useAutosave } from "@/lib/team/autosave";
import {
  DEFAULT_DEPARTMENT_THEME,
  DEPARTMENT_THEME_PRESETS,
  departmentThemeStyle,
  departmentThemeWarnings,
  themeBand,
  type DepartmentTheme,
} from "@/lib/team/theme";
import type { DepartmentFull } from "@/lib/team/types";
import { cn } from "@/lib/utils";
import { AutosavePill } from "../../autosave-pill";

const same = (a: DepartmentTheme, b: DepartmentTheme) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Per-department theme, same controls as forms and events: presets, colours, header layout,
 * overlay, band, font and corners. The live preview shows the department page and its card on /team.
 */
export function DesignPanel({ department, locale }: { department: DepartmentFull; locale: string }) {
  const t = useTranslations("adminEvents.design");
  const tTeam = useTranslations("adminTeam.design");
  const tPage = useTranslations("departmentPage");
  const tCard = useTranslations("team");
  const [theme, setTheme] = useState(department.theme);
  const warnings = departmentThemeWarnings(theme);
  const patch = (change: Partial<DepartmentTheme>) => setTheme((current) => ({ ...current, ...change }));
  const { status, flush } = useAutosave(theme, async (next) => (await saveDepartmentTheme(department.id, next)).ok);

  const preview = useMemo(() => ({ ...department, theme }), [department, theme]);
  const name = localized(department.name_fr, department.name_en, locale);
  const tagline = localized(department.tagline_fr, department.tagline_en, locale);

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <div className="space-y-6 self-start rounded-card border border-border bg-white p-5 xl:sticky xl:top-4">
        <section>
          <h2 className="font-extrabold text-grey">{t("presets")}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {DEPARTMENT_THEME_PRESETS.map((preset) => {
              // A preset keeps the department's chosen header layout and overlay.
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
                  <span className="block h-8" style={{ background: themeBand(preset.theme) }} />
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
          {!department.cover_url && <p className="text-xs font-semibold text-pink">{tTeam("noCover")}</p>}
          {theme.headerLayout === "fullBleed" && department.cover_url && (
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
            onClick={() => setTheme({ ...DEFAULT_DEPARTMENT_THEME, headerLayout: theme.headerLayout })}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-grey hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {t("reset")}
          </button>
          <div className="w-full">
            <AutosavePill status={status} onRetry={() => void flush()} />
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        <section aria-label={tTeam("cardPreview")}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{tTeam("cardPreview")}</p>
          <div className="pointer-events-none max-w-[260px]">
            <DepartmentCard department={preview} locale={locale} cta={tCard("discover")} preview />
          </div>
        </section>

        <section aria-label={t("preview")}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("preview")} · <span className="normal-case tracking-normal">{t("previewHint")}</span>
          </p>
          <div className="max-h-[80vh] overflow-y-auto overflow-x-hidden rounded-card border border-border shadow-soft">
            <div className="event-theme pb-10" style={departmentThemeStyle(theme)}>
              <DepartmentHero department={preview} name={name} tagline={tagline} eyebrow={tPage("eyebrow")} />
              <div className="mt-8">
                <DepartmentBody
                  department={preview}
                  locale={locale}
                  labels={{
                    leader: tPage("leader"),
                    mission: tPage("mission"),
                    team: tPage("team"),
                    members: tPage("members"),
                    emptyMission: tTeam("previewSample"),
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
