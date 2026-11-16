"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { saveBureauMember } from "@/lib/team/actions";
import type { BureauMember } from "@/lib/team/types";
import { cn } from "@/lib/utils";
import { PhotoField } from "./photo-field";

const input =
  "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal outline-none focus:border-blue focus:ring-2 focus:ring-blue/20";

type Draft = Omit<BureauMember, "id" | "position">;

const toDraft = (m: BureauMember): Draft => ({
  full_name: m.full_name,
  role_fr: m.role_fr,
  role_en: m.role_en,
  bio_fr: m.bio_fr,
  bio_en: m.bio_en,
  photo_url: m.photo_url,
  photo_focus: m.photo_focus,
  is_visible: m.is_visible,
});

/** One fixed bureau seat (president or vice-president): name, photo, role labels, short bio. */
export function BureauEditor({ member }: { member: BureauMember }) {
  const t = useTranslations("adminTeam.bureau");
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(member));
  const [saved, setSaved] = useState<Draft>(() => toDraft(member));
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const patch = (change: Partial<Draft>) => setDraft((current) => ({ ...current, ...change }));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function save() {
    if (draft.full_name.trim().length < 2) return void toast.error(t("nameRequired"));
    startTransition(async () => {
      const result = await saveBureauMember(member.position, {
        full_name: draft.full_name,
        role_fr: draft.role_fr,
        role_en: draft.role_en,
        bio_fr: draft.bio_fr,
        bio_en: draft.bio_en,
        photo_url: draft.photo_url,
        photo_focus: draft.photo_focus,
        is_visible: draft.is_visible,
      });
      if (!result.ok) return void toast.error(t(result.error === "image_invalid" ? "imageInvalid" : "failed"));
      setSaved(draft);
      toast.success(t("saved"));
      router.refresh();
    });
  }

  const titleId = `bureau-${member.position}`;

  return (
    <section aria-labelledby={titleId} className="flex flex-col rounded-card border border-border bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 id={titleId} className="font-extrabold text-grey">{t(`positions.${member.position}`)}</h3>
        <label className="inline-flex items-center gap-2 text-xs font-bold text-grey">
          <input
            type="checkbox"
            checked={draft.is_visible}
            onChange={(event) => patch({ is_visible: event.target.checked })}
            className="h-4 w-4 accent-[var(--brand-blue)]"
          />
          {t("visible")}
        </label>
      </div>

      <div className="mt-4">
        <PhotoField
          folder={{ kind: "bureau", position: member.position }}
          name={draft.full_name}
          url={draft.photo_url}
          focus={draft.photo_focus}
          onChange={(change) => patch({ ...(change.url !== undefined && { photo_url: change.url }), ...(change.focus && { photo_focus: change.focus }) })}
        />
      </div>

      <label className="mt-4 block text-xs font-bold text-grey">
        {t("name")}
        <input value={draft.full_name} onChange={(e) => patch({ full_name: e.target.value })} maxLength={120} required className={input} />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-bold text-grey">
          {t("roleFr")}
          <input value={draft.role_fr} onChange={(e) => patch({ role_fr: e.target.value })} maxLength={80} className={input} />
        </label>
        <label className="block text-xs font-bold text-grey">
          {t("roleEn")}
          <input value={draft.role_en} onChange={(e) => patch({ role_en: e.target.value })} maxLength={80} className={input} />
        </label>
      </div>
      <label className="mt-3 block text-xs font-bold text-grey">
        {t("bioFr")}
        <textarea value={draft.bio_fr} onChange={(e) => patch({ bio_fr: e.target.value })} maxLength={400} rows={3} className={input} />
      </label>
      <label className="mt-3 block text-xs font-bold text-grey">
        {t("bioEn")}
        <textarea value={draft.bio_en} onChange={(e) => patch({ bio_en: e.target.value })} maxLength={400} rows={3} placeholder={t("bioEnHint")} className={input} />
      </label>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <p className={cn("text-xs font-bold", dirty ? "text-pink" : "text-muted-foreground")} aria-live="polite">
          {dirty ? t("unsaved") : t("upToDate")}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="inline-flex items-center gap-2 rounded-full bg-blue px-5 py-2 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden />
          {pending ? t("saving") : t("save")}
        </button>
      </div>
    </section>
  );
}
