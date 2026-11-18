"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CircleHelp } from "lucide-react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tour.css";
import { usePathname } from "@/i18n/navigation";
import { markTourSeen } from "@/lib/tours/actions";
import { isUnseen, presentSteps, stepsFor, worthShowing } from "@/lib/tours/filter";
import { matchTour } from "@/lib/tours/registry";
import type { Tour, TourViewer } from "@/lib/tours/types";

const WAIT_MS = 6000; // pages stream in: give up auto-starting after this
const SETTLE_MS = 350; // let the rest of the page render once the first element shows up

/** The visible element for a `data-tour` value (some controls exist twice: phone and desktop). */
function findTarget(target: string): Element | null {
  for (const element of document.querySelectorAll(`[data-tour="${CSS.escape(target)}"]`)) {
    if (element.getClientRects().length > 0) return element;
  }
  return null;
}

/** An open dialog, drawer or menu: never start a tour on top of it. */
function somethingOpen() {
  const open = document.querySelectorAll('dialog[open], [role="dialog"], [aria-modal="true"], [role="menu"]');
  return [...open].some((element) => element.getClientRects().length > 0);
}

/**
 * Mounted once in the admin layout. Starts the current page's guide on the first visit and
 * shows a "?" button to replay it.
 */
export function TourProvider({ viewer, seen: initialSeen }: { viewer: TourViewer; seen: Record<string, number> }) {
  const t = useTranslations("tours");
  const pathname = usePathname();
  const tour = matchTour(pathname);
  const [seen, setSeen] = useState(initialSeen);
  const active = useRef<Driver | null>(null);

  const start = useCallback(
    (current: Tour) => {
      active.current?.destroy();
      const steps = presentSteps(stepsFor(current, viewer), (target) => !!findTarget(target));
      if (!worthShowing(steps)) return false;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const instance = driver({
        animate: !reducedMotion,
        smoothScroll: !reducedMotion,
        showProgress: steps.length > 1,
        allowClose: true,
        overlayOpacity: 0.55,
        stagePadding: 6,
        stageRadius: 12,
        popoverClass: "lsc-tour",
        // driver.js fills in {{current}} / {{total}} itself.
        progressText: t("ui.progress", { current: "{{current}}", total: "{{total}}" }),
        nextBtnText: t("ui.next"),
        prevBtnText: t("ui.previous"),
        doneBtnText: t("ui.done"),
        steps: steps.map((step) => ({
          element: step.target ? () => findTarget(step.target!) ?? document.body : undefined,
          popover: {
            title: t(`${current.id}.${step.id}.title`),
            description: t(`${current.id}.${step.id}.body`),
            side: step.side,
            align: "start",
          },
        })),
        onPopoverRender: (popover) => {
          popover.closeButton.setAttribute("aria-label", t("ui.close"));
          popover.closeButton.setAttribute("title", t("ui.close"));
        },
        // Finished or skipped: don't open it again by itself.
        onDestroyed: () => {
          active.current = null;
          setSeen((value) => ({ ...value, [current.id]: current.version }));
          void markTourSeen(current.id, current.version);
        },
      });
      active.current = instance;
      instance.drive();
      return true;
    },
    [t, viewer],
  );

  // First visit of a page: wait until one of its highlighted elements is rendered, then start.
  useEffect(() => {
    if (!tour || !isUnseen(tour, seen)) return;
    const targets = tour.steps.flatMap((step) => (step.target ? [step.target] : []));
    let timer: ReturnType<typeof setTimeout> | undefined;
    let done = false;
    const began = Date.now();

    const check = () => {
      if (done) return;
      if (Date.now() - began > WAIT_MS) return void (done = true);
      if (targets.some((target) => findTarget(target)) && !somethingOpen()) {
        done = true;
        timer = setTimeout(() => {
          if (!somethingOpen()) start(tour);
        }, SETTLE_MS);
        return;
      }
      timer = setTimeout(check, 200);
    };
    check();
    return () => {
      done = true;
      clearTimeout(timer);
    };
    // `seen` is left out on purpose: finishing a tour must not re-run this for the same page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, start]);

  // Leaving the page closes its tour (without marking it seen twice: onDestroyed handles that).
  useEffect(() => () => active.current?.destroy(), [pathname]);

  if (!tour) return null;
  return (
    <button
      type="button"
      data-tour="guide-button"
      onClick={() => start(tour)}
      aria-label={t("ui.replay")}
      title={t("ui.replay")}
      className="fixed bottom-4 left-4 z-30 inline-flex items-center gap-1.5 rounded-full bg-blue px-3 py-2 text-sm font-bold text-white shadow-soft hover:opacity-90 md:left-64"
    >
      <CircleHelp className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">{t("ui.guide")}</span>
    </button>
  );
}
