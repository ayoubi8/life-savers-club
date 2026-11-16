import type { CSSProperties } from "react";
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  contrast,
  isDark,
  parseTheme,
  themeStyle,
  type FormTheme,
} from "@/lib/forms/theme";

/** Per-event design: the forms theme plus page text colour and header layout. */
export type EventTheme = FormTheme & {
  text: string; // body text colour
  headerLayout: "fullBleed" | "split" | "minimal";
  overlay: number; // darkness of the cover overlay behind the title, 0-80 %
};

export const HEADER_LAYOUTS = ["fullBleed", "split", "minimal"] as const;

export const DEFAULT_EVENT_THEME: EventTheme = {
  ...DEFAULT_THEME,
  background: "#ffffff",
  text: "#231f20",
  headerLayout: "fullBleed",
  overlay: 45,
};

/** Same presets as forms, with a readable text colour for each background. */
export const EVENT_THEME_PRESETS: { key: string; theme: EventTheme }[] = THEME_PRESETS.map(({ key, theme }) => ({
  key,
  theme: {
    ...DEFAULT_EVENT_THEME,
    ...theme,
    background: key === "club" ? DEFAULT_EVENT_THEME.background : theme.background,
    text: isDark(theme.background) ? "#f4f4f6" : "#231f20",
  },
}));

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Never trusts stored JSON: anything unknown falls back to the club look. */
export function parseEventTheme(input: unknown): EventTheme {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const base = parseTheme({ ...DEFAULT_EVENT_THEME, ...raw });
  const overlay = typeof raw.overlay === "number" && Number.isFinite(raw.overlay) ? raw.overlay : DEFAULT_EVENT_THEME.overlay;
  return {
    ...base,
    text: typeof raw.text === "string" && HEX.test(raw.text) ? raw.text.toLowerCase() : isDark(base.background) ? "#f4f4f6" : DEFAULT_EVENT_THEME.text,
    headerLayout: HEADER_LAYOUTS.includes(raw.headerLayout as never)
      ? (raw.headerLayout as EventTheme["headerLayout"])
      : DEFAULT_EVENT_THEME.headerLayout,
    overlay: Math.min(80, Math.max(0, Math.round(overlay))),
  };
}

export type EventThemeWarning = "buttonContrast" | "textContrast";

/** WCAG AA: white text on buttons, and body text on the page background. */
export function eventThemeWarnings(theme: EventTheme): EventThemeWarning[] {
  const warnings: EventThemeWarning[] = [];
  if (contrast(theme.primary, "#ffffff") < 4.5) warnings.push("buttonContrast");
  if (contrast(theme.background, theme.text) < 4.5) warnings.push("textContrast");
  return warnings;
}

/**
 * First colour readable on the background (WCAG ratio), falling back to the text colour.
 * Used so a brand colour never makes a title or link unreadable (e.g. purple on a dark page).
 */
export function readableOn(background: string, candidates: string[], min: number, fallback: string) {
  return candidates.find((color) => contrast(color, background) >= min) ?? fallback;
}

/** CSS variables for the `.event-theme` wrapper of an event page. */
export function eventThemeStyle(theme: EventTheme): CSSProperties {
  return {
    ...themeStyle(theme),
    "--event-bg": theme.background,
    "--event-text": theme.text,
    // Large titles need 3:1, body links 4.5:1 (WCAG AA).
    "--event-heading": readableOn(theme.background, [theme.primary, theme.accent], 3, theme.text),
    "--event-link": readableOn(theme.background, [theme.primary, theme.accent], 4.5, theme.text),
    "--event-primary": theme.primary,
    "--event-accent": theme.accent,
    "--event-overlay": String(theme.overlay / 100),
    "--muted-foreground": isDark(theme.background) ? "#c9c7d3" : "#646469",
    background: theme.background,
    color: theme.text,
  } as CSSProperties;
}
