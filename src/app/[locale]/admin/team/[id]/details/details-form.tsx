"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DepartmentCard } from "@/components/team/department-card";
import { useRouter } from "@/i18n/navigation";
import { slugify } from "@/lib/forms/schema";
import { saveDepartmentDetails } from "@/lib/team/actions";
import { useAutosave } from "@/lib/team/autosave";
import type { DepartmentFull } from "@/lib/team/types";
import { AutosavePill } from "../../autosave-pill";
import { PhotoField } from "../../photo-field";

const input =
  "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal outline-none focus:border-blue focus:ring-2 focus:ring-blue/20";
const card = "rounded-card border border-border bg-white p-5";

type Draft = {
  name_fr: string;
  name_en: string;
  slug: string;
  tagline_fr: string;
  tagline_en: string;
  leader_name: string;
  leader_role_fr: string;
  leader_role_en: string;
  leader_bio_fr: string;
  leader_bio_en: string;
  leader_photo_url: string | null;
  leader_photo_focus: { x: number; y: number };
};

function toDraft(d: DepartmentFull): Draft {
  return {
    name_fr: d.name_fr,
    name_en: d.name_en ?? "",
    slug: d.slug,
    tagline_fr: d.tagline_fr ?? "",
    tagline_en: d.tagline_en ?? "",
    leader_name: d.leader_name ?? "",
    leader_role_fr: d.leader_role_fr ?? "",
    leader_role_en: d.leader_role_en ?? "",
    leader_bio_fr: d.leader_bio_fr ?? "",
    leader_bio_en: d.leader_bio_en ?? "",
    leader_photo_url: d.leader_photo_url,
    leader_photo_focus: d.leader_photo_focus,
  };
}

/** Détails tab: names, card tagline, address, and the department leader. */
export function DetailsForm({ department, locale }: { department: DepartmentFull; locale: string }) {
  const t = useTranslations("adminTeam.details");
  const tTeam = useTranslations("team");
  const router = useRouter();
  const [draft, setDraft] = useState(() => toDraft(department));
  // The address is only sent once the admin leaves the field (it is cleaned up on blur).
  const [editingSlug, setEditingSlug] = useState(false);
  const patch = (change: Partial<Draft>) => setDraft((current) => ({ ...current, ...change }));
  const valid = draft.name_fr.trim().length >= 2 && !editingSlug;

  const { status, flush } = useAutosave(
    draft,
    async (sent) => {
      const result = await saveDepartmentDetails(department.id, sent);
      if (!result.ok) {
        if (result.error === "image_invalid") toast.error(t("imageInvalid"));
        return false;
      }
      // The server may adjust the address (taken or cleaned up): show what was really saved.
      if (result.slug !== sent.slug) setDraft((current) => (current.slug === sent.slug ? { ...current, slug: result.slug } : current));
      // The header shows the name and address.
      if (sent.name_fr !== department.name_fr || result.slug !== department.slug) router.refresh();
      return true;
    },
    { valid },
  );

  const preview = {
    ...department,
    ...draft,
    name_en: draft.name_en || null,
    tagline_fr: draft.tagline_fr || null,
    tagline_en: draft.tagline_en || null,
    leader_name: draft.leader_name || null,
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void flush();
      }}
      className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <section className={card} aria-labelledby="identity-title">
          <h2 id="identity-title" className="font-extrabold text-grey">{t("identity")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-grey">
              {t("nameFr")}
              <input value={draft.name_fr} onChange={(e) => patch({ name_fr: e.target.value })} required minLength={2} maxLength={100} className={input} />
            </label>
            <label className="block text-xs font-bold text-grey">
              {t("nameEn")}
              <input value={draft.name_en} onChange={(e) => patch({ name_en: e.target.value })} maxLength={100} placeholder={draft.name_fr} className={input} />
            </label>
            <label className="block text-xs font-bold text-grey">
              {t("taglineFr")}
              <input value={draft.tagline_fr} onChange={(e) => patch({ tagline_fr: e.target.value })} maxLength={160} placeholder={t("taglinePlaceholder")} className={input} />
            </label>
            <label className="block text-xs font-bold text-grey">
              {t("taglineEn")}
              <input value={draft.tagline_en} onChange={(e) => patch({ tagline_en: e.target.value })} maxLength={160} placeholder={draft.tagline_fr} className={input} />
            </label>
          </div>
          <label className="mt-3 block text-xs font-bold text-grey">
            {t("slug")}
            <span className="mt-1 flex items-center rounded-lg border border-border focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/20">
              <span className="pl-3 text-sm font-normal text-muted-foreground">/team/</span>
              <input
                value={draft.slug}
                onChange={(e) => patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                onFocus={() => setEditingSlug(true)}
                onBlur={() => {
                  setEditingSlug(false);
                  patch({ slug: slugify(draft.slug || draft.name_fr) });
                }}
                maxLength={80}
                className="w-full rounded-lg px-1 py-2 text-sm font-normal outline-none"
              />
            </span>
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("slugHint")}</span>
          </label>
        </section>

        <section className={card} aria-labelledby="leader-title">
          <h2 id="leader-title" className="font-extrabold text-grey">{t("leader")}</h2>
          <p className="text-xs text-muted-foreground">{t("leaderHint")}</p>
          <div className="mt-4">
            <PhotoField
              folder={{ kind: "leader", departmentId: department.id }}
              name={draft.leader_name || draft.name_fr}
              url={draft.leader_photo_url}
              focus={draft.leader_photo_focus}
              onChange={(change) =>
                patch({ ...(change.url !== undefined && { leader_photo_url: change.url }), ...(change.focus && { leader_photo_focus: change.focus }) })
              }
            />
          </div>
          <label className="mt-4 block text-xs font-bold text-grey">
            {t("leaderName")}
            <input value={draft.leader_name} onChange={(e) => patch({ leader_name: e.target.value })} maxLength={120} className={input} />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-grey">
              {t("roleFr")}
              <input value={draft.leader_role_fr} onChange={(e) => patch({ leader_role_fr: e.target.value })} maxLength={80} placeholder="Responsable" className={input} />
            </label>
            <label className="block text-xs font-bold text-grey">
              {t("roleEn")}
              <input value={draft.leader_role_en} onChange={(e) => patch({ leader_role_en: e.target.value })} maxLength={80} placeholder="Head of department" className={input} />
            </label>
            <label className="block text-xs font-bold text-grey">
              {t("bioFr")}
              <textarea value={draft.leader_bio_fr} onChange={(e) => patch({ leader_bio_fr: e.target.value })} maxLength={500} rows={4} className={input} />
            </label>
            <label className="block text-xs font-bold text-grey">
              {t("bioEn")}
              <textarea value={draft.leader_bio_en} onChange={(e) => patch({ leader_bio_en: e.target.value })} maxLength={500} rows={4} placeholder={t("enFallback")} className={input} />
            </label>
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("cardPreview")}</p>
          <div className="pointer-events-none">
            <DepartmentCard department={preview} locale={locale} cta={tTeam("discover")} preview />
          </div>
        </div>
        <div className="rounded-card border border-border bg-white p-4">
          <AutosavePill status={status} onRetry={() => void flush()} invalid={t("nameRequired")} />
        </div>
      </aside>
    </form>
  );
}
