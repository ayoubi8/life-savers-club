"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarCheck, FilePlus2, HeartHandshake, MessageSquare, Plus, Star, Users, X } from "lucide-react";
import { createForm } from "@/lib/forms/actions";
import { TEMPLATE_KEYS, buildTemplate, type TemplateKey } from "@/lib/forms/templates";
import { cn } from "@/lib/utils";

const icons: Record<TemplateKey, React.ComponentType<{ className?: string }>> = {
  blank: FilePlus2,
  contact: MessageSquare,
  membership: Users,
  event: CalendarCheck,
  feedback: Star,
};

/** "New form" button + dialog: pick a template, name the form, create. */
export function NewForm({
  locale,
  userTemplates,
}: {
  locale: string;
  userTemplates: { id: string; title: string }[];
}) {
  const t = useTranslations("adminForms");
  const [state, action, pending] = useActionState(createForm, {});
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState<string>("blank");
  const [title, setTitle] = useState("");
  const [touched, setTouched] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function choose(value: string, suggested: string) {
    setTemplate(value);
    // Suggest a title until the leader writes their own.
    if (!touched) setTitle(suggested);
  }

  const card = (selected: boolean) =>
    cn(
      "flex items-start gap-3 rounded-xl border p-3 text-left transition",
      selected ? "border-blue bg-blue/5 ring-2 ring-blue/15" : "border-border bg-white hover:border-blue/40",
    );

  return (
    <>
      <button
        type="button"
        data-tour="forms.new"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-pink px-5 py-2.5 text-sm font-extrabold text-white shadow-glow hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        {t("new")}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
        aria-labelledby="new-form-title"
        className="m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto rounded-card border border-border bg-white p-0 shadow-soft backdrop:bg-black/40"
      >
        {open && (
          <form action={action} className="p-5 sm:p-6">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="template" value={template} />

            <div className="flex items-start justify-between gap-3">
              <h2 id="new-form-title" className="text-xl font-extrabold text-blue">
                {t("newDialog.title")}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("newDialog.close")}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mt-4 block text-xs font-bold text-grey">
              {t("newDialog.titleLabel")}
              <input
                name="title"
                required
                autoFocus
                maxLength={200}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setTouched(true);
                }}
                placeholder={t("newPlaceholder")}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm font-normal outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
              />
            </label>

            <fieldset className="mt-5">
              <legend className="text-xs font-bold text-grey">{t("newDialog.chooseTemplate")}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {TEMPLATE_KEYS.map((key) => {
                  const Icon = icons[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={template === key}
                      onClick={() => choose(key, buildTemplate(key, locale).title)}
                      className={card(template === key)}
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue" />
                      <span>
                        <span className="block text-sm font-bold text-grey">{t(`templates.${key}.name`)}</span>
                        <span className="block text-xs text-muted-foreground">{t(`templates.${key}.description`)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {userTemplates.length > 0 && (
                <>
                  <p className="mt-4 text-xs font-bold text-grey">{t("newDialog.myTemplates")}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {userTemplates.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={template === `tpl:${item.id}`}
                        onClick={() => choose(`tpl:${item.id}`, item.title)}
                        className={card(template === `tpl:${item.id}`)}
                      >
                        <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-pink" />
                        <span className="block text-sm font-bold text-grey">{item.title}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </fieldset>

            {state.error && (
              <p role="alert" className="mt-3 text-sm font-semibold text-pink">
                {t(`errors.${state.error}`)}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-bold text-grey hover:bg-muted"
              >
                {t("newDialog.cancel")}
              </button>
              <button
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-blue px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {pending ? t("creating") : t("create")}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
