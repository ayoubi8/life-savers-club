"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Copy, GripVertical, Plus, Trash, X } from "lucide-react";
import { FieldInput } from "@/components/forms/field-input";
import { cn } from "@/lib/utils";
import {
  CHOICE_TYPES,
  DISPLAY_TYPES,
  FIELD_TYPES,
  TEXT_LIKE_TYPES,
  uid,
  type FieldOption,
  type FieldType,
  type FormField,
} from "@/lib/forms/schema";
import { typeIcons } from "./builder-shared";

const control =
  "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal outline-none focus:border-blue focus:ring-2 focus:ring-blue/20";

function OptionsEditor({
  field,
  onMutate,
}: {
  field: FormField;
  onMutate: (mutate: (options: FieldOption[]) => FieldOption[], key?: string) => void;
}) {
  const t = useTranslations("adminForms");
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const options = field.options ?? [];

  // Focus the option created/selected by the last keystroke once it has rendered.
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    rootRef.current?.querySelector<HTMLInputElement>(`[data-option="${id}"]`)?.focus();
  }, [field.options]);

  const setFocusId = (id: string) => {
    pendingFocus.current = id;
  };

  function addAfter(index: number, labels: string[] = [""]) {
    const created = labels.map((label) => ({ id: uid("o"), label }));
    onMutate((current) => {
      const next = [...current];
      next.splice(index + 1, 0, ...created);
      return next;
    });
    setFocusId(created[created.length - 1].id);
  }

  return (
    <div ref={rootRef} className="space-y-1.5">
      {options.map((option, index) => (
        <div key={option.id} className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "grid h-5 w-5 shrink-0 place-items-center border border-border bg-white text-[10px] font-bold text-muted-foreground",
              field.type === "checkboxes" ? "rounded-md" : "rounded-full",
            )}
          >
            {field.type === "dropdown" ? index + 1 : ""}
          </span>
          <input
            data-option={option.id}
            value={option.label}
            placeholder={t("editor.option", { n: index + 1 })}
            aria-label={t("editor.option", { n: index + 1 })}
            onChange={(event) => {
              const label = event.target.value;
              onMutate(
                (current) => current.map((item) => (item.id === option.id ? { ...item, label } : item)),
                `option:${field.id}:${option.id}`,
              );
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addAfter(index);
              } else if (event.key === "Backspace" && option.label === "" && options.length > 2) {
                event.preventDefault();
                const target = options[index - 1] ?? options[index + 1];
                onMutate((current) => current.filter((item) => item.id !== option.id));
                if (target) setFocusId(target.id);
              }
            }}
            onPaste={(event) => {
              const text = event.clipboardData.getData("text");
              if (!text.includes("\n")) return;
              const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
              if (lines.length < 2) return;
              event.preventDefault();
              const [first, ...rest] = lines;
              onMutate((current) => {
                const next = current.map((item) => (item.id === option.id ? { ...item, label: first } : item));
                next.splice(index + 1, 0, ...rest.map((label) => ({ id: uid("o"), label })));
                return next;
              });
            }}
            className="w-full rounded-lg border border-transparent bg-muted/60 px-3 py-2 text-sm outline-none focus:border-blue focus:bg-white"
          />
          <button
            type="button"
            onClick={() => onMutate((current) => current.filter((item) => item.id !== option.id))}
            disabled={options.length <= 2}
            aria-label={t("editor.removeOption")}
            title={t("editor.removeOption")}
            className="rounded-md p-2 text-muted-foreground hover:bg-pink/10 hover:text-pink disabled:opacity-30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => addAfter(options.length - 1)}
        className="ml-7 inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-bold text-blue hover:bg-blue/10"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("editor.addOption")}
      </button>
      <p className="ml-7 text-[11px] text-muted-foreground">{t("editor.optionsHint")}</p>
    </div>
  );
}

export type BlockHandlers = {
  onSelect: () => void;
  onPatch: (patch: Partial<FormField>) => void;
  onMutateOptions: (mutate: (options: FieldOption[]) => FieldOption[], key?: string) => void;
  onChangeType: (type: FieldType) => void;
  onDuplicate: () => void;
  onMove: (offset: number) => void;
  onMoveToPage: (pageIndex: number) => void;
  onRemove: () => void;
  onInsertBelow: () => void;
  onFocused: () => void;
};

export function Block({
  field,
  index,
  count,
  pageIndex,
  pageLabels,
  selected,
  autoFocus,
  handlers,
}: {
  field: FormField;
  index: number;
  count: number;
  pageIndex: number;
  pageLabels: string[];
  selected: boolean;
  autoFocus: boolean;
  handlers: BlockHandlers;
}) {
  const t = useTranslations("adminForms");
  const labelRef = useRef<HTMLInputElement>(null);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });
  const Icon = typeIcons[field.type];
  const display = DISPLAY_TYPES.includes(field.type);
  const isChoice = CHOICE_TYPES.includes(field.type);
  const { onFocused } = handlers;

  useEffect(() => {
    if (!autoFocus) return;
    labelRef.current?.focus();
    labelRef.current?.select();
    onFocused();
  }, [autoFocus, onFocused]);

  const labelClass =
    field.type === "heading"
      ? "text-xl font-extrabold text-blue"
      : "text-base font-bold text-grey";

  return (
    <div
      ref={setNodeRef}
      data-field={field.id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClickCapture={handlers.onSelect}
      onFocusCapture={() => !selected && handlers.onSelect()}
      className={cn(
        "rounded-xl border bg-white p-3 transition-shadow sm:p-4",
        selected ? "border-blue ring-2 ring-blue/15" : "border-border hover:border-blue/40",
        isDragging && "relative z-20 opacity-80 shadow-soft",
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={t("block.drag")}
          title={t("block.drag")}
          className="touch-none cursor-grab rounded-md p-2 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5 shrink-0 text-blue" />
          <span className="truncate">{t(`editor.type.${field.type}`)}</span>
        </span>

        <div className="ml-auto flex items-center gap-1">
          {!display && (
            <button
              type="button"
              aria-pressed={Boolean(field.required)}
              onClick={() => handlers.onPatch({ required: !field.required })}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-extrabold transition",
                field.required ? "bg-pink text-white" : "bg-muted text-muted-foreground hover:bg-border",
              )}
            >
              {field.required ? t("editor.requiredOn") : t("editor.requiredOff")}
            </button>
          )}
          {selected && (
            <>
              <BlockButton label={t("editor.moveUp")} disabled={index === 0} onClick={() => handlers.onMove(-1)}>
                <ArrowUp className="h-4 w-4" />
              </BlockButton>
              <BlockButton label={t("editor.moveDown")} disabled={index === count - 1} onClick={() => handlers.onMove(1)}>
                <ArrowDown className="h-4 w-4" />
              </BlockButton>
              <BlockButton label={t("editor.duplicate")} onClick={handlers.onDuplicate}>
                <Copy className="h-4 w-4" />
              </BlockButton>
              <BlockButton label={t("editor.remove")} danger onClick={handlers.onRemove}>
                <Trash className="h-4 w-4" />
              </BlockButton>
            </>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-2 pl-1 sm:pl-10">
        {field.type === "divider" ? (
          <hr className="my-3 border-border" />
        ) : (
          <input
            ref={labelRef}
            value={field.label}
            onChange={(event) => handlers.onPatch({ label: event.target.value })}
            placeholder={t("editor.labelPlaceholder")}
            aria-label={t("editor.label")}
            className={cn("w-full rounded-md bg-transparent px-1 py-1 outline-none focus:bg-muted/50", labelClass)}
          />
        )}

        {field.type !== "divider" && (selected || field.description || field.type === "statement") && (
          <textarea
            value={field.description ?? ""}
            onChange={(event) => handlers.onPatch({ description: event.target.value })}
            rows={field.type === "statement" ? 3 : 1}
            placeholder={t("editor.helpPlaceholder")}
            aria-label={t("editor.help")}
            className="w-full resize-y rounded-md bg-transparent px-1 py-1 text-sm text-muted-foreground outline-none focus:bg-muted/50"
          />
        )}

        {isChoice && <OptionsEditor field={field} onMutate={handlers.onMutateOptions} />}

        {!display && !isChoice && (
          <div className="pointer-events-none select-none opacity-80" aria-hidden>
            <FieldInput field={field} preview bare />
          </div>
        )}
      </div>

      {selected && (
        <div className="mt-4 grid gap-3 border-t border-border pt-3 sm:grid-cols-2 sm:pl-10">
          <label className="block text-xs font-bold text-grey">
            {t("editor.fieldType")}
            <select
              value={field.type}
              onChange={(event) => handlers.onChangeType(event.target.value as FieldType)}
              className={control}
            >
              {FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`editor.type.${type}`)}
                </option>
              ))}
            </select>
          </label>

          {pageLabels.length > 1 && (
            <label className="block text-xs font-bold text-grey">
              {t("page.moveToPage")}
              <select
                value={pageIndex}
                onChange={(event) => handlers.onMoveToPage(Number(event.target.value))}
                className={control}
              >
                {pageLabels.map((label, i) => (
                  <option key={i} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {TEXT_LIKE_TYPES.includes(field.type) && (
            <label className="block text-xs font-bold text-grey">
              {t("editor.placeholder")}
              <input
                value={field.placeholder ?? ""}
                onChange={(event) => handlers.onPatch({ placeholder: event.target.value })}
                className={control}
              />
            </label>
          )}

          {field.type === "rating" && (
            <label className="block text-xs font-bold text-grey">
              {t("editor.ratingMax")}
              <input
                type="number"
                min={2}
                max={10}
                value={field.max ?? 5}
                onChange={(event) => handlers.onPatch({ max: Number(event.target.value) })}
                className={control}
              />
            </label>
          )}

          {field.type === "number" && (
            <>
              <label className="block text-xs font-bold text-grey">
                {t("editor.min")}
                <input
                  type="number"
                  value={field.min ?? ""}
                  onChange={(event) =>
                    handlers.onPatch({ min: event.target.value === "" ? undefined : Number(event.target.value) })
                  }
                  className={control}
                />
              </label>
              <label className="block text-xs font-bold text-grey">
                {t("editor.max")}
                <input
                  type="number"
                  value={field.max ?? ""}
                  onChange={(event) =>
                    handlers.onPatch({ max: event.target.value === "" ? undefined : Number(event.target.value) })
                  }
                  className={control}
                />
              </label>
            </>
          )}

          {(field.type === "short_text" || field.type === "long_text") && (
            <label className="block text-xs font-bold text-grey">
              {t("editor.maxLength")}
              <input
                type="number"
                min={1}
                max={20000}
                value={field.maxLength ?? ""}
                onChange={(event) =>
                  handlers.onPatch({ maxLength: event.target.value === "" ? undefined : Number(event.target.value) })
                }
                className={control}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

function BlockButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-md p-2 text-muted-foreground disabled:opacity-30",
        danger ? "hover:bg-pink/10 hover:text-pink" : "hover:bg-muted hover:text-grey",
      )}
    >
      {children}
    </button>
  );
}
