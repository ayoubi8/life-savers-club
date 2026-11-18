"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Save, Trash } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm";
import { parseSettings } from "@/lib/forms/schema";
import { deleteForm, updateFormSettings, type FormActionState } from "@/lib/forms/actions";
import { toLocalInput } from "./builder-shared";
import type { BuilderForm } from "./builder-provider";

export function SettingsPanel({
  form,
  locale,
  fields,
}: {
  form: BuilderForm;
  locale: string;
  fields: { id: string; label: string; type: string }[];
}) {
  const t = useTranslations("adminForms");
  const router = useRouter();
  const [state, action, pending] = useActionState(updateFormSettings, {} as FormActionState);
  const settings = parseSettings(form.settings);
  const input =
    "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal outline-none focus:border-blue focus:ring-2 focus:ring-blue/20";

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <div className="max-w-3xl space-y-4">
      <form data-tour="settings.main" action={action} className="rounded-card border border-border bg-white p-5">
        <h2 className="text-lg font-extrabold text-grey">{t("settings.title")}</h2>
        <input type="hidden" name="id" value={form.id} />
        <input type="hidden" name="locale" value={locale} />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-bold text-grey">
            {t("settings.titleLabel")}
            <input name="title" defaultValue={form.title} required maxLength={200} className={input} />
          </label>
          <label className="block text-xs font-bold text-grey">
            {t("settings.slug")}
            <input
              name="slug"
              defaultValue={form.slug}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={80}
              className={input}
            />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
              {t("settings.slugHint")}
            </span>
          </label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block text-xs font-bold text-grey">
            {t("settings.status")}
            <select name="status" defaultValue={form.status} className={input}>
              <option value="draft">{t("status.draft")}</option>
              <option value="published">{t("status.published")}</option>
              <option value="archived">{t("status.archived")}</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-grey">
            {t("settings.opensAt")}
            <input
              type="datetime-local"
              name="opensAt"
              defaultValue={toLocalInput(form.opensAt)}
              className={input}
            />
          </label>
          <label className="block text-xs font-bold text-grey">
            {t("settings.closesAt")}
            <input
              type="datetime-local"
              name="closesAt"
              defaultValue={toLocalInput(form.closesAt)}
              className={input}
            />
          </label>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{t("settings.datesHint")}</p>

        <label className="mt-6 block text-xs font-bold text-grey sm:max-w-sm">
          {t("settings.layout")}
          <select name="layout" defaultValue={settings.layout} className={input}>
            <option value="page">{t("settings.layoutPage")}</option>
            <option value="question">{t("settings.layoutQuestion")}</option>
          </select>
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("settings.layoutHint")}</span>
        </label>

        <fieldset className="mt-6 rounded-xl border border-border p-4">
          <legend className="px-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            {t("settings.responsesTitle")}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-grey">
              {t("settings.maxResponses")}
              <input
                type="number"
                name="maxResponses"
                min={1}
                defaultValue={settings.maxResponses ?? ""}
                placeholder="∞"
                className={input}
              />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("settings.maxResponsesHint")}</span>
            </label>
            <label className="flex items-start gap-2 pt-5 text-xs font-bold text-grey">
              <input
                type="checkbox"
                name="onePerEmail"
                defaultChecked={settings.onePerEmail}
                className="mt-0.5 h-4 w-4 accent-[var(--brand-blue)]"
              />
              <span>
                {t("settings.onePerEmail")}
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("settings.onePerEmailHint")}</span>
              </span>
            </label>
            <label className="block text-xs font-bold text-grey">
              {t("settings.respondentName")}
              <select name="respondentNameField" defaultValue={settings.respondentNameField} className={input}>
                <option value="">{t("settings.auto")}</option>
                {fields.filter((f) => f.type === "short_text").map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold text-grey">
              {t("settings.respondentEmail")}
              <select name="respondentEmailField" defaultValue={settings.respondentEmailField} className={input}>
                <option value="">{t("settings.auto")}</option>
                {fields.filter((f) => f.type === "email").map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{t("settings.respondentHint")}</p>
        </fieldset>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-bold text-grey">
            {t("settings.submitLabel")}
            <input
              name="submitLabel"
              defaultValue={settings.submitLabel}
              maxLength={80}
              placeholder={t("settings.submitLabelPlaceholder")}
              className={input}
            />
          </label>
          <label className="block text-xs font-bold text-grey">
            {t("settings.redirectUrl")}
            <input
              name="redirectUrl"
              defaultValue={settings.redirectUrl}
              placeholder="https://"
              className={input}
            />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
              {t("settings.redirectHint")}
            </span>
          </label>
        </div>

        <div className="mt-4 grid gap-4">
          <label className="block text-xs font-bold text-grey">
            {t("settings.successTitle")}
            <input
              name="successTitle"
              defaultValue={settings.successTitle}
              maxLength={200}
              placeholder={t("settings.successTitlePlaceholder")}
              className={input}
            />
          </label>
          <label className="block text-xs font-bold text-grey">
            {t("settings.successMessage")}
            <textarea
              name="successMessage"
              defaultValue={settings.successMessage}
              rows={3}
              maxLength={2000}
              placeholder={t("settings.successMessagePlaceholder")}
              className={input}
            />
          </label>
        </div>

        {state.error && (
          <p className="mt-3 text-sm font-semibold text-pink">{t(`errors.${state.error}`)}</p>
        )}
        {state.ok && (
          <p className="mt-3 text-sm font-semibold text-green">{t("settings.saved")}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {pending ? t("saving") : t("save")}
        </button>
      </form>

      <section data-tour="settings.danger" className="rounded-card border border-pink/30 bg-white p-5">
        <h2 className="font-bold text-pink">{t("settings.danger")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.dangerText")}</p>
        <div className="mt-3">
          <DeleteFormSection
            id={form.id}
            locale={locale}
            label={t("settings.delete")}
            confirmText={t("deleteConfirm")}
          />
        </div>
      </section>
    </div>
  );
}

function DeleteFormSection({
  id,
  locale,
  label,
  confirmText,
}: {
  id: string;
  locale: string;
  label: string;
  confirmText: string;
}) {
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({ title: confirmText, confirmLabel: label, danger: true });
        if (!ok) return;
        const data = new FormData();
        data.set("id", id);
        data.set("locale", locale);
        startTransition(() => {
          void deleteForm(data);
        });
      }}
      className="inline-flex items-center gap-2 rounded-full bg-pink px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
    >
      <Trash className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
