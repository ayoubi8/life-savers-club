"use client";

import { useState, useTransition } from "react";
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
import { ArrowDown, ArrowUp, GripVertical, Star } from "lucide-react";
import { toast } from "sonner";
import { reorderFeatured } from "@/lib/events/actions";
import { cn } from "@/lib/utils";

type Item = { id: string; title: string; cover: string | null; focus: { x: number; y: number }; status: string };

function Row({ item, index, count, onMove }: { item: Item; index: number; count: number; onMove: (from: number, to: number) => void }) {
  const t = useTranslations("adminEvents.featuredPanel");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-3 rounded-xl border border-border bg-white p-2", isDragging && "relative z-10 shadow-soft")}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={t("drag", { title: item.title })}
        className="cursor-grab touch-none rounded-md p-1.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-6 text-center text-sm font-extrabold text-pink">{index + 1}</span>
      <span className="relative aspect-[16/10] w-16 shrink-0 overflow-hidden rounded-md bg-muted">
        {item.cover && (
          // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
          <img src={item.cover} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${item.focus.x}% ${item.focus.y}%` }} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-ink">{item.title}</span>
        {item.status !== "published" && <span className="block text-[11px] text-muted-foreground">{t("draft")}</span>}
      </span>
      <span className="flex gap-1">
        <button type="button" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={t("moveUp")} className="rounded-md p-1.5 text-grey hover:bg-muted disabled:opacity-30">
          <ArrowUp className="h-4 w-4" />
        </button>
        <button type="button" disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label={t("moveDown")} className="rounded-md p-1.5 text-grey hover:bg-muted disabled:opacity-30">
          <ArrowDown className="h-4 w-4" />
        </button>
      </span>
    </li>
  );
}

/** Ordered list of featured events (home page + top of /events). Drag, keyboard or arrows. */
export function FeaturedOrder({ items: initial }: { items: Item[] }) {
  const t = useTranslations("adminEvents.featuredPanel");
  const tCommon = useTranslations("adminEvents");
  const [items, setItems] = useState(initial);
  const [synced, setSynced] = useState(initial);
  const [, startTransition] = useTransition();
  // Follow server updates (a star toggled in the list) without an effect.
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
      const result = await reorderFeatured(next.map((item) => item.id));
      if (!result.ok) {
        setItems(previous);
        toast.error(tCommon("failed"));
        return;
      }
      toast.success(t("saved"));
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    move(
      items.findIndex((item) => item.id === active.id),
      items.findIndex((item) => item.id === over.id),
    );
  }

  return (
    <section data-tour="events.featured" aria-labelledby="featured-title" className="mb-6 rounded-card border border-border bg-white p-4">
      <h2 id="featured-title" className="flex items-center gap-2 font-extrabold text-grey">
        <Star className="h-4 w-4 text-[#f5a524]" fill="currentColor" aria-hidden />
        {t("title")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{items.length ? t("hint") : t("empty")}</p>
      {items.length > 0 && (
        <DndContext id="featured-events" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <ol className="mt-3 space-y-2">
              {items.map((item, index) => (
                <Row key={item.id} item={item} index={index} count={items.length} onMove={move} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
