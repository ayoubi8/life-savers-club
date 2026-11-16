import type { CSSProperties } from "react";
import {
  DEFAULT_EVENT_THEME,
  EVENT_THEME_PRESETS,
  eventThemeStyle,
  eventThemeWarnings,
  parseEventTheme,
  readableOn,
  type EventTheme,
} from "@/lib/events/theme";

/**
 * A department page uses the same design system as events and forms: presets, colours,
 * font, corners, header layout and overlay. Only the names differ.
 */
export type DepartmentTheme = EventTheme;

export const DEFAULT_DEPARTMENT_THEME = DEFAULT_EVENT_THEME;
export const DEPARTMENT_THEME_PRESETS = EVENT_THEME_PRESETS;
export const parseDepartmentTheme = parseEventTheme;
export const departmentThemeWarnings = eventThemeWarnings;
export const departmentThemeStyle = eventThemeStyle;

/** Header colour of the theme: gradient or solid, as on the department page band. */
export function themeBand(theme: DepartmentTheme) {
  return theme.header === "solid" ? theme.primary : `linear-gradient(120deg, ${theme.primary}, ${theme.accent})`;
}

/**
 * The department's colours applied to its card on /team (always on a white card),
 * so changing a department's theme also restyles its card.
 */
export function departmentCardStyle(theme: DepartmentTheme): CSSProperties {
  return {
    "--dept-band": themeBand(theme),
    "--dept-ring": `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
    // Small bold text on white needs 4.5:1; fall back to the club grey.
    "--dept-text": readableOn("#ffffff", [theme.primary, theme.accent], 4.5, "#414042"),
  } as CSSProperties;
}
