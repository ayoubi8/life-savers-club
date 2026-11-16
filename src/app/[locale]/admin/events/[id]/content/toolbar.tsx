"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { useTranslations } from "next-intl";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Columns2,
  Columns3,
  Film,
  GalleryHorizontalEnd,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Megaphone,
  Minus,
  MousePointerClick,
  Palette,
  Pilcrow,
  Plus,
  Quote,
  Redo2,
  RemoveFormatting,
  Space,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { FONT_SIZES, safeHref } from "@/lib/events/content";
import { cn } from "@/lib/utils";
import { useEventMedia } from "./media-context";

const COLORS = ["#231f20", "#414042", "#ef4a6c", "#2d74ba", "#6ebd45", "#d97706", "#6240e8", "#0e7490"];
const HIGHLIGHTS = ["#fff3a3", "#ffd6e0", "#d6e8fb", "#dff3d2", "#ffe4c2"];

const btn = (active = false) =>
  cn("grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-grey transition hover:bg-muted disabled:opacity-30", active && "bg-blue/10 text-blue");

/** Inserts 2 or 3 empty columns and puts the cursor in the first one (not the last). */
function insertColumns(editor: Editor, count: 2 | 3) {
  editor
    .chain()
    .focus()
    .insertContent({ type: "columns", content: Array.from({ length: count }, () => ({ type: "column", content: [{ type: "paragraph" }] })) })
    .command(({ tr }) => {
      const $from = tr.selection.$from;
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        if ($from.node(depth).type.name === "columns") {
          // columns start +1 = first column, +1 = its paragraph, +1 = inside the paragraph
          tr.setSelection(TextSelection.create(tr.doc, $from.before(depth) + 3));
          return true;
        }
      }
      return true;
    })
    .run();
}

/* Insert palette ------------------------------------------------------------- */

type InsertItem = { key: string; icon: LucideIcon; group: "text" | "media" | "layout"; run: (editor: Editor) => void | Promise<void> };

export function useInsertItems(): InsertItem[] {
  const media = useEventMedia();
  return useMemo<InsertItem[]>(
    () => [
      { key: "paragraph", icon: Pilcrow, group: "text", run: (e) => void e.chain().focus().setParagraph().run() },
      { key: "heading2", icon: Heading2, group: "text", run: (e) => void e.chain().focus().setHeading({ level: 2 }).run() },
      { key: "heading3", icon: Heading3, group: "text", run: (e) => void e.chain().focus().setHeading({ level: 3 }).run() },
      { key: "bulletList", icon: List, group: "text", run: (e) => void e.chain().focus().toggleBulletList().run() },
      { key: "orderedList", icon: ListOrdered, group: "text", run: (e) => void e.chain().focus().toggleOrderedList().run() },
      { key: "quote", icon: Quote, group: "text", run: (e) => void e.chain().focus().toggleBlockquote().run() },
      {
        key: "callout",
        icon: Megaphone,
        group: "text",
        run: (e) => void e.chain().focus().insertContent({ type: "callout", attrs: { tone: "info" }, content: [{ type: "paragraph" }] }).run(),
      },
      {
        key: "image",
        icon: ImageIcon,
        group: "media",
        run: async (e) => {
          const result = await media.pick("image");
          if (result?.type !== "media") return;
          const item = result.items[0];
          e.chain().focus().insertContent({ type: "image", attrs: { src: item.url, alt: item.alt, mediaId: item.id } }).run();
        },
      },
      {
        key: "gallery",
        icon: GalleryHorizontalEnd,
        group: "media",
        run: async (e) => {
          const result = await media.pick("image", { multiple: true });
          if (result?.type !== "media") return;
          e.chain().focus().insertContent({
            type: "gallery",
            attrs: { images: result.items.map((item) => ({ src: item.url, alt: item.alt, caption: "", mediaId: item.id })) },
          }).run();
        },
      },
      {
        key: "video",
        icon: Film,
        group: "media",
        run: async (e) => {
          const result = await media.pick("video");
          if (!result) return;
          const attrs = result.type === "embed" ? { provider: result.provider, src: result.src } : { provider: "file", src: result.items[0].url };
          e.chain().focus().insertContent({ type: "video", attrs }).run();
        },
      },
      {
        key: "columns2",
        icon: Columns2,
        group: "layout",
        run: (e) => insertColumns(e, 2),
      },
      {
        key: "columns3",
        icon: Columns3,
        group: "layout",
        run: (e) => insertColumns(e, 3),
      },
      {
        key: "button",
        icon: MousePointerClick,
        group: "layout",
        run: (e) => void e.chain().focus().insertContent({ type: "button", attrs: { label: "", href: "" } }).run(),
      },
      { key: "divider", icon: Minus, group: "layout", run: (e) => void e.chain().focus().setHorizontalRule().run() },
      { key: "spacer", icon: Space, group: "layout", run: (e) => void e.chain().focus().insertContent({ type: "spacer", attrs: { size: "md" } }).run() },
    ],
    [media],
  );
}

/**
 * Searchable list of blocks, opened with "/" on an empty line or the "+" button.
 * ↑/↓ to move, Enter to insert, Esc to close.
 */
export function InsertPalette({ editor, position, onClose }: { editor: Editor; position: { top: number; left: number }; onClose: () => void }) {
  const t = useTranslations("adminEvents.editor");
  const items = useInsertItems();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const filtered = items.filter((item) => {
    const q = query.trim().toLocaleLowerCase();
    return !q || t(`insert.${item.key}`).toLocaleLowerCase().includes(q) || t(`insert.${item.key}Hint`).toLocaleLowerCase().includes(q);
  });

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  async function choose(item: InsertItem) {
    onClose();
    await item.run(editor);
  }

  return (
    <div
      role="dialog"
      aria-label={t("insert.title")}
      className="fixed z-50 w-72 overflow-hidden rounded-xl border border-border bg-white shadow-soft"
      style={{ top: Math.min(position.top, window.innerHeight - 380), left: Math.min(position.left, window.innerWidth - 300) }}
    >
      <input
        autoFocus
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (filtered[active]) void choose(filtered[active]);
          } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
            editor.commands.focus();
          }
        }}
        onBlur={(e) => {
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) onClose();
        }}
        placeholder={t("insert.search")}
        aria-controls="insert-list"
        aria-activedescendant={filtered[active] ? `insert-${filtered[active].key}` : undefined}
        className="w-full border-b border-border px-3 py-2.5 text-sm outline-none"
      />
      <ul ref={listRef} id="insert-list" role="listbox" className="max-h-80 overflow-y-auto p-1">
        {filtered.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-foreground">{t("insert.none")}</li>}
        {filtered.map((item, index) => {
          const Icon = item.icon;
          const showGroup = index === 0 || filtered[index - 1].group !== item.group;
          return (
            <li key={item.key} role="presentation">
              {showGroup && <p className="px-2 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">{t(`insert.groups.${item.group}`)}</p>}
              <button
                id={`insert-${item.key}`}
                role="option"
                aria-selected={index === active}
                data-index={index}
                type="button"
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void choose(item)}
                className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left", index === active && "bg-blue/10")}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-white text-blue">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink">{t(`insert.${item.key}`)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{t(`insert.${item.key}Hint`)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* Top toolbar ---------------------------------------------------------------- */

export function Toolbar({ editor, onInsert }: { editor: Editor; onInsert: (anchor: HTMLElement) => void }) {
  const t = useTranslations("adminEvents.editor");
  const block = editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
      ? "h3"
      : editor.isActive("heading", { level: 4 })
        ? "h4"
        : "p";
  const align = (["left", "center", "right", "justify"] as const).find((value) => editor.isActive({ textAlign: value })) ?? "left";

  return (
    <div role="toolbar" aria-label={t("toolbar")} className="flex flex-wrap items-center gap-0.5">
      <button type="button" className={btn()} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title={`${t("undo")} (Ctrl+Z)`} aria-label={t("undo")}>
        <Undo2 className="h-4 w-4" />
      </button>
      <button type="button" className={btn()} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title={`${t("redo")} (Ctrl+Shift+Z)`} aria-label={t("redo")}>
        <Redo2 className="h-4 w-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <select
        aria-label={t("blockType")}
        value={block}
        onChange={(e) => {
          const value = e.target.value;
          if (value === "p") editor.chain().focus().setParagraph().run();
          else editor.chain().focus().setHeading({ level: Number(value.slice(1)) as 2 | 3 | 4 }).run();
        }}
        className="h-8 rounded-md border border-border bg-white px-2 text-xs font-bold text-grey outline-none focus:border-blue"
      >
        <option value="p">{t("paragraph")}</option>
        <option value="h2">{t("heading", { level: 2 })}</option>
        <option value="h3">{t("heading", { level: 3 })}</option>
        <option value="h4">{t("heading", { level: 4 })}</option>
      </select>
      <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title={t("insert.bulletList")} aria-label={t("insert.bulletList")}>
        <List className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title={t("insert.orderedList")} aria-label={t("insert.orderedList")}>
        <ListOrdered className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()} title={t("insert.quote")} aria-label={t("insert.quote")}>
        <Quote className="h-4 w-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      {([
        ["left", AlignLeft],
        ["center", AlignCenter],
        ["right", AlignRight],
        ["justify", AlignJustify],
      ] as const).map(([value, Icon]) => (
        <button key={value} type="button" className={btn(align === value)} onClick={() => editor.chain().focus().setTextAlign(value).run()} title={t(`align.${value}`)} aria-label={t(`align.${value}`)} aria-pressed={align === value}>
          <Icon className="h-4 w-4" />
        </button>
      ))}
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <button type="button" className={btn()} onClick={() => editor.chain().focus().moveBlock("up").run()} title={`${t("moveUp")} (Alt+↑)`} aria-label={t("moveUp")}>
        <ArrowUp className="h-4 w-4" />
      </button>
      <button type="button" className={btn()} onClick={() => editor.chain().focus().moveBlock("down").run()} title={`${t("moveDown")} (Alt+↓)`} aria-label={t("moveDown")}>
        <ArrowDown className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={(e) => onInsert(e.currentTarget)}
        className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-full bg-pink px-3 text-xs font-extrabold text-white hover:opacity-90"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t("insert.open")}
      </button>
    </div>
  );
}

/* Bubble menu on text selection ---------------------------------------------- */

function ColorPopover({ label, icon: Icon, colors, active, onPick, onReset }: { label: string; icon: LucideIcon; colors: string[]; active: string | null; onPick: (color: string) => void; onReset: () => void }) {
  const t = useTranslations("adminEvents.editor");
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button type="button" className={btn(Boolean(active))} onClick={() => setOpen((v) => !v)} title={label} aria-label={label} aria-expanded={open}>
        <Icon className="h-4 w-4" style={active ? { color: active } : undefined} />
      </button>
      {open && (
        <span className="absolute left-0 top-9 z-10 flex w-48 flex-wrap gap-1.5 rounded-lg border border-border bg-white p-2 shadow-soft">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                onPick(color);
                setOpen(false);
              }}
              aria-label={color}
              className={cn("h-6 w-6 rounded-full ring-1 ring-black/10", active === color && "ring-2 ring-blue ring-offset-1")}
              style={{ background: color }}
            />
          ))}
          <label className="flex w-full items-center gap-2 text-[11px] font-bold text-grey">
            {t("customColor")}
            <input type="color" value={active ?? "#2d74ba"} onChange={(e) => onPick(e.target.value)} className="h-6 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
          </label>
          <button
            type="button"
            onClick={() => {
              onReset();
              setOpen(false);
            }}
            className="w-full rounded-md bg-muted px-2 py-1 text-[11px] font-bold text-grey hover:bg-border"
          >
            {t("resetColor")}
          </button>
        </span>
      )}
    </span>
  );
}

/**
 * Must stay a stable reference: BubbleMenu re-registers its plugin whenever this
 * function changes, which dispatches a transaction, re-renders, and would loop.
 */
const showOnTextSelection = ({ editor, state }: { editor: Editor; state: Editor["state"] }) =>
  editor.isEditable && !state.selection.empty && !(state.selection instanceof NodeSelection);

export function SelectionMenu({ editor }: { editor: Editor }) {
  const t = useTranslations("adminEvents.editor");
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const textStyle = editor.getAttributes("textStyle") as { color?: string; fontSize?: string };
  const highlight = editor.getAttributes("highlight") as { color?: string };

  function applyLink() {
    const href = safeHref(link);
    if (!link.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else if (href) editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    else return;
    setLinkOpen(false);
  }

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={showOnTextSelection}
      className="flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-0.5 rounded-xl border border-border bg-white p-1 shadow-soft"
    >
      {linkOpen ? (
        <span className="flex items-center gap-1 p-0.5">
          <input
            autoFocus
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") setLinkOpen(false);
            }}
            placeholder="https://…"
            aria-label={t("link")}
            className={cn("w-56 rounded-md border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue/20", link && !safeHref(link) ? "border-pink" : "border-border")}
          />
          <button type="button" onClick={applyLink} className="rounded-md bg-blue px-2.5 py-1 text-xs font-bold text-white">
            {t("apply")}
          </button>
        </span>
      ) : (
        <>
          {([
            ["bold", Bold, "toggleBold"],
            ["italic", Italic, "toggleItalic"],
            ["underline", Underline, "toggleUnderline"],
            ["strike", Strikethrough, "toggleStrike"],
          ] as const).map(([mark, Icon, command]) => (
            <button key={mark} type="button" className={btn(editor.isActive(mark))} onClick={() => editor.chain().focus()[command]().run()} title={t(`marks.${mark}`)} aria-label={t(`marks.${mark}`)} aria-pressed={editor.isActive(mark)}>
              <Icon className="h-4 w-4" />
            </button>
          ))}
          <button
            type="button"
            className={btn(editor.isActive("link"))}
            onClick={() => {
              setLink((editor.getAttributes("link").href as string) ?? "");
              setLinkOpen(true);
            }}
            title={t("link")}
            aria-label={t("link")}
          >
            <Link2 className="h-4 w-4" />
          </button>
          <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
          <ColorPopover
            label={t("textColor")}
            icon={Palette}
            colors={COLORS}
            active={textStyle.color ?? null}
            onPick={(color) => editor.chain().focus().setColor(color).run()}
            onReset={() => editor.chain().focus().unsetColor().run()}
          />
          <ColorPopover
            label={t("highlight")}
            icon={Highlighter}
            colors={HIGHLIGHTS}
            active={editor.isActive("highlight") ? (highlight.color ?? HIGHLIGHTS[0]) : null}
            onPick={(color) => editor.chain().focus().setHighlight({ color }).run()}
            onReset={() => editor.chain().focus().unsetHighlight().run()}
          />
          <select
            aria-label={t("fontSize")}
            value={textStyle.fontSize ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              if (!value) editor.chain().focus().unsetFontSizeToken().run();
              else editor.chain().focus().setFontSizeToken(value as (typeof FONT_SIZES)[number]).run();
            }}
            className="h-8 rounded-md border border-border bg-white px-1.5 text-xs font-bold text-grey outline-none"
          >
            <option value="">{t("sizes.default")}</option>
            {FONT_SIZES.filter((size) => size !== "base").map((size) => (
              <option key={size} value={size}>
                {t(`sizes.${size}`)}
              </option>
            ))}
          </select>
          <button type="button" className={btn()} onClick={() => editor.chain().focus().unsetAllMarks().run()} title={t("clearFormatting")} aria-label={t("clearFormatting")}>
            <RemoveFormatting className="h-4 w-4" />
          </button>
        </>
      )}
    </BubbleMenu>
  );
}
