import type { CSSProperties } from "react";

export type FormTheme = {
  primary: string; // buttons, focus, progress
  accent: string; // second color of the header gradient
  background: string; // page background
  font: "sans" | "serif" | "mono";
  radius: "sharp" | "soft" | "round";
  header: "gradient" | "solid";
};

export const DEFAULT_THEME: FormTheme = {
  primary: "#2d74ba",
  accent: "#ef4a6c",
  background: "#f4f6f9",
  font: "sans",
  radius: "round",
  header: "gradient",
};

export const THEME_PRESETS: { key: string; theme: FormTheme }[] = [
  { key: "club", theme: DEFAULT_THEME },
  { key: "ocean", theme: { ...DEFAULT_THEME, primary: "#0e7490", accent: "#2d74ba", background: "#ecf6f9" } },
  { key: "rose", theme: { ...DEFAULT_THEME, primary: "#d6336c", accent: "#ef4a6c", background: "#fdf2f5", radius: "soft" } },
  { key: "green", theme: { ...DEFAULT_THEME, primary: "#2f7a14", accent: "#6ebd45", background: "#f1f8ec", header: "solid" } },
  { key: "night", theme: { ...DEFAULT_THEME, primary: "#6240e8", accent: "#ef4a6c", background: "#1c1a24", radius: "soft" } },
  { key: "paper", theme: { ...DEFAULT_THEME, primary: "#231f20", accent: "#414042", background: "#faf7f2", font: "serif", radius: "sharp", header: "solid" } },
];

const HEX = /^#[0-9a-fA-F]{6}$/;
const FONTS = ["sans", "serif", "mono"] as const;
const RADII = ["sharp", "soft", "round"] as const;
const HEADERS = ["gradient", "solid"] as const;

function hex(value: unknown, fallback: string) {
  return typeof value === "string" && HEX.test(value) ? value.toLowerCase() : fallback;
}

/** Never trusts stored JSON: anything unknown falls back to the club look. */
export function parseTheme(input: unknown): FormTheme {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    primary: hex(raw.primary, DEFAULT_THEME.primary),
    accent: hex(raw.accent, DEFAULT_THEME.accent),
    background: hex(raw.background, DEFAULT_THEME.background),
    font: FONTS.includes(raw.font as never) ? (raw.font as FormTheme["font"]) : DEFAULT_THEME.font,
    radius: RADII.includes(raw.radius as never) ? (raw.radius as FormTheme["radius"]) : DEFAULT_THEME.radius,
    header: HEADERS.includes(raw.header as never) ? (raw.header as FormTheme["header"]) : DEFAULT_THEME.header,
  };
}

function channel(value: number) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(color: string) {
  const n = parseInt(color.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function isDark(color: string) {
  return luminance(color) < 0.25;
}

export type ThemeWarning = "buttonContrast" | "backgroundContrast";

/** WCAG AA: white button text on the primary color, and the header text on the page background. */
export function themeWarnings(theme: FormTheme): ThemeWarning[] {
  const warnings: ThemeWarning[] = [];
  if (contrast(theme.primary, "#ffffff") < 4.5) warnings.push("buttonContrast");
  // On dark pages the helper text switches to white, so check the one that will be used.
  const text = isDark(theme.background) ? "#ffffff" : "#646469";
  if (contrast(theme.background, text) < 4.5) warnings.push("backgroundContrast");
  return warnings;
}

const RADIUS = { sharp: ["0.35rem", "0.25rem"], soft: ["0.9rem", "0.55rem"], round: ["1.25rem", "0.5rem"] } as const;
const FONT = {
  sans: "var(--font-nunito), ui-sans-serif, system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', ui-serif, serif",
  mono: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
} as const;

/** CSS variables for the wrapper: overriding the brand tokens re-colors every utility below it. */
export function themeStyle(theme: FormTheme): CSSProperties {
  const dark = isDark(theme.background);
  return {
    "--brand-blue": theme.primary,
    "--muted": theme.background,
    "--muted-foreground": dark ? "#c9c7d3" : "#646469",
    "--form-card-radius": RADIUS[theme.radius][0],
    "--form-input-radius": RADIUS[theme.radius][1],
    "--form-header": theme.header === "solid" ? theme.primary : `linear-gradient(120deg, ${theme.primary}, ${theme.accent})`,
    fontFamily: FONT[theme.font],
  } as CSSProperties;
}

export function pageTextClass(theme: FormTheme) {
  return isDark(theme.background) ? "text-white/80" : "text-muted-foreground";
}
