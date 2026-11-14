"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import type { FieldType } from "@/lib/forms/schema";
import { typeIcons } from "./builder-shared";

export const TYPE_GROUPS: { key: string; types: FieldType[] }[] = [
  { key: "text", types: ["short_text", "long_text"] },
  { key: "contact", types: ["email", "phone", "url"] },
  { key: "numbers", types: ["number", "date", "time"] },
  { key: "choice", types: ["multiple_choice", "checkboxes", "dropdown", "yes_no", "consent"] },
  { key: "rating", types: ["rating", "nps"] },
  { key: "files", types: ["file"] },
  { key: "layout", types: ["heading", "statement", "divider"] },
];

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** The "/" command menu: search a question type and insert it. */
export function InsertMenu({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (type: FieldType) => void;
}) {
  const t = useTranslations("adminForms");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const flat = useMemo(() => {
    const q = normalize(query.trim());
    return TYPE_GROUPS.flatMap((group) =>
      group.types
        .filter((type) => !q || normalize(t(`editor.type.${type}`)).includes(q) || type.replace("_", " ").includes(q))
        .map((type) => ({ type, group: group.key })),
    );
  }, [query, t]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function pick(type: FieldType) {
    setQuery("");
    setActive(0);
    onPick(type);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(flat.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = flat[Math.min(active, flat.length - 1)];
      if (item) pick(item.type);
    }
  }

  useEffect(() => {
    dialogRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <dialog
      ref={dialogRef}
      onClose={() => {
        setQuery("");
        setActive(0);
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-label={t("palette.title")}
      className="m-auto mt-[12vh] w-[calc(100%-1.5rem)] max-w-lg overflow-hidden rounded-card border border-border bg-white p-0 shadow-soft backdrop:bg-black/40"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={t("palette.search")}
          aria-label={t("palette.search")}
          role="combobox"
          aria-expanded="true"
          aria-controls="insert-menu-list"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      <ul id="insert-menu-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
        {flat.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">{t("palette.empty")}</li>
        )}
        {flat.map((item, index) => {
          const Icon = typeIcons[item.type];
          const header = index === 0 || flat[index - 1].group !== item.group ? item.group : null;
          return (
            <li key={item.type} role="presentation">
              {header && (
                <p className="px-3 pb-1 pt-3 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  {t(`editor.groups.${header}`)}
                </p>
              )}
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                data-index={index}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(item.type)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${
                  index === active ? "bg-blue/10 text-blue" : "text-grey hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t(`editor.type.${item.type}`)}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-border bg-muted px-4 py-2 text-[11px] text-muted-foreground">
        {t("palette.hint")}
      </p>
    </dialog>
  );
}
