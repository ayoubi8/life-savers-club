"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, GripVertical, ImagePlus, Plus, RotateCcw, Save, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm";
import type { L10n } from "@/lib/site";
import { BRAND_COLORS, ICON_NAMES, SITE_ICONS, type BrandColor, type SiteIcon } from "@/lib/site-content/icons";
import type { SiteImage } from "@/lib/site-content/schema";
import { uploadSiteImage } from "@/lib/site-content/upload";
import { cn } from "@/lib/utils";

export const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-normal text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20";

/** A section card with a title and optional hint. */
export function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-card border border-border bg-white p-5">
      <h2 id={id} className="text-lg font-extrabold text-grey">{title}</h2>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** Single-language text input. */
export function TextField({
  label,
  value,
  onChange,
  max = 120,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
  type?: "text" | "email" | "tel" | "url";
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-bold text-grey">
      {label}
      <input type={type} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </label>
  );
}

/** French + English versions of the same text, side by side. English falls back to French when empty. */
export function L10nField({
  label,
  value,
  onChange,
  max = 120,
  rows,
}: {
  label: string;
  value: L10n;
  onChange: (value: L10n) => void;
  max?: number;
  /** Renders a textarea with this many rows. */
  rows?: number;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-bold text-grey">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {(["fr", "en"] as const).map((lang) => {
          const common = {
            value: value[lang],
            maxLength: max,
            "aria-label": `${label} (${lang.toUpperCase()})`,
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [lang]: e.target.value }),
            className: cn(inputClass, "pl-10"),
          };
          return (
            <div key={lang} className="relative">
              <span className="pointer-events-none absolute left-2 top-3 rounded bg-muted px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-grey">
                {lang}
              </span>
              {rows ? <textarea rows={rows} {...common} /> : <input {...common} />}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Image upload with preview and FR/EN alt text. `fallback` adds a reset button; otherwise the image can be removed. */
export function ImageField({
  label,
  value,
  onChange,
  fallback,
  hint,
  round = false,
}: {
  label: string;
  value: SiteImage | null;
  onChange: (value: SiteImage | null) => void;
  fallback?: SiteImage;
  hint?: string;
  round?: boolean;
}) {
  const t = useTranslations("adminPages.fields");
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setProgress(0);
    const result = await uploadSiteImage(file, setProgress);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    if (!result.ok) return void toast.error(t(`uploadError.${result.error}`));
    onChange({ url: result.url, alt: value?.alt ?? { fr: "", en: "" } });
  }

  return (
    <fieldset className="rounded-xl border border-dashed border-border p-3">
      <legend className="px-1 text-xs font-bold text-grey">{label}</legend>
      {hint && <p className="mb-2 text-xs text-muted-foreground">{hint}</p>}
      <div className="flex flex-wrap items-start gap-4">
        <div
          className={cn(
            "grid h-24 w-24 shrink-0 place-items-center overflow-hidden border border-border bg-muted",
            round ? "rounded-full" : "rounded-lg",
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- small admin preview
            <img src={value.url} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0])}
              aria-label={label}
            />
            <button
              type="button"
              disabled={progress !== null}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue px-3 py-1.5 text-xs font-bold text-blue hover:bg-blue/10 disabled:opacity-50"
            >
              <ImagePlus className="h-3.5 w-3.5" aria-hidden />
              {progress !== null ? t("uploading", { percent: Math.round(progress * 100) }) : value ? t("replace") : t("upload")}
            </button>
            {fallback && value?.url !== fallback.url && (
              <button
                type="button"
                onClick={() => onChange(fallback)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-grey hover:bg-muted"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {t("reset")}
              </button>
            )}
            {!fallback && value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-pink hover:bg-pink/10"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {t("remove")}
              </button>
            )}
          </div>
          {value && (
            <L10nField label={t("alt")} value={value.alt} max={120} onChange={(alt) => onChange({ ...value, alt })} />
          )}
        </div>
      </div>
    </fieldset>
  );
}

const COLOR_CLASS: Record<BrandColor, string> = { pink: "bg-pink", blue: "bg-blue", green: "bg-green" };

/** Brand colour (pink / blue / green) as swatches. */
export function ColorPick({ value, onChange }: { value: BrandColor; onChange: (value: BrandColor) => void }) {
  const t = useTranslations("adminPages.fields");
  return (
    <fieldset>
      <legend className="text-xs font-bold text-grey">{t("color")}</legend>
      <div className="mt-1 flex gap-2">
        {BRAND_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-pressed={value === color}
            aria-label={t(`colors.${color}`)}
            title={t(`colors.${color}`)}
            onClick={() => onChange(color)}
            className={cn(
              "h-8 w-8 rounded-full ring-offset-2",
              COLOR_CLASS[color],
              value === color ? "ring-2 ring-ink" : "opacity-60 hover:opacity-100",
            )}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** Icon from the fixed set. */
export function IconPick({ value, color, onChange }: { value: SiteIcon; color: BrandColor; onChange: (value: SiteIcon) => void }) {
  const t = useTranslations("adminPages.fields");
  return (
    <fieldset>
      <legend className="text-xs font-bold text-grey">{t("icon")}</legend>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {ICON_NAMES.map((name) => {
          const Icon = SITE_ICONS[name];
          const active = value === name;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={active}
              aria-label={name}
              title={name}
              onClick={() => onChange(name)}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-lg border",
                active ? cn("border-transparent text-white", COLOR_CLASS[color]) : "border-border text-grey hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// ───────── Sortable list of items (stats, values, milestones, testimonials, sponsors, socials) ─────────

function SortableItem({
  id,
  index,
  count,
  title,
  open,
  onToggle,
  onMove,
  onRemove,
  children,
}: {
  id: string;
  index: number;
  count: number;
  title: string;
  open: boolean;
  onToggle: () => void;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("adminPages.fields");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("rounded-xl border border-border bg-white", isDragging && "relative z-10 shadow-soft")}
    >
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={t("drag", { title })}
          className="cursor-grab touch-none rounded-md p-1.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="w-6 shrink-0 text-center text-sm font-extrabold text-pink">{index + 1}</span>
          <span className="truncate text-sm font-bold text-ink">{title || t("untitled")}</span>
          <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        <span className="flex gap-0.5">
          <button type="button" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={t("moveUp")} className="rounded-md p-1.5 text-grey hover:bg-muted disabled:opacity-30">
            <ArrowUp className="h-4 w-4" />
          </button>
          <button type="button" disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label={t("moveDown")} className="rounded-md p-1.5 text-grey hover:bg-muted disabled:opacity-30">
            <ArrowDown className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRemove} aria-label={t("removeItem", { title: title || t("untitled") })} className="rounded-md p-1.5 text-pink hover:bg-pink/10">
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      </div>
      {open && <div className="space-y-4 border-t border-border p-4">{children}</div>}
    </li>
  );
}

export function SortableList<T extends { id: string }>({
  items,
  onChange,
  create,
  max,
  addLabel,
  itemTitle,
  renderItem,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => Omit<T, "id">;
  max: number;
  addLabel: string;
  itemTitle: (item: T) => string;
  renderItem: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const t = useTranslations("adminPages.fields");
  const confirm = useConfirm();
  const dndId = useId();
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    onChange(arrayMove(items, from, to));
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    move(items.findIndex((item) => item.id === active.id), items.findIndex((item) => item.id === over.id));
  };
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const add = () => {
    const id = crypto.randomUUID().slice(0, 12);
    onChange([...items, { ...create(), id } as T]);
    setOpen((current) => new Set(current).add(id));
  };
  const remove = async (item: T) => {
    const ok = await confirm({ title: t("removeConfirm"), message: itemTitle(item) || t("untitled"), confirmLabel: t("remove"), danger: true });
    if (ok) onChange(items.filter((other) => other.id !== item.id));
  };

  return (
    <div>
      {items.length === 0 && <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>}
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
            {items.map((item, index) => (
              <SortableItem
                key={item.id}
                id={item.id}
                index={index}
                count={items.length}
                title={itemTitle(item)}
                open={open.has(item.id)}
                onToggle={() => toggle(item.id)}
                onMove={move}
                onRemove={() => remove(item)}
              >
                {renderItem(item, (patch) => onChange(items.map((other) => (other.id === item.id ? { ...other, ...patch } : other))))}
              </SortableItem>
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        disabled={items.length >= max}
        onClick={add}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-blue px-4 py-2 text-xs font-bold text-blue hover:bg-blue/10 disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {items.length >= max ? t("max", { max }) : addLabel}
      </button>
    </div>
  );
}

// ───────── Form state + save bar ─────────

type SaveResult = { ok: true } | { ok: false; error: string };

/** Draft state for a settings page: dirty tracking, save via server action, undo, leave warning. */
export function useSiteForm<T>(initial: T, action: (value: T) => Promise<SaveResult>) {
  const t = useTranslations("adminPages");
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function save() {
    startTransition(async () => {
      const result = await action(values);
      if (!result.ok) return void toast.error(t("failed"));
      setSaved(values);
      toast.success(t("saved"));
    });
  }

  /** Setter for one top-level section: `section("hero")("title1")(value)`. */
  const section =
    <K extends keyof T>(key: K) =>
    <F extends keyof T[K]>(field: F) =>
    (value: T[K][F]) =>
      setValues((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));

  return { values, setValues, dirty, pending, save, undo: () => setValues(saved), section };
}

export function SaveBar({
  dirty,
  pending,
  onSave,
  onUndo,
  viewHref,
}: {
  dirty: boolean;
  pending: boolean;
  onSave: () => void;
  onUndo: () => void;
  viewHref: string;
}) {
  const t = useTranslations("adminPages");
  return (
    <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-full border border-border bg-white/95 px-4 py-2 shadow-soft backdrop-blur">
      <span className={cn("text-xs font-bold", dirty ? "text-pink" : "text-muted-foreground")} role="status">
        {dirty ? t("unsaved") : t("upToDate")}
      </span>
      <span className="flex items-center gap-2">
        <a href={viewHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold text-blue hover:bg-blue/10">
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {t("view")}
        </a>
        {dirty && (
          <button type="button" onClick={onUndo} disabled={pending} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold text-grey hover:bg-muted">
            <Undo2 className="h-3.5 w-3.5" aria-hidden />
            {t("undo")}
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || pending}
          className="inline-flex items-center gap-1.5 rounded-full bg-pink px-4 py-2 text-xs font-extrabold text-white hover:opacity-90 disabled:opacity-40"
        >
          <Save className="h-4 w-4" aria-hidden />
          {pending ? t("saving") : t("save")}
        </button>
      </span>
    </div>
  );
}
