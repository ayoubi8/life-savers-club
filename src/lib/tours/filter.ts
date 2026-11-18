// Pure helpers (no DOM, no server imports): unit-tested in tours.test.ts.
import type { Tour, TourStep, TourViewer } from "./types";

/** Steps this person may see, before checking which elements are on the page. */
export function stepsFor(tour: Tour, viewer: TourViewer): TourStep[] {
  return tour.steps.filter((step) => {
    if (step.only === "admin" && !viewer.admin) return false;
    if (step.only === "member" && viewer.admin) return false;
    if (step.section && !viewer.admin && !viewer.sections.includes(step.section)) return false;
    return true;
  });
}

/** Keeps centered steps and steps whose element is on the page. */
export function presentSteps(steps: TourStep[], isPresent: (target: string) => boolean): TourStep[] {
  return steps.filter((step) => !step.target || isPresent(step.target));
}

/** Whether the tour should open by itself: never finished or skipped at this version. */
export function isUnseen(tour: Tour, seen: Record<string, number>) {
  return (seen[tour.id] ?? 0) < tour.version;
}

/** A tour is worth showing only if it still points at something. */
export function worthShowing(steps: TourStep[]) {
  return steps.some((step) => step.target);
}
