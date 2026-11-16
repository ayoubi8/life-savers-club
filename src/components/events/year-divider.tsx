import type { CSSProperties } from "react";
import type { EventsPageSettings } from "@/lib/events/types";

/**
 * Separator between years on the /events page. Style and colour are chosen by admins
 * in the events page settings. Rendered as the year's heading (h2) for screen readers.
 */
export function YearDivider({
  year,
  style,
  color,
  note,
  count,
}: {
  year: number;
  style: EventsPageSettings["divider"];
  color: string;
  note?: string;
  count: string; // e.g. "4 événements"
}) {
  const vars = { "--divider": color } as CSSProperties;
  const meta = (
    <p className="text-sm font-semibold text-muted-foreground">
      {note ? <span className="text-grey">{note} · </span> : null}
      {count}
    </p>
  );

  if (style === "bigYear") {
    return (
      <div style={vars} className="mb-8 flex flex-wrap items-end gap-x-6 gap-y-2">
        <h2
          className="text-7xl font-extrabold leading-none tracking-tight text-transparent sm:text-8xl"
          style={{ WebkitTextStroke: "2px var(--divider)" }}
        >
          {year}
        </h2>
        <div className="pb-2">{meta}</div>
        <span aria-hidden className="mb-3 h-1 min-w-12 flex-1 rounded-full bg-[var(--divider)] opacity-30" />
      </div>
    );
  }

  if (style === "pill") {
    return (
      <div style={vars} className="mb-8">
        <div className="flex items-center gap-4">
          <h2 className="rounded-full bg-[var(--divider)] px-5 py-1.5 text-xl font-extrabold text-white shadow-sm">{year}</h2>
          <span aria-hidden className="h-0.5 flex-1 rounded-full bg-[var(--divider)] opacity-40" />
        </div>
        <div className="mt-2 pl-1">{meta}</div>
      </div>
    );
  }

  // "line": a thin rule with the year centred on it.
  return (
    <div style={vars} className="mb-8 text-center">
      <div className="flex items-center gap-4">
        <span aria-hidden className="h-0.5 flex-1 rounded-full bg-[var(--divider)] opacity-50" />
        <h2 className="rounded-full border-2 border-[var(--divider)] bg-white px-5 py-1 text-2xl font-extrabold text-[var(--divider)]">
          {year}
        </h2>
        <span aria-hidden className="h-0.5 flex-1 rounded-full bg-[var(--divider)] opacity-50" />
      </div>
      <div className="mt-2">{meta}</div>
    </div>
  );
}
