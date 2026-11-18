"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ImageUp, Star, Trash2, TriangleAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Segmented } from "@/components/admin/fields";
import { useConfirm } from "@/components/ui/confirm";
import { useRouter } from "@/i18n/navigation";
import type { CoverFocus } from "@/lib/events/types";
import { IMAGE_TYPES } from "@/lib/events/upload";
import {
  addDepartmentMember,
  deleteDepartmentMedia,
  deleteDepartmentMember,
  reorderDepartmentMembers,
  setDepartmentCover,
  setGalleryMode,
  updateDepartmentMediaAlt,
  updateDepartmentMember,
} from "@/lib/team/actions";
import { GALLERY_MODES, type DepartmentFull, type DepartmentMember, type GalleryMode } from "@/lib/team/types";
import { uploadDepartmentMedia } from "@/lib/team/upload";
import { cn } from "@/lib/utils";
import { PhotoField } from "../../photo-field";

const card = "rounded-card border border-border bg-white p-5";

type Photo = { id: string; url: string; alt: string; width: number | null; height: number | null };
type Upload = { name: string; progress: number };

/** Médias tab: what the "Équipe" section shows, the team photos, and the members (photo + name). */
export function MediaPanel({ department }: { department: DepartmentFull }) {
  const t = useTranslations("adminTeam.media");
  const router = useRouter();
  const [mode, setMode] = useState<GalleryMode>(department.gallery_mode);
  const [, startTransition] = useTransition();

  function changeMode(next: GalleryMode) {
    const previous = mode;
    setMode(next);
    startTransition(async () => {
      const result = await setGalleryMode(department.id, next);
      if (!result.ok) {
        setMode(previous);
        toast.error(t("failed"));
        return;
      }
      toast.success(t("modeSaved"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section data-tour="dept.mode" className={card} aria-labelledby="mode-title">
        <h2 id="mode-title" className="sr-only">{t("mode")}</h2>
        <Segmented
          label={t("mode")}
          value={mode}
          onChange={changeMode}
          options={GALLERY_MODES.map((value) => ({ value, label: t(`modes.${value}`), hint: t(`modeHints.${value}`) }))}
        />
        <p className="mt-2 text-xs text-muted-foreground">{t(`modeHints.${mode}`)}</p>
      </section>

      {mode !== "members" && <PhotosSection department={department} />}
      {mode !== "group" && <MembersSection department={department} />}
    </div>
  );
}

// ───────── Team photos ─────────

function PhotosSection({ department }: { department: DepartmentFull }) {
  const t = useTranslations("adminTeam.media");
  const tErrors = useTranslations("adminEvents.media.errors");
  const router = useRouter();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Photo[]>(() =>
    department.media.map((m) => ({ id: m.id, url: m.url, alt: m.alt ?? "", width: m.width, height: m.height })),
  );
  const [cover, setCover] = useState(department.cover_url);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [, startTransition] = useTransition();
  const busy = uploads.length > 0;

  async function uploadAll(files: File[]) {
    const images = files.filter((file) => IMAGE_TYPES.includes(file.type));
    if (images.length < files.length) toast.error(t("imagesOnly"));
    if (!images.length) return;
    setUploads(images.map((file) => ({ name: file.name, progress: 0 })));
    let added = 0;
    // One at a time: phones on weak connections handle this better than parallel uploads.
    for (const [index, file] of images.entries()) {
      const result = await uploadDepartmentMedia(department.id, file, {
        onProgress: (progress) => setUploads((list) => list.map((u, i) => (i === index ? { ...u, progress } : u))),
      });
      if (result.ok) {
        added += 1;
        setItems((list) => [...list, { id: result.media.id, url: result.media.url, alt: "", width: result.media.width, height: result.media.height }]);
      } else {
        toast.error(tErrors(result.error, { name: file.name }));
      }
    }
    setUploads([]);
    if (added) {
      toast.success(t("uploaded", { count: added }));
      router.refresh();
    }
  }

  function saveAlt(item: Photo, alt: string) {
    if (alt === item.alt) return;
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, alt } : i)));
    startTransition(async () => {
      const result = await updateDepartmentMediaAlt(item.id, alt);
      if (result.ok) toast.success(t("altSaved"));
      else toast.error(t("failed"));
    });
  }

  function makeCover(item: Photo | null) {
    startTransition(async () => {
      const result = await setDepartmentCover(department.id, item?.id ?? null);
      if (!result.ok) return void toast.error(t("failed"));
      setCover(item?.url ?? null);
      toast.success(t(item ? "coverSet" : "coverRemoved"));
      router.refresh();
    });
  }

  async function remove(item: Photo) {
    const ok = await confirm({ title: t("deletePhotoTitle"), message: t("deletePhotoText"), confirmLabel: t("delete"), danger: true });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteDepartmentMedia(item.id);
      if (!result.ok) return void toast.error(t("failed"));
      setItems((list) => list.filter((i) => i.id !== item.id));
      if (cover === item.url) setCover(null);
      toast.success(t("deleted"));
      router.refresh();
    });
  }

  return (
    <section data-tour="dept.photos" className={card} aria-labelledby="photos-title">
      <h2 id="photos-title" className="font-extrabold text-grey">{t("photosTitle")}</h2>
      <p className="text-xs text-muted-foreground">{t("photosHint")}</p>

      <div
        className={cn("mt-4 rounded-xl border-2 border-dashed p-6 text-center transition", dragging ? "border-blue bg-blue/5" : "border-border")}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!busy) void uploadAll([...event.dataTransfer.files]);
        }}
      >
        <ImageUp className="mx-auto h-8 w-8 text-blue" aria-hidden />
        <p className="mt-2 font-extrabold text-ink">{t("drop")}</p>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={IMAGE_TYPES.join(",")}
          className="sr-only"
          aria-label={t("pick")}
          onChange={(event) => {
            void uploadAll([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="mt-2 rounded-full bg-blue px-5 py-2 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-60"
        >
          {t("pick")}
        </button>
        {busy && (
          <ul className="mx-auto mt-4 max-w-md space-y-2 text-left" aria-live="polite">
            {uploads.map((upload, index) => (
              <li key={index}>
                <p className="truncate text-xs font-semibold text-grey">{t("uploading", { name: upload.name })}</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-blue transition-[width]" style={{ width: `${Math.round(upload.progress * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const isCover = item.url === cover;
            return (
              <li key={item.id} className={cn("overflow-hidden rounded-xl border", isCover ? "border-pink ring-2 ring-pink/20" : "border-border")}>
                <div className="relative aspect-[4/3] bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- library thumbnail */}
                  <img src={item.url} alt={item.alt} loading="lazy" className="h-full w-full object-cover" />
                  {index === 0 && (
                    <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-bold text-white">{t("bigPhoto")}</span>
                  )}
                  {isCover && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-pink px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                      <Star className="h-3 w-3" fill="currentColor" aria-hidden />
                      {t("isCover")}
                    </span>
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <label className="block text-[11px] font-bold text-grey">
                    {t("alt")}
                    <input
                      defaultValue={item.alt}
                      maxLength={300}
                      placeholder={t("altPlaceholder")}
                      onBlur={(event) => saveAlt(item, event.target.value.trim())}
                      className={cn(
                        "mt-1 w-full rounded-lg border px-2.5 py-1.5 text-xs font-normal outline-none focus:border-blue focus:ring-2 focus:ring-blue/20",
                        item.alt ? "border-border" : "border-pink/50",
                      )}
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-[11px] text-muted-foreground">
                      {!item.alt && (
                        <span className="inline-flex items-center gap-1 font-bold text-pink">
                          <TriangleAlert className="h-3 w-3" aria-hidden />
                          {t("missingAlt")}
                        </span>
                      )}
                    </span>
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => makeCover(isCover ? null : item)}
                        className="rounded-full px-2.5 py-1 text-[11px] font-bold text-blue hover:bg-blue/10"
                      >
                        {t(isCover ? "unsetCover" : "setCover")}
                      </button>
                      <button type="button" onClick={() => remove(item)} aria-label={t("delete")} title={t("delete")} className="rounded-full p-1.5 text-pink hover:bg-pink/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ───────── Members: photo + name ─────────

type MemberDraft = { full_name: string; photo_url: string | null; photo_focus: CoverFocus };

function MembersSection({ department }: { department: DepartmentFull }) {
  const t = useTranslations("adminTeam.media");
  const router = useRouter();
  const confirm = useConfirm();
  const [members, setMembers] = useState<DepartmentMember[]>(department.members);
  const [draft, setDraft] = useState<MemberDraft>({ full_name: "", photo_url: null, photo_focus: { x: 50, y: 50 } });
  const [adding, startAdding] = useTransition();
  const [, startTransition] = useTransition();
  const folder = { kind: "member", departmentId: department.id } as const;

  function add(event: React.FormEvent) {
    event.preventDefault();
    const name = draft.full_name.trim();
    if (!name) return;
    startAdding(async () => {
      const result = await addDepartmentMember(department.id, { ...draft, full_name: name });
      if (!result.ok) return void toast.error(t("failed"));
      setMembers((list) => [...list, { id: result.id, full_name: name, photo_url: draft.photo_url, photo_focus: draft.photo_focus, sort_order: list.length + 1 }]);
      setDraft({ full_name: "", photo_url: null, photo_focus: { x: 50, y: 50 } });
      toast.success(t("memberAdded"));
      router.refresh();
    });
  }

  function update(member: DepartmentMember, change: Partial<MemberDraft>) {
    const next = { ...member, ...change };
    if (!next.full_name.trim()) return;
    const previous = members;
    setMembers((list) => list.map((m) => (m.id === member.id ? next : m)));
    startTransition(async () => {
      const result = await updateDepartmentMember(member.id, { full_name: next.full_name, photo_url: next.photo_url, photo_focus: next.photo_focus });
      if (!result.ok) {
        setMembers(previous);
        return void toast.error(t("failed"));
      }
      toast.success(t("memberSaved"));
    });
  }

  async function remove(member: DepartmentMember) {
    const ok = await confirm({ title: t("deleteMemberTitle", { name: member.full_name }), confirmLabel: t("delete"), danger: true });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteDepartmentMember(member.id);
      if (!result.ok) return void toast.error(t("failed"));
      setMembers((list) => list.filter((m) => m.id !== member.id));
      toast.success(t("deleted"));
    });
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= members.length) return;
    const previous = members;
    const next = [...members];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setMembers(next);
    startTransition(async () => {
      const result = await reorderDepartmentMembers(department.id, next.map((m) => m.id));
      if (!result.ok) {
        setMembers(previous);
        toast.error(t("failed"));
      }
    });
  }

  return (
    <section data-tour="dept.members" className={card} aria-labelledby="members-title">
      <h2 id="members-title" className="font-extrabold text-grey">{t("membersTitle")}</h2>
      <p className="text-xs text-muted-foreground">{t("membersHint")}</p>

      <form onSubmit={add} className="mt-4 flex flex-col gap-3 rounded-xl bg-muted p-3 sm:flex-row sm:items-center">
        <PhotoField
          compact
          folder={folder}
          name={draft.full_name}
          url={draft.photo_url}
          focus={draft.photo_focus}
          onChange={(change) =>
            setDraft((d) => ({ ...d, ...(change.url !== undefined && { photo_url: change.url }), ...(change.focus && { photo_focus: change.focus }) }))
          }
        />
        <label className="min-w-0 flex-1 text-xs font-bold text-grey">
          <span className="sr-only">{t("memberName")}</span>
          <input
            value={draft.full_name}
            onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))}
            maxLength={120}
            placeholder={t("memberName")}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
          />
        </label>
        <button
          type="submit"
          disabled={adding || !draft.full_name.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-blue px-5 py-2 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          {adding ? t("adding") : t("addMember")}
        </button>
      </form>

      {members.length === 0 ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">{t("noMembers")}</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {members.map((member, index) => (
            <li key={member.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-2.5 sm:flex-nowrap">
              <PhotoField
                compact
                folder={folder}
                name={member.full_name}
                url={member.photo_url}
                focus={member.photo_focus}
                onChange={(change) =>
                  update(member, { ...(change.url !== undefined && { photo_url: change.url }), ...(change.focus && { photo_focus: change.focus }) })
                }
              />
              <label className="min-w-0 flex-1">
                <span className="sr-only">{t("memberName")}</span>
                <input
                  defaultValue={member.full_name}
                  maxLength={120}
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name && name !== member.full_name) update(member, { full_name: name });
                    else e.target.value = member.full_name;
                  }}
                  className="w-full rounded-lg border border-transparent px-2 py-1.5 text-sm font-bold text-ink outline-none hover:border-border focus:border-blue focus:ring-2 focus:ring-blue/20"
                />
              </label>
              <span className="flex shrink-0 gap-0.5">
                <button type="button" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={t("moveUp")} className="rounded-md p-1.5 text-grey hover:bg-muted disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={index === members.length - 1}
                  onClick={() => move(index, index + 1)}
                  aria-label={t("moveDown")}
                  className="rounded-md p-1.5 text-grey hover:bg-muted disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => remove(member)} aria-label={t("delete")} title={t("delete")} className="rounded-md p-1.5 text-pink hover:bg-pink/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
