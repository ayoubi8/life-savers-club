"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, ExternalLink, GripVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm";
import { Link, useRouter } from "@/i18n/navigation";
import { deleteDepartment, reorderDepartments } from "@/lib/team/actions";
import { themeBand } from "@/lib/team/theme";
import type { DepartmentCard } from "@/lib/team/types";
import { initials } from "@/lib/team/utils";
import { cn } from "@/lib/utils";

type Item = DepartmentCard;

function Row({
  item,
  index,
  count,
  locale,
  onMove,
  onDelete,
}: {
  item: Item;
  index: number;
  count: number;
  locale: string;
  onMove: (from: number, to: number) => void;
  onDelete: (item: Item) => void;
}) {
  const t = useTranslations("adminTeam.list");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const published = item.status === "published";
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-3 rounded-xl border border-border bg-white p-2.5", isDragging && "relative z-10 shadow-soft")}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={t("drag", { name: item.name_fr })}
        className="cursor-grab touch-none rounded-md p-1.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {/* Theme swatch with the leader's photo, as the ring on /team. */}
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full p-0.5" style={{ background: themeBand(item.theme) }}>
        <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-white text-xs font-extrabold text-grey">
          {item.leader_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
            <img
              src={item.leader_photo_url}
              alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: `${item.leader_photo_focus.x}% ${item.leader_photo_focus.y}%` }}
            />
          ) : (
            initials(item.leader_name || item.name_fr)
          )}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <Link href={`/admin/team/${item.id}/details`} className="block truncate font-bold text-ink hover:text-blue">
          {item.name_fr}
        </Link>
        <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <span className={cn("rounded-full px-2 py-0.5 font-bold uppercase tracking-wide", published ? "bg-green/10 text-green" : "bg-muted")}>
            {t(published ? "published" : "draft")}
          </span>
          <span className="truncate">{item.leader_name || t("noLeader")}</span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5">
        <button type="button" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={t("moveUp")} className="hidden rounded-md p-1.5 text-grey hover:bg-muted disabled:opacity-30 sm:block">
          <ArrowUp className="h-4 w-4" />
        </button>
        <button type="button" disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label={t("moveDown")} className="hidden rounded-md p-1.5 text-grey hover:bg-muted disabled:opacity-30 sm:block">
          <ArrowDown className="h-4 w-4" />
        </button>
        <Link href={`/admin/team/${item.id}/details`} aria-label={t("edit")} title={t("edit")} className="rounded-md p-1.5 text-grey hover:bg-muted hover:text-blue">
          <Pencil className="h-4 w-4" />
        </Link>
        <a
          href={`/${locale}/team/${item.slug}`}
          target="_blank"
          rel="noreferrer"
          aria-label={t("view")}
          title={t("view")}
          className="rounded-md p-1.5 text-grey hover:bg-muted hover:text-blue"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        <button type="button" onClick={() => onDelete(item)} aria-label={t("delete")} title={t("delete")} className="rounded-md p-1.5 text-pink hover:bg-pink/10">
          <Trash2 className="h-4 w-4" />
        </button>
      </span>
    </li>
  );
}

/** Departments in their /team order: drag (or arrows / keyboard) to reorder, edit, view, delete. */
export function DepartmentsList({ items: initial, locale }: { items: Item[]; locale: string }) {
  const t = useTranslations("adminTeam.list");
  const router = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [synced, setSynced] = useState(initial);
  const [, startTransition] = useTransition();
  if (initial !== synced) {
    setSynced(initial);
    setItems(initial);
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const previous = items;
    const next = arrayMove(items, from, to);
    setItems(next);
    startTransition(async () => {
      const result = await reorderDepartments(next.map((item) => item.id));
      if (!result.ok) {
        setItems(previous);
        toast.error(t("failed"));
        return;
      }
      toast.success(t("orderSaved"));
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    move(
      items.findIndex((item) => item.id === active.id),
      items.findIndex((item) => item.id === over.id),
    );
  }

  async function remove(item: Item) {
    const ok = await confirm({
      title: t("deleteTitle", { name: item.name_fr }),
      message: t("deleteText"),
      confirmLabel: t("delete"),
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteDepartment(item.id);
      if (!result.ok) return void toast.error(t("failed"));
      setItems((list) => list.filter((i) => i.id !== item.id));
      toast.success(t("deleted"));
      router.refresh();
    });
  }

  if (!items.length) {
    return <p className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <DndContext id="departments" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ol className="space-y-2">
          {items.map((item, index) => (
            <Row key={item.id} item={item} index={index} count={items.length} locale={locale} onMove={move} onDelete={remove} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
