"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, Inbox } from "lucide-react";
import { FieldInput } from "@/components/forms/field-input";
import { submitForm } from "@/lib/forms/actions";
import type { FormSchema } from "@/lib/forms/schema";
import { buildSteps, type FormLayout } from "@/lib/forms/steps";
import { validateAnswer } from "@/lib/forms/validate";

const button =
  "inline-flex min-h-11 items-center justify-center rounded-full px-6 py-3 text-sm font-extrabold transition disabled:opacity-60";

export function PublicForm({
  formId,
  schema,
  layout = "page",
  submitLabel,
  successTitle,
  successMessage,
  closed,
  preview = false,
  allowAnother = true,
}: {
  formId: string;
  schema: FormSchema;
  layout?: FormLayout;
  submitLabel: string;
  successTitle: string;
  successMessage: string;
  closed: boolean;
  /** Builder preview: fully usable, nothing is sent or remembered. */
  preview?: boolean;
  allowAnother?: boolean;
}) {
  const t = useTranslations("formPublic");
  const steps = useMemo(() => buildSteps(schema, layout), [schema, layout]);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [previewNote, setPreviewNote] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = `lsc-answers:${formId}`;

  const current = Math.min(step, steps.length - 1);
  const last = current === steps.length - 1;
  const hasQuestions = steps.some((s) => s.fields.length > 0);

  // Bring back what the person typed if the page was refreshed or reopened.
  useEffect(() => {
    if (preview || closed) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      const form = formRef.current;
      if (!raw || !form) return;
      const saved = JSON.parse(raw) as Record<string, string[]>;
      for (const element of Array.from(form.elements)) {
        if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) continue;
        const values = saved[element.name];
        if (!values || element.type === "file" || element.type === "hidden") continue;
        if (element instanceof HTMLInputElement && (element.type === "radio" || element.type === "checkbox")) {
          element.checked = values.includes(element.value) || (element.type === "checkbox" && element.value === "on" && values.includes("on"));
        } else {
          element.value = values[0] ?? "";
        }
      }
    } catch {
      /* sessionStorage unavailable: nothing to restore */
    }
  }, [preview, closed, storageKey]);

  function rememberAnswers() {
    if (preview) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const form = formRef.current;
      if (!form) return;
      const out: Record<string, string[]> = {};
      for (const [key, value] of new FormData(form).entries()) {
        if (typeof value !== "string" || key === "formId") continue;
        (out[key] ??= []).push(value);
      }
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(out));
      } catch {
        /* ignore */
      }
    }, 400);
  }

  function focusField(id: string) {
    requestAnimationFrame(() => {
      const target = formRef.current?.querySelector<HTMLElement>(
        `[data-field-id="${id}"] input:not([type=hidden]), [data-field-id="${id}"] select, [data-field-id="${id}"] textarea`,
      );
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  function goTo(index: number) {
    setStep(index);
    requestAnimationFrame(() => {
      stepRef.current?.focus({ preventScroll: true });
      stepRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  /** Validate one step. Returns the first invalid question id, or null. */
  function validateStep(index: number): string | null {
    const form = formRef.current;
    if (!form) return null;
    const data = new FormData(form);
    const found: Record<string, string> = {};
    for (const field of steps[index].fields) {
      const raw = field.type === "checkboxes" ? data.getAll(field.id) : data.get(field.id);
      const code = validateAnswer(field, raw);
      if (code) found[field.id] = code;
    }
    setErrors((previous) => {
      const next = { ...previous };
      for (const field of steps[index].fields) delete next[field.id];
      return { ...next, ...found };
    });
    return steps[index].fields.find((field) => found[field.id])?.id ?? null;
  }

  function next() {
    const invalid = validateStep(current);
    if (invalid) return focusField(invalid);
    setServerError(null);
    goTo(current + 1);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!last) return next();

    for (let index = 0; index < steps.length; index += 1) {
      const invalid = validateStep(index);
      if (invalid) {
        if (index !== current) goTo(index);
        return focusField(invalid);
      }
    }

    if (preview) {
      setPreviewNote(true);
      return;
    }

    const data = new FormData(event.currentTarget as HTMLFormElement);
    setServerError(null);
    startTransition(async () => {
      const result = await submitForm({ status: "idle" }, data);
      if (result.status === "success") {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* ignore */
        }
        setDone(true);
        return;
      }
      if (result.status === "error") {
        if (result.fieldId) {
          const index = steps.findIndex((s) => s.fields.some((field) => field.id === result.fieldId));
          setErrors((previous) => ({ ...previous, [result.fieldId as string]: result.code }));
          if (index >= 0) goTo(index);
          focusField(result.fieldId);
        } else {
          setServerError(result.code);
        }
      }
    });
  }

  function reset() {
    formRef.current?.reset();
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setErrors({});
    setServerError(null);
    setDone(false);
    goTo(0);
  }

  if (closed) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted px-6 py-10 text-center">
        <Inbox className="mx-auto h-10 w-10 text-blue/40" />
        <h2 className="mt-3 text-lg font-extrabold text-grey">{t("closedTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("closedText")}</p>
      </div>
    );
  }

  if (done) {
    return (
      <div role="status" className="rounded-xl border border-green/30 bg-green/5 px-6 py-10 text-center">
        <CircleCheck className="mx-auto h-12 w-12 text-green" />
        <h2 className="mt-3 text-xl font-extrabold text-grey">{successTitle}</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{successMessage}</p>
        {allowAnother && (
          <button type="button" onClick={reset} className={`${button} mt-6 border border-border bg-white text-grey hover:border-blue`}>
            {t("another")}
          </button>
        )}
      </div>
    );
  }

  if (!hasQuestions) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {t("noQuestions")}
      </p>
    );
  }

  const message = (code: string) => t(`errors.${code}`);
  const stepFields = steps[current].fields;
  const stepErrors = stepFields.filter((field) => errors[field.id]);
  const multi = steps.length > 1;

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} onInput={rememberAnswers} onChange={rememberAnswers} className="space-y-6">
      <input type="hidden" name="formId" value={formId} />

      <div ref={stepRef} tabIndex={-1} className="space-y-3 outline-none">
        {multi && (
          <div>
            <p aria-live="polite" className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              {t("stepOf", { current: current + 1, total: steps.length })}
            </p>
            <div
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={steps.length}
              aria-valuenow={current + 1}
              aria-label={t("stepOf", { current: current + 1, total: steps.length })}
              className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-brand-gradient transition-all duration-300"
                style={{ width: `${((current + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        )}
        {steps[current].title && <h2 className="text-xl font-extrabold text-blue">{steps[current].title}</h2>}
        {steps[current].description && (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{steps[current].description}</p>
        )}
      </div>

      {stepErrors.length > 0 && (
        <div role="alert" className="rounded-lg border border-pink/30 bg-pink/5 px-4 py-3 text-sm">
          <p className="font-bold text-pink">{t("fixErrors", { count: stepErrors.length })}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {stepErrors.map((field) => (
              <li key={field.id}>
                <button type="button" onClick={() => focusField(field.id)} className="text-left font-semibold text-grey underline underline-offset-2 hover:text-pink">
                  {field.label || t("untitled")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {steps.map((s, index) => (
        <div key={s.id} hidden={index !== current} className="space-y-6">
          {s.fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              preview={preview}
              interactive={preview}
              error={errors[field.id] ? message(errors[field.id]) : null}
            />
          ))}
        </div>
      ))}

      {serverError && (
        <p role="alert" className="rounded-lg border border-pink/30 bg-pink/5 px-4 py-3 text-sm font-semibold text-pink">
          {message(serverError)}
        </p>
      )}
      {preview && previewNote && (
        <p role="status" className="rounded-lg border border-blue/30 bg-blue/5 px-4 py-3 text-sm font-semibold text-blue">
          {t("previewNote")}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {multi && current > 0 ? (
          <button type="button" onClick={() => goTo(current - 1)} className={`${button} border border-border bg-white text-grey hover:border-blue`}>
            {t("back")}
          </button>
        ) : (
          <span />
        )}
        {last ? (
          <button type="submit" disabled={pending} className={`${button} bg-blue text-white shadow-soft hover:opacity-90 sm:min-w-48`}>
            {pending ? t("submitting") : submitLabel || t("submit")}
          </button>
        ) : (
          <button type="submit" className={`${button} bg-blue text-white shadow-soft hover:opacity-90 sm:min-w-40`}>
            {t("next")}
          </button>
        )}
      </div>
    </form>
  );
}
