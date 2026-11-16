"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Colour picker + hex input kept in sync; only valid #rrggbb values are emitted. */
export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  // Follow external changes (presets) without an effect.
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  return (
    <div className="flex items-center justify-between gap-3 text-sm font-bold text-grey">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value.toLowerCase())}
          className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-white p-1"
        />
        <input
          value={draft}
          aria-label={`${label} (hex)`}
          maxLength={7}
          onChange={(event) => {
            const next = event.target.value.trim();
            setDraft(next);
            if (/^#[0-9a-fA-F]{6}$/.test(next)) onChange(next.toLowerCase());
          }}
          className="w-24 rounded-lg border border-border px-2 py-1.5 font-mono text-xs font-normal outline-none focus:border-blue"
        />
      </span>
    </div>
  );
}

/** A row of pill buttons acting as a single choice (aria-pressed). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-grey">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.hint}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-9 rounded-full border px-4 py-1.5 text-xs font-bold",
              value === option.value ? "border-blue bg-blue/10 text-blue" : "border-border text-grey hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
