import type { Section } from "@/lib/permissions";

export type TourSide = "top" | "bottom" | "left" | "right";

export type TourStep = {
  /** Text keys: tours.<tour id>.<step id>.title / .body */
  id: string;
  /** `data-tour` value of the element to highlight. None = centered popover. */
  target?: string;
  side?: TourSide;
  /** Who sees the step. */
  only?: "admin" | "member";
  /** Needs this admin section. */
  section?: Section;
};

export type Tour = {
  /** "media.library": also the text namespace under `tours`. */
  id: string;
  /** Raise it when the page changes: everyone sees the tour once more. */
  version: number;
  /** Pathname without the locale, e.g. /^\/admin\/media$/. */
  match: RegExp;
  steps: TourStep[];
};

export type TourViewer = { admin: boolean; sections: string[] };
