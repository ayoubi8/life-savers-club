"use client";

import { useTranslations } from "next-intl";
import type { FormField } from "@/lib/forms/schema";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/20 disabled:bg-muted aria-[invalid=true]:border-pink aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-pink/20";

const choiceRow =
  "flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted";

export function FieldInput({
  field,
  preview = false,
  interactive = false,
  bare = false,
  error = null,
}: {
  field: FormField;
  /** Render without submitting (builder preview). */
  preview?: boolean;
  /** In preview, keep inputs usable (nothing is sent). */
  interactive?: boolean;
  /** Only the answer control: no label or help text (the builder edits those inline). */
  bare?: boolean;
  /** Translated error message for this question. */
  error?: string | null;
}) {
  const t = useTranslations("formPublic");
  const name = preview && !interactive ? undefined : field.id;
  const inputId = `field-${field.id}`;
  const labelId = `label-${field.id}`;
  const helpId = `help-${field.id}`;
  const errorId = `error-${field.id}`;
  const disabled = preview && !interactive;

  const describedBy =
    [field.description && !bare ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  // Attributes shared by every single-control input.
  const aria = {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "aria-required": field.required ? true : undefined,
  } as const;
  const groupAria = {
    "aria-labelledby": bare ? undefined : labelId,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "aria-required": field.required ? true : undefined,
  } as const;

  const requiredMark = field.required ? (
    <>
      <span aria-hidden className="ml-1 text-pink">*</span>
      <span className="sr-only"> ({t("requiredSr")})</span>
    </>
  ) : null;

  const errorNode = error ? (
    <p id={errorId} className="text-sm font-semibold text-pink">
      {error}
    </p>
  ) : null;

  if (field.type === "heading") {
    return (
      <div data-field-id={field.id}>
        <h2 className="text-xl font-extrabold text-blue">{field.label || "Heading"}</h2>
        {field.description && (
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{field.description}</p>
        )}
      </div>
    );
  }

  if (field.type === "divider") {
    return <hr className="border-border" />;
  }

  if (field.type === "statement") {
    return (
      <div data-field-id={field.id} className="rounded-xl border border-dashed border-border bg-muted/60 p-4">
        <p className="font-bold text-grey">{field.label || "Section"}</p>
        {field.description && (
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{field.description}</p>
        )}
      </div>
    );
  }

  if (field.type === "consent") {
    return (
      <div data-field-id={field.id} className="space-y-1.5">
        <label className={choiceRow}>
          <input
            type="checkbox"
            id={inputId}
            name={name}
            disabled={disabled}
            {...aria}
            className="mt-0.5 h-4 w-4 accent-[var(--brand-blue)]"
          />
          <span className="font-semibold text-grey">
            {bare ? t("consentBare") : field.label || "I agree"}
            {!bare && requiredMark}
          </span>
        </label>
        {!bare && field.description && (
          <p id={helpId} className="text-sm text-muted-foreground">
            {field.description}
          </p>
        )}
        {errorNode}
      </div>
    );
  }

  return (
    <div data-field-id={field.id} className="space-y-2">
      {!bare && (
        <label id={labelId} htmlFor={inputId} className="block text-sm font-bold text-grey">
          {field.label || "Untitled question"}
          {requiredMark}
        </label>
      )}
      {!bare && field.description && (
        <p id={helpId} className="text-sm text-muted-foreground">
          {field.description}
        </p>
      )}

      {field.type === "long_text" && (
        <textarea
          id={inputId}
          name={name}
          disabled={disabled}
          rows={4}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          {...aria}
          className={inputClass}
        />
      )}

      {(field.type === "short_text" ||
        field.type === "email" ||
        field.type === "phone" ||
        field.type === "number" ||
        field.type === "url" ||
        field.type === "date" ||
        field.type === "time") && (
        <input
          id={inputId}
          name={name}
          type={field.type === "short_text" ? "text" : field.type === "phone" ? "tel" : field.type}
          inputMode={field.type === "phone" ? "tel" : field.type === "number" ? "decimal" : undefined}
          autoComplete={field.type === "email" ? "email" : field.type === "phone" ? "tel" : undefined}
          disabled={disabled}
          maxLength={field.type === "short_text" ? field.maxLength : undefined}
          min={field.type === "number" ? field.min : undefined}
          max={field.type === "number" ? field.max : undefined}
          step={field.type === "number" ? "any" : undefined}
          placeholder={field.placeholder}
          {...aria}
          className={inputClass}
        />
      )}

      {field.type === "multiple_choice" && (
        <div role="radiogroup" {...groupAria} className="space-y-2">
          {(field.options ?? []).map((option) => (
            <label key={option.id} className={choiceRow}>
              <input
                type="radio"
                name={name}
                value={option.id}
                disabled={disabled}
                className="mt-0.5 accent-[var(--brand-blue)]"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}

      {field.type === "checkboxes" && (
        <div role="group" {...groupAria} className="space-y-2">
          {(field.options ?? []).map((option) => (
            <label key={option.id} className={choiceRow}>
              <input
                type="checkbox"
                name={name}
                value={option.id}
                disabled={disabled}
                className="mt-0.5 accent-[var(--brand-blue)]"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}

      {field.type === "dropdown" && (
        <select id={inputId} name={name} disabled={disabled} defaultValue="" {...aria} className={inputClass}>
          <option value="" disabled>
            {field.placeholder || t("choose")}
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {field.type === "rating" && (
        <div role="radiogroup" {...groupAria} className="flex flex-wrap gap-2">
          {Array.from({ length: field.max ?? 5 }, (_, index) => index + 1).map((value) => (
            <label key={value} className="cursor-pointer">
              <input type="radio" name={name} value={value} disabled={disabled} className="peer sr-only" />
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-sm font-bold text-grey transition peer-checked:border-blue peer-checked:bg-blue peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue/40">
                {value}
              </span>
            </label>
          ))}
        </div>
      )}

      {field.type === "yes_no" && (
        <div role="radiogroup" {...groupAria} className="flex gap-2">
          {(["yes", "no"] as const).map((value) => (
            <label key={value} className="cursor-pointer">
              <input type="radio" name={name} value={value} disabled={disabled} className="peer sr-only" />
              <span className="inline-flex min-h-11 min-w-20 items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-bold text-grey transition peer-checked:border-blue peer-checked:bg-blue peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue/40">
                {t(value)}
              </span>
            </label>
          ))}
        </div>
      )}

      {field.type === "nps" && (
        <div>
          <div role="radiogroup" {...groupAria} className="flex flex-wrap gap-1.5">
            {Array.from({ length: 11 }, (_, index) => index).map((value) => (
              <label key={value} className="cursor-pointer">
                <input type="radio" name={name} value={value} disabled={disabled} className="peer sr-only" />
                <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-sm font-bold text-grey transition peer-checked:border-pink peer-checked:bg-pink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-pink/40">
                  {value}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{t("npsLow")}</span>
            <span>{t("npsHigh")}</span>
          </div>
        </div>
      )}

      {field.type === "file" && (
        <input
          id={inputId}
          name={name}
          type="file"
          disabled={disabled}
          {...aria}
          className="w-full rounded-lg border border-dashed border-border bg-muted/40 px-3 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-blue file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
        />
      )}

      {errorNode}
    </div>
  );
}
