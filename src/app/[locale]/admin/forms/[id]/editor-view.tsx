"use client";

import { Fragment, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ArrowDown, ArrowUp, FilePlus2, Plus, Trash } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm";
import {
  defaultField,
  uid,
  type FieldOption,
  type FieldType,
  type FormField,
  type FormPage,
  type FormSchema,
} from "@/lib/forms/schema";
import { renameForm } from "@/lib/forms/actions";
import { useBuilder } from "./builder-provider";
import { Block } from "./block";
import { InsertMenu } from "./insert-menu";

const TYPED_KEYS = ["label", "description", "placeholder", "min", "max", "maxLength"];

type Found = { page: FormPage; pageIndex: number; index: number; field: FormField };

/** Locate a question anywhere in the form (works on the live schema or on an immer-style draft). */
function findIn(schema: FormSchema, id: string): Found | null {
  for (let pageIndex = 0; pageIndex < schema.pages.length; pageIndex += 1) {
    const page = schema.pages[pageIndex];
    const index = page.fields.findIndex((field) => field.id === id);
    if (index >= 0) return { page, pageIndex, index, field: page.fields[index] };
  }
  return null;
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable)
  );
}

/** Title input on the canvas; saves on blur. Remounted (via key) when the saved title changes elsewhere. */
function TitleField({ formId, initial }: { formId: string; initial: string }) {
  const t = useTranslations("adminForms");
  const router = useRouter();
  const [value, setValue] = useState(initial);

  async function save() {
    const clean = value.trim();
    if (!clean) {
      setValue(initial);
      return;
    }
    if (clean === initial) return;
    const result = await renameForm(formId, clean);
    if (result.ok) router.refresh();
    else toast.error(t(`errors.${result.error ?? "update_failed"}`));
  }

  return (
    <input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      maxLength={200}
      placeholder={t("editor.titlePlaceholder")}
      aria-label={t("editor.titlePlaceholder")}
      className="w-full rounded-md bg-transparent px-1 py-1 text-3xl font-extrabold text-blue outline-none focus:bg-muted/50"
    />
  );
}

function InsertSlot({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="group relative flex h-3 items-center justify-center">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className="absolute z-10 grid h-6 w-6 place-items-center rounded-full bg-blue text-white opacity-0 shadow-soft transition focus:opacity-100 group-hover:opacity-100"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function EditorView() {
  const t = useTranslations("adminForms");
  const confirm = useConfirm();
  const { form, schema, selectedId, setSelectedId, commit, undo, redo, reveal, clearReveal } =
    useBuilder();
  const [palette, setPalette] = useState<{ pageIndex: number; index: number } | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const pages = schema.pages;
  const multiPage = pages.length > 1;
  const pageLabels = pages.map((page, index) => page.title?.trim() || t("page.number", { n: index + 1 }));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function update(mutate: (draft: FormSchema) => void, key?: string) {
    commit(mutate, key);
  }

  // ───────── question operations ─────────
  function patchField(id: string, patch: Partial<FormField>) {
    const keys = Object.keys(patch);
    const typed = keys.every((key) => TYPED_KEYS.includes(key));
    update(
      (draft) => {
        const found = findIn(draft, id);
        if (found) Object.assign(found.field, patch);
      },
      typed ? `field:${id}:${keys.join(",")}` : undefined,
    );
  }

  function mutateOptions(id: string, fn: (options: FieldOption[]) => FieldOption[], key?: string) {
    update((draft) => {
      const found = findIn(draft, id);
      if (found) found.field.options = fn(found.field.options ?? []);
    }, key);
  }

  function changeType(id: string, type: FieldType) {
    update((draft) => {
      const found = findIn(draft, id);
      if (!found) return;
      const previous = found.field;
      const next = defaultField(type);
      const choice = type === "multiple_choice" || type === "checkboxes" || type === "dropdown";
      found.page.fields[found.index] = {
        ...next,
        id: previous.id,
        label: previous.label || next.label,
        description: previous.description,
        required: previous.required,
        options: choice && previous.options && previous.options.length >= 2 ? previous.options : next.options,
      };
    });
  }

  function insertField(type: FieldType, pageIndex: number, index: number) {
    const field = defaultField(type);
    field.label =
      type === "consent" ? t("editor.defaults.consent") : type === "divider" ? "" : t(`editor.type.${type}`);
    update((draft) => {
      draft.pages[pageIndex]?.fields.splice(index, 0, field);
    });
    setSelectedId(field.id);
    setFocusId(field.id);
  }

  function removeField(id: string) {
    update((draft) => {
      const found = findIn(draft, id);
      if (found) found.page.fields.splice(found.index, 1);
    });
    if (selectedId === id) setSelectedId(null);
    toast(t("questionDeleted"), { duration: 6000, action: { label: t("undo"), onClick: () => undo() } });
  }

  /** Move within the page; at the edge of a page, continue into the neighbouring page. */
  function moveField(id: string, offset: number) {
    update((draft) => {
      const found = findIn(draft, id);
      if (!found) return;
      const { page, pageIndex, index } = found;
      const target = index + offset;
      if (target >= 0 && target < page.fields.length) {
        [page.fields[index], page.fields[target]] = [page.fields[target], page.fields[index]];
      } else if (offset < 0 && pageIndex > 0) {
        const [moved] = page.fields.splice(index, 1);
        draft.pages[pageIndex - 1].fields.push(moved);
      } else if (offset > 0 && pageIndex < draft.pages.length - 1) {
        const [moved] = page.fields.splice(index, 1);
        draft.pages[pageIndex + 1].fields.unshift(moved);
      }
    });
  }

  function moveToPage(id: string, pageIndex: number) {
    update((draft) => {
      const found = findIn(draft, id);
      if (!found || !draft.pages[pageIndex] || found.pageIndex === pageIndex) return;
      const [moved] = found.page.fields.splice(found.index, 1);
      draft.pages[pageIndex].fields.push(moved);
    });
  }

  function duplicateField(id: string) {
    const found = findIn(schema, id);
    if (!found) return;
    const copy = structuredClone(found.field);
    copy.id = uid("q");
    copy.options = copy.options?.map((option) => ({ ...option, id: uid("o") }));
    update((draft) => {
      const target = findIn(draft, id);
      if (target) target.page.fields.splice(target.index + 1, 0, copy);
    });
    setSelectedId(copy.id);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = findIn(schema, String(active.id));
    const to = findIn(schema, String(over.id));
    if (!from || !to) return;
    update((draft) => {
      const source = findIn(draft, String(active.id));
      const target = findIn(draft, String(over.id));
      if (!source || !target) return;
      const [moved] = source.page.fields.splice(source.index, 1);
      // Land at the position of the item it was dropped on (same page or another).
      target.page.fields.splice(target.index, 0, moved);
    });
  }

  // ───────── page operations ─────────
  function addPage() {
    const page: FormPage = { id: uid("p"), title: "", description: "", fields: [] };
    update((draft) => {
      draft.pages.push(page);
    });
    toast.success(t("page.added"));
  }

  function patchPage(pageId: string, patch: Partial<FormPage>) {
    update(
      (draft) => {
        const page = draft.pages.find((item) => item.id === pageId);
        if (page) Object.assign(page, patch);
      },
      `page:${pageId}:${Object.keys(patch).join(",")}`,
    );
  }

  function movePage(pageId: string, offset: number) {
    update((draft) => {
      const index = draft.pages.findIndex((page) => page.id === pageId);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= draft.pages.length) return;
      [draft.pages[index], draft.pages[target]] = [draft.pages[target], draft.pages[index]];
    });
  }

  async function removePage(page: FormPage, label: string) {
    if (pages.length <= 1) return;
    if (page.fields.length > 0) {
      const ok = await confirm({
        title: t("page.deleteTitle", { name: label }),
        message: t("page.deleteMessage", { count: page.fields.length }),
        confirmLabel: t("page.delete"),
        danger: true,
      });
      if (!ok) return;
    }
    update((draft) => {
      draft.pages = draft.pages.filter((item) => item.id !== page.id);
    });
    toast(t("page.deleted"), { duration: 6000, action: { label: t("undo"), onClick: () => undo() } });
  }

  function openPalette(pageIndex?: number, index?: number) {
    if (pageIndex !== undefined) {
      setPalette({ pageIndex, index: index ?? pages[pageIndex].fields.length });
      return;
    }
    const found = selectedId ? findIn(schema, selectedId) : null;
    if (found) setPalette({ pageIndex: found.pageIndex, index: found.index + 1 });
    else setPalette({ pageIndex: pages.length - 1, index: pages[pages.length - 1].fields.length });
  }

  // Shortcuts: undo/redo, "/" insert menu, Alt+↑/↓ move, Ctrl+D duplicate.
  // Re-registered every render so it always sees the latest state.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (mod && !event.altKey) {
        if (key === "z" && !event.shiftKey) {
          event.preventDefault();
          undo();
        } else if ((key === "z" && event.shiftKey) || key === "y") {
          event.preventDefault();
          redo();
        } else if (key === "d" && selectedId) {
          event.preventDefault();
          duplicateField(selectedId);
        }
        return;
      }
      if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown") && selectedId) {
        event.preventDefault();
        moveField(selectedId, event.key === "ArrowUp" ? -1 : 1);
        return;
      }
      if (event.key === "/" && !mod && !event.altKey && !isTyping(event.target) && palette === null) {
        event.preventDefault();
        openPalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Jump to a question (used when publishing finds an incomplete one).
  useEffect(() => {
    if (!reveal) return;
    const element = document.querySelector<HTMLElement>(`[data-field="${reveal}"]`);
    element?.scrollIntoView({ block: "center", behavior: "smooth" });
    element?.querySelector<HTMLInputElement>("input")?.focus();
    clearReveal();
  }, [reveal, clearReveal, pages]);

  const firstPage = pages[0];

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <section className="rounded-card border border-border bg-white p-4 sm:p-8">
        <TitleField key={form.title} formId={form.id} initial={form.title} />
        <textarea
          value={firstPage.description ?? ""}
          onChange={(event) => patchPage(firstPage.id, { description: event.target.value })}
          rows={2}
          placeholder={t("editor.descriptionPlaceholder")}
          aria-label={t("editor.pageDescription")}
          className="mt-2 w-full resize-y rounded-md bg-transparent px-1 py-1 text-sm text-muted-foreground outline-none focus:bg-muted/50"
        />
      </section>

      <DndContext id="form-blocks" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        {pages.map((page, pageIndex) => (
          <section key={page.id} aria-label={pageLabels[pageIndex]} className="space-y-3">
            {multiPage && (
              <div className="mt-4 rounded-xl border border-blue/20 bg-blue/5 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
                    {t("page.number", { n: pageIndex + 1 })}
                  </span>
                  <input
                    value={page.title ?? ""}
                    onChange={(event) => patchPage(page.id, { title: event.target.value })}
                    placeholder={t("page.titlePlaceholder")}
                    aria-label={t("page.titlePlaceholder")}
                    className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1.5 text-sm font-bold text-grey outline-none focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => movePage(page.id, -1)}
                    disabled={pageIndex === 0}
                    aria-label={t("page.moveUp")}
                    title={t("page.moveUp")}
                    className="rounded-md p-2 text-muted-foreground hover:bg-white disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePage(page.id, 1)}
                    disabled={pageIndex === pages.length - 1}
                    aria-label={t("page.moveDown")}
                    title={t("page.moveDown")}
                    className="rounded-md p-2 text-muted-foreground hover:bg-white disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removePage(page, pageLabels[pageIndex])}
                    aria-label={t("page.delete")}
                    title={t("page.delete")}
                    className="rounded-md p-2 text-muted-foreground hover:bg-pink/10 hover:text-pink"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
                {pageIndex > 0 && (
                  <textarea
                    value={page.description ?? ""}
                    onChange={(event) => patchPage(page.id, { description: event.target.value })}
                    rows={1}
                    placeholder={t("page.descriptionPlaceholder")}
                    aria-label={t("page.descriptionPlaceholder")}
                    className="mt-1 w-full resize-y rounded-md bg-transparent px-2 py-1 text-sm text-muted-foreground outline-none focus:bg-white"
                  />
                )}
              </div>
            )}

            {page.fields.length === 0 ? (
              <div className="rounded-card border border-dashed border-border bg-white px-6 py-8 text-center">
                <p className="font-bold text-grey">{t("editor.empty")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("editor.emptyHint")}</p>
              </div>
            ) : (
              <SortableContext items={page.fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
                <div>
                  {page.fields.map((field, index) => (
                    <Fragment key={field.id}>
                      {index > 0 && (
                        <InsertSlot onClick={() => openPalette(pageIndex, index)} label={t("block.insertHere")} />
                      )}
                      <Block
                        field={field}
                        index={index}
                        count={page.fields.length}
                        pageIndex={pageIndex}
                        pageLabels={pageLabels}
                        selected={selectedId === field.id}
                        autoFocus={focusId === field.id}
                        handlers={{
                          onSelect: () => selectedId !== field.id && setSelectedId(field.id),
                          onPatch: (patch) => patchField(field.id, patch),
                          onMutateOptions: (fn, key) => mutateOptions(field.id, fn, key),
                          onChangeType: (type) => changeType(field.id, type),
                          onDuplicate: () => duplicateField(field.id),
                          onMove: (offset) => moveField(field.id, offset),
                          onMoveToPage: (target) => moveToPage(field.id, target),
                          onRemove: () => removeField(field.id),
                          onInsertBelow: () => openPalette(pageIndex, index + 1),
                          onFocused: () => setFocusId(null),
                        }}
                      />
                    </Fragment>
                  ))}
                </div>
              </SortableContext>
            )}

            <button
              type="button"
              onClick={() => openPalette(pageIndex, page.fields.length)}
              className="flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-blue/40 bg-white px-4 py-4 text-sm font-bold text-blue hover:bg-blue/5"
            >
              <Plus className="h-4 w-4" />
              {t("editor.addField")}
              {pageIndex === pages.length - 1 && (
                <kbd className="ml-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">/</kbd>
              )}
            </button>
          </section>
        ))}
      </DndContext>

      <button
        type="button"
        onClick={addPage}
        className="flex w-full items-center justify-center gap-2 rounded-card border border-border bg-white px-4 py-3 text-sm font-bold text-grey hover:border-blue hover:text-blue"
      >
        <FilePlus2 className="h-4 w-4" />
        {t("page.add")}
      </button>
      <p className="text-center text-xs text-muted-foreground">{t("page.hint")}</p>

      <p className="pb-6 text-center text-xs text-muted-foreground">{t("editor.shortcuts")}</p>

      <InsertMenu
        open={palette !== null}
        onClose={() => setPalette(null)}
        onPick={(type) => {
          if (palette) insertField(type, palette.pageIndex, palette.index);
          setPalette(null);
        }}
      />
    </div>
  );
}
