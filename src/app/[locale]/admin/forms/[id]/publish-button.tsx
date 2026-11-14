"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, ChevronDown, Share2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { publishForm, unpublishForm } from "@/lib/forms/actions";
import { cn } from "@/lib/utils";
import { useBuilder } from "./builder-provider";
import { ShareDialog } from "./share-content";

export function PublishButton({ publicUrl }: { publicUrl: string }) {
  const t = useTranslations("adminForms");
  const router = useRouter();
  const { form, saveStatus, unpublishedChanges, revealField } = useBuilder();
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const live = form.status === "published";
  const blockedBySave = saveStatus !== "saved";

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setMenuOpen(false);
      } else if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  function publish() {
    const firstTime = !live;
    startTransition(async () => {
      const result = await publishForm(form.id);
      if (result.ok) {
        toast.success(firstTime ? t("publish.success") : t("publish.changesPublished"));
        router.refresh();
        if (firstTime) setShareOpen(true);
        return;
      }
      if (result.error === "invalid_question" && result.fieldId) {
        toast.error(
          result.reason === "options"
            ? t("publish.invalidOptions", { label: result.label || "…" })
            : result.label
              ? t("publish.invalidQuestion", { label: result.label })
              : t("publish.invalidNoLabel"),
        );
        revealField(result.fieldId);
        router.push(`/admin/forms/${form.id}/edit`);
        return;
      }
      toast.error(t("publish.error"));
    });
  }

  function unpublish() {
    setMenuOpen(false);
    startTransition(async () => {
      const result = await unpublishForm(form.id);
      if (result.ok) {
        toast.success(t("publish.unpublished"));
        router.refresh();
      } else {
        toast.error(t("publish.error"));
      }
    });
  }

  const primary =
    "inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-extrabold transition disabled:opacity-60";

  return (
    <>
      <div className="relative flex items-center gap-2" ref={menuRef}>
        {live && !unpublishedChanges ? (
          <>
            <span className={cn(primary, "bg-green/10 text-green")}>
              <Check className="h-4 w-4" aria-hidden />
              {t("publish.published")}
            </span>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className={cn(primary, "bg-blue text-white hover:opacity-90")}
            >
              <Share2 className="h-4 w-4" aria-hidden />
              {t("publish.share")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={publish}
            disabled={pending || blockedBySave}
            title={blockedBySave ? t("publish.waitSave") : undefined}
            className={cn(primary, "bg-pink text-white shadow-glow hover:opacity-90")}
          >
            {pending ? t("publish.publishing") : live ? t("publish.publishChanges") : t("publish.publish")}
          </button>
        )}

        {live && (
          <>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={t("publish.more")}
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-full border border-border bg-white p-2 text-grey hover:bg-muted"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-soft"
              >
                {unpublishedChanges && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setShareOpen(true);
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-grey hover:bg-muted"
                  >
                    {t("publish.share")}
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={unpublish}
                  className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-pink hover:bg-pink/5"
                >
                  {t("publish.unpublish")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        publicUrl={publicUrl}
        title={form.title}
        slug={form.slug}
        published={live}
        settingsHref={`/admin/forms/${form.id}/settings`}
      />
    </>
  );
}
