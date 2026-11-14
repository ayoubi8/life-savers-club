"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Monitor, Smartphone, X } from "lucide-react";
import { PublicForm } from "@/components/forms/public-form";
import { cn } from "@/lib/utils";
import { firstPage, parseSettings } from "@/lib/forms/schema";
import { useBuilder } from "./builder-provider";

/** Live preview of the form being edited, on a desktop or phone frame. Nothing is submitted. */
export function PreviewDrawer({
  open,
  onClose,
  publicUrl,
}: {
  open: boolean;
  onClose: () => void;
  publicUrl: string;
}) {
  const t = useTranslations("adminForms");
  const { form, schema } = useBuilder();
  const [device, setDevice] = useState<"desktop" | "mobile">("mobile");
  const page = firstPage(schema);
  const settings = parseSettings(form.settings);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("preview.title")}
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-[640px] flex-col bg-muted shadow-soft"
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-white px-4 py-3">
          <h2 className="font-extrabold text-grey">{t("preview.title")}</h2>
          <div className="flex items-center gap-2">
            <div role="tablist" className="flex rounded-full border border-border bg-muted p-1">
              {(["mobile", "desktop"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={device === d}
                  onClick={() => setDevice(d)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
                    device === d ? "bg-white text-blue shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {d === "mobile" ? <Smartphone className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
                  {t(`preview.${d}`)}
                </button>
              ))}
            </div>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-grey hover:border-blue hover:text-blue"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("preview.openTab")}
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("preview.close")}
              className="rounded-full p-2 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <p className="px-4 pt-3 text-xs text-muted-foreground">{t("preview.hint")}</p>

        <div className="flex-1 overflow-y-auto p-4">
          <div
            className={cn(
              "mx-auto overflow-hidden bg-white shadow-soft",
              device === "mobile" ? "w-[390px] max-w-full rounded-[2rem] border-8 border-grey" : "w-full rounded-card border border-border",
            )}
          >
            <div className="h-16 bg-brand-gradient" />
            <div className="space-y-5 p-5">
              <div>
                <h1 className="text-2xl font-extrabold text-grey">{form.title}</h1>
                {page.description && (
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{page.description}</p>
                )}
                <div className="mt-3 h-1.5 w-20 rounded-full bg-brand-gradient" />
              </div>
              <PublicForm
                preview
                formId={form.id}
                schema={schema}
                layout={settings.layout}
                submitLabel={settings.submitLabel}
                successTitle=""
                successMessage=""
                closed={false}
              />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
