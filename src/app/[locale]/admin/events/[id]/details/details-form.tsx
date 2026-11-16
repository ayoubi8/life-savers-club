"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useConfirm } from "@/components/ui/confirm";
import { deleteEvent, saveEventDetails, setFeatured } from "@/lib/events/actions";
import { slugify } from "@/lib/forms/schema";
import { SOCIAL_NETWORKS, STAT_ICONS, type CoverFocus, type EventStat, type SocialLinks } from "@/lib/events/types";
import { cleanSocialLink } from "@/lib/events/utils";
import { cn } from "@/lib/utils";
import { SOCIAL_NAMES, SOCIAL_PLACEHOLDERS, SocialIcon } from "@/components/events/social-icons";
import { CoverField, type LibraryImage } from "./cover-field";

type EventDetails = {
  id: string;
  title_fr: string;
  title_en: string;
  slug: string;
  description_fr: string;
  description_en: string;
  location: string;
  starts_at: string;
  ends_at: string | null;
  cover_url: string | null;
  cover_alt: string;
  cover_focus: CoverFocus;
  tags: string[];
  stats: EventStat[];
  attendee_count: number | null;
  registration_form_id: string | null;
  show_registration: boolean;
  social_links: SocialLinks;
  featured: boolean;
};

const input =
  "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal outline-none focus:border-blue focus:ring-2 focus:ring-blue/20";
const card = "rounded-card border border-border bg-white p-5";
const label = "block text-xs font-bold text-grey";
const hint = "mt-1 block text-[11px] font-normal text-muted-foreground";

/** ISO date → value for <input type="datetime-local"> in the browser's time zone. */
function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function fromLocalInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function DetailsForm({
  event,
  library: initialLibrary,
  forms,
}: {
  event: EventDetails;
  library: LibraryImage[];
  forms: { id: string; title: string }[];
}) {
  const t = useTranslations("adminEvents");
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState(() => ({
    ...event,
    starts: toLocalInput(event.starts_at),
    ends: toLocalInput(event.ends_at),
    attendees: event.attendee_count === null ? "" : String(event.attendee_count),
    // Every network as an editable string ("" = not set).
    socials: Object.fromEntries(SOCIAL_NETWORKS.map((network) => [network, event.social_links[network] ?? ""])) as Record<
      (typeof SOCIAL_NETWORKS)[number],
      string
    >,
  }));
  const [saved, setSaved] = useState(values);
  const [library, setLibrary] = useState(initialLibrary);
  const [tagDraft, setTagDraft] = useState("");
  const [featured, setFeaturedValue] = useState(event.featured);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(saved), [values, saved]);
  const patch = (change: Partial<typeof values>) => setValues((current) => ({ ...current, ...change }));

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function addTag(raw: string) {
    const tag = raw.trim().replace(/,$/, "").slice(0, 30);
    if (!tag || values.tags.includes(tag) || values.tags.length >= 8) return;
    patch({ tags: [...values.tags, tag] });
    setTagDraft("");
  }

  /** Filled in but not a link to that network. */
  function socialInvalid(network: (typeof SOCIAL_NETWORKS)[number]) {
    const value = values.socials[network].trim();
    return value !== "" && !cleanSocialLink(network, value);
  }

  function updateStat(index: number, change: Partial<EventStat>) {
    patch({ stats: values.stats.map((stat, i) => (i === index ? { ...stat, ...change } : stat)) });
  }
  function moveStat(index: number, delta: number) {
    const next = [...values.stats];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patch({ stats: next });
  }

  function save(event?: React.FormEvent) {
    event?.preventDefault();
    const startsAt = fromLocalInput(values.starts);
    if (!startsAt) return void toast.error(t("details.errors.invalid"));
    if (SOCIAL_NETWORKS.some((network) => socialInvalid(network))) return void toast.error(t("details.errors.social_invalid"));
    startTransition(async () => {
      const result = await saveEventDetails(values.id, {
        title_fr: values.title_fr,
        title_en: values.title_en,
        slug: values.slug,
        description_fr: values.description_fr,
        description_en: values.description_en,
        location: values.location,
        starts_at: startsAt,
        ends_at: fromLocalInput(values.ends),
        cover_url: values.cover_url,
        cover_alt: values.cover_alt,
        cover_focus: values.cover_focus,
        tags: values.tags,
        // Rows without a number or French label are dropped by the server.
        stats: values.stats,
        attendee_count: values.attendees === "" ? null : Number(values.attendees),
        registration_form_id: values.registration_form_id,
        show_registration: values.show_registration,
        social_links: values.socials,
      });
      if (!result.ok) {
        const key = ["invalid", "dates_order", "image_invalid", "social_invalid", "unauthorized", "not_found"].includes(result.error)
          ? result.error
          : "update_failed";
        toast.error(t(`details.errors.${key}`));
        return;
      }
      // Show the links as saved (tracking parameters removed, https added).
      const socials = Object.fromEntries(
        SOCIAL_NETWORKS.map((network) => [network, cleanSocialLink(network, values.socials[network]) ?? ""]),
      ) as typeof values.socials;
      const next = { ...values, slug: result.slug, socials };
      setValues(next);
      setSaved(next);
      toast.success(t("details.saved"));
      router.refresh();
    });
  }

  function toggleFeatured(next: boolean) {
    setFeaturedValue(next);
    startTransition(async () => {
      const result = await setFeatured(values.id, next);
      if (!result.ok) {
        setFeaturedValue(!next);
        toast.error(t("failed"));
      }
    });
  }

  async function remove() {
    const ok = await confirm({ title: t("deleteConfirm"), message: t("deleteText"), confirmLabel: t("delete"), danger: true });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteEvent(values.id);
      if (!result.ok) return void toast.error(t("failed"));
      toast.success(t("deleted"));
      router.push("/admin/events");
    });
  }

  return (
    <form onSubmit={save} className="space-y-4 pb-24">
      {/* ───── Information ───── */}
      <section className={card} aria-labelledby="details-general">
        <h2 id="details-general" className="text-lg font-extrabold text-grey">{t("details.general")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={label}>
            {t("details.titleFr")}
            <input
              required
              minLength={2}
              maxLength={140}
              value={values.title_fr}
              onChange={(e) => patch({ title_fr: e.target.value })}
              className={input}
            />
          </label>
          <label className={label}>
            {t("details.titleEn")}
            <input maxLength={140} value={values.title_en} onChange={(e) => patch({ title_en: e.target.value })} className={input} />
            <span className={hint}>{t("details.enHint")}</span>
          </label>
          <label className={label}>
            {t("details.slug")}
            <input
              required
              maxLength={80}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={values.slug}
              onChange={(e) => patch({ slug: e.target.value.toLowerCase() })}
              onBlur={(e) => patch({ slug: slugify(e.target.value) || saved.slug })}
              className={input}
            />
            <span className={hint}>{t("details.slugHint")}</span>
          </label>
          <label className={label}>
            {t("details.location")}
            <input
              maxLength={140}
              value={values.location}
              onChange={(e) => patch({ location: e.target.value })}
              placeholder={t("details.locationPlaceholder")}
              className={input}
            />
          </label>
          <label className={label}>
            {t("details.startsAt")}
            <input type="datetime-local" required value={values.starts} onChange={(e) => patch({ starts: e.target.value })} className={input} />
          </label>
          <label className={label}>
            {t("details.endsAt")}
            <input type="datetime-local" min={values.starts} value={values.ends} onChange={(e) => patch({ ends: e.target.value })} className={input} />
          </label>
        </div>

        <div className="mt-4">
          <label className={label} htmlFor="tag-input">{t("details.tags")}</label>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/20">
            {values.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-pink/10 py-0.5 pl-2.5 pr-1 text-xs font-bold text-pink">
                {tag}
                <button
                  type="button"
                  onClick={() => patch({ tags: values.tags.filter((item) => item !== tag) })}
                  aria-label={t("details.removeTag", { tag })}
                  className="rounded-full p-0.5 hover:bg-pink/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              id="tag-input"
              value={tagDraft}
              onChange={(e) => (e.target.value.endsWith(",") ? addTag(e.target.value) : setTagDraft(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(tagDraft);
                }
                if (e.key === "Backspace" && !tagDraft && values.tags.length) patch({ tags: values.tags.slice(0, -1) });
              }}
              onBlur={() => addTag(tagDraft)}
              placeholder={values.tags.length < 8 ? t("details.tagsPlaceholder") : ""}
              disabled={values.tags.length >= 8}
              className="min-w-40 flex-1 bg-transparent px-1 py-1 text-sm outline-none"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={label}>
            {t("details.summaryFr")}
            <textarea rows={3} maxLength={400} value={values.description_fr} onChange={(e) => patch({ description_fr: e.target.value })} className={input} />
            <span className={hint}>{t("details.summaryHint")}</span>
          </label>
          <label className={label}>
            {t("details.summaryEn")}
            <textarea rows={3} maxLength={400} value={values.description_en} onChange={(e) => patch({ description_en: e.target.value })} className={input} />
            <span className={hint}>{t("details.enHint")}</span>
          </label>
        </div>
      </section>

      {/* ───── Cover ───── */}
      <section className={card}>
        <CoverField
          eventId={values.id}
          url={values.cover_url}
          alt={values.cover_alt}
          focus={values.cover_focus}
          library={library}
          onChange={(change) =>
            patch({
              ...(change.url !== undefined ? { cover_url: change.url } : {}),
              ...(change.alt !== undefined ? { cover_alt: change.alt } : {}),
              ...(change.focus ? { cover_focus: change.focus } : {}),
            })
          }
          onUploaded={(image) => setLibrary((list) => [...list, image])}
        />
      </section>

      {/* ───── Key numbers ───── */}
      <section className={card} aria-labelledby="details-stats">
        <h2 id="details-stats" className="text-lg font-extrabold text-grey">{t("details.stats")}</h2>
        <p className="text-xs text-muted-foreground">{t("details.statsHint")}</p>
        <ul className="mt-4 space-y-3">
          {values.stats.map((stat, index) => (
            <li key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[6rem_1fr_1fr_8rem_auto] sm:items-end">
              <label className={label}>
                {t("details.statValue")}
                <input value={stat.value} maxLength={20} placeholder="350" onChange={(e) => updateStat(index, { value: e.target.value })} className={input} />
              </label>
              <label className={label}>
                {t("details.statLabelFr")}
                <input value={stat.label_fr} maxLength={60} onChange={(e) => updateStat(index, { label_fr: e.target.value })} className={input} />
              </label>
              <label className={label}>
                {t("details.statLabelEn")}
                <input value={stat.label_en} maxLength={60} onChange={(e) => updateStat(index, { label_en: e.target.value })} className={input} />
              </label>
              <label className={label}>
                {t("details.statIcon")}
                <select value={stat.icon} onChange={(e) => updateStat(index, { icon: e.target.value as EventStat["icon"] })} className={input}>
                  {STAT_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {t(`details.icons.${icon}`)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-1">
                <button type="button" onClick={() => moveStat(index, -1)} disabled={index === 0} aria-label={t("details.moveUp")} className="rounded-full p-2 text-grey hover:bg-muted disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => moveStat(index, 1)} disabled={index === values.stats.length - 1} aria-label={t("details.moveDown")} className="rounded-full p-2 text-grey hover:bg-muted disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => patch({ stats: values.stats.filter((_, i) => i !== index) })} aria-label={t("details.removeStat")} className="rounded-full p-2 text-pink hover:bg-pink/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        {values.stats.length < 8 && (
          <button
            type="button"
            onClick={() => patch({ stats: [...values.stats, { value: "", label_fr: "", label_en: "", icon: "users" }] })}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-2 text-xs font-bold text-grey hover:border-blue hover:text-blue"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {t("details.addStat")}
          </button>
        )}
        <label className={cn(label, "mt-5 max-w-xs")}>
          {t("details.attendees")}
          <input
            type="number"
            min={0}
            max={1000000}
            inputMode="numeric"
            value={values.attendees}
            onChange={(e) => patch({ attendees: e.target.value })}
            className={input}
          />
          <span className={hint}>{t("details.attendeesHint")}</span>
        </label>
      </section>

      {/* ───── Social networks ───── */}
      <section className={card} aria-labelledby="details-social">
        <h2 id="details-social" className="text-lg font-extrabold text-grey">{t("details.social")}</h2>
        <p className="text-xs text-muted-foreground">{t("details.socialHint")}</p>
        <div className="mt-4 space-y-3">
          {SOCIAL_NETWORKS.map((network) => {
            const invalid = socialInvalid(network);
            const id = `social-${network}`;
            return (
              <div key={network}>
                <label htmlFor={id} className={cn(label, "flex items-center gap-2")}>
                  <SocialIcon network={network} className="size-4 shrink-0" />
                  {SOCIAL_NAMES[network]}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={id}
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={500}
                    value={values.socials[network]}
                    onChange={(e) => patch({ socials: { ...values.socials, [network]: e.target.value } })}
                    placeholder={SOCIAL_PLACEHOLDERS[network]}
                    aria-invalid={invalid}
                    aria-describedby={invalid ? `${id}-error` : undefined}
                    className={cn(input, invalid && "border-pink focus:border-pink focus:ring-pink/20")}
                  />
                  {values.socials[network] && !invalid && (
                    <a
                      href={cleanSocialLink(network, values.socials[network]) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 shrink-0 rounded-full px-3 py-2 text-xs font-bold text-blue hover:bg-blue/5"
                    >
                      {t("details.socialOpen")}
                    </a>
                  )}
                </div>
                {invalid && (
                  <p id={`${id}-error`} className="mt-1 text-[11px] font-semibold text-pink">
                    {t("details.socialInvalid", { network: SOCIAL_NAMES[network] })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ───── Registration & position ───── */}
      <section className={card} aria-labelledby="details-registration">
        <h2 id="details-registration" className="text-lg font-extrabold text-grey">{t("details.registration")}</h2>
        {forms.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("details.noPublishedForms")}</p>
        ) : (
          <>
            <label className={cn(label, "mt-4 max-w-md")}>
              {t("details.registrationForm")}
              <select
                value={values.registration_form_id ?? ""}
                onChange={(e) => patch({ registration_form_id: e.target.value || null, show_registration: e.target.value ? values.show_registration : false })}
                className={input}
              >
                <option value="">{t("details.noForm")}</option>
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm text-grey">
              <input
                type="checkbox"
                checked={values.show_registration}
                disabled={!values.registration_form_id}
                onChange={(e) => patch({ show_registration: e.target.checked })}
                className="h-4 w-4 accent-[var(--brand-blue)]"
              />
              {t("details.showRegistration")}
            </label>
          </>
        )}
        <label className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-sm text-grey">
          <input type="checkbox" checked={featured} onChange={(e) => toggleFeatured(e.target.checked)} className="h-4 w-4 accent-[var(--brand-pink)]" />
          {t("details.featuredLabel")}
        </label>
      </section>

      {/* ───── Danger zone ───── */}
      <section className="rounded-card border border-pink/30 bg-white p-5">
        <h2 className="text-lg font-extrabold text-pink">{t("details.danger")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("deleteText")}</p>
        <button
          type="button"
          onClick={remove}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-pink px-4 py-2 text-xs font-bold text-pink hover:bg-pink/5"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {t("delete")}
        </button>
      </section>

      {/* ───── Sticky save bar ───── */}
      <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-full border border-border bg-white/95 px-4 py-2 shadow-soft backdrop-blur">
        <span className={cn("text-xs font-bold", dirty ? "text-pink" : "text-muted-foreground")} aria-live="polite">
          {dirty ? t("details.unsaved") : t("details.saved")}
        </span>
        <button
          type="submit"
          disabled={pending || !dirty}
          className="inline-flex items-center gap-2 rounded-full bg-blue px-5 py-2 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden />
          {pending ? t("details.saving") : t("details.save")}
        </button>
      </div>
    </form>
  );
}
