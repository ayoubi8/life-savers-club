import { Extension, Node, mergeAttributes, type Editor } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FONT_SIZES } from "@/lib/events/content";
import {
  ButtonView,
  CalloutView,
  ColumnsView,
  GalleryView,
  ImageView,
  SpacerView,
  VideoView,
} from "./node-views";

/**
 * Custom TipTap extensions for the event editor. Node names and attributes match
 * exactly what `sanitizeDoc` (src/lib/events/content.ts) keeps and what the public
 * renderer draws, so the editor JSON can be saved as is.
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSizeToken: {
      setFontSizeToken: (size: (typeof FONT_SIZES)[number]) => ReturnType;
      unsetFontSizeToken: () => ReturnType;
    };
    moveBlock: {
      moveBlock: (direction: "up" | "down") => ReturnType;
    };
  }
}

/** Font size as a token ("sm" … "3xl") on the textStyle mark, shown with `fs-*` classes. */
export const FontSizeToken = Extension.create({
  name: "fontSizeToken",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => {
              const value = element.getAttribute("data-size");
              return FONT_SIZES.includes(value as never) ? value : null;
            },
            renderHTML: (attributes) =>
              attributes.fontSize ? { "data-size": attributes.fontSize, class: `fs-${attributes.fontSize}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSizeToken:
        (size) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSizeToken:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

const REORDER_PARENTS = new Set(["doc", "column"]);

/**
 * Moves the current block (or the selected media block) up or down among its
 * siblings. Alt+↑ / Alt+↓, also used by the toolbar and block controls.
 */
export const MoveBlock = Extension.create({
  name: "moveBlock",
  addCommands() {
    return {
      moveBlock:
        (direction) =>
        ({ state, dispatch }) => {
          const { selection } = state;
          const $from = selection.$from;
          let start: number;
          let node;
          let parent;
          let index: number;
          let offset = 0;

          if (selection instanceof NodeSelection && REORDER_PARENTS.has($from.parent.type.name)) {
            start = selection.from;
            node = selection.node;
            parent = $from.parent;
            index = $from.index();
          } else {
            // Deepest ancestor whose parent is the document or a column.
            let depth = 0;
            for (let d = 1; d <= $from.depth; d += 1) if (REORDER_PARENTS.has($from.node(d - 1).type.name)) depth = d;
            if (!depth) return false;
            start = $from.before(depth);
            node = $from.node(depth);
            parent = $from.node(depth - 1);
            index = $from.index(depth - 1);
            offset = selection.from - start;
          }

          const target = direction === "up" ? index - 1 : index + 1;
          if (target < 0 || target >= parent.childCount) return false;
          if (!dispatch) return true;

          const sibling = parent.child(target);
          const tr = state.tr.delete(start, start + node.nodeSize);
          const insertAt = direction === "up" ? start - sibling.nodeSize : start + sibling.nodeSize;
          tr.insert(insertAt, node);
          tr.setSelection(
            selection instanceof NodeSelection
              ? NodeSelection.create(tr.doc, insertAt)
              : TextSelection.near(tr.doc.resolve(Math.min(insertAt + offset, tr.doc.content.size))),
          );
          dispatch(tr.scrollIntoView());
          return true;
        },
    };
  },
  addKeyboardShortcuts() {
    return {
      "Alt-ArrowUp": () => this.editor.commands.moveBlock("up"),
      "Alt-ArrowDown": () => this.editor.commands.moveBlock("down"),
    };
  },
});

// ───────── Helpers for atom (media) nodes ─────────

/** Stores every attribute as one JSON data attribute, so copy/paste inside the editor keeps them. */
function jsonAttrs(names: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(names).map(([name, fallback]) => [
      name,
      {
        default: fallback,
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute(`data-${name.toLowerCase()}`);
          if (raw === null) return fallback;
          try {
            return JSON.parse(raw);
          } catch {
            return fallback;
          }
        },
        renderHTML: (attributes: Record<string, unknown>) => ({ [`data-${name.toLowerCase()}`]: JSON.stringify(attributes[name]) }),
      },
    ]),
  );
}

function atomNode(name: string, attributes: Record<string, unknown>, view: Parameters<typeof ReactNodeViewRenderer>[0]) {
  return Node.create({
    name,
    group: "block",
    atom: true,
    draggable: false,
    selectable: true,
    addAttributes: () => jsonAttrs(attributes),
    parseHTML: () => [{ tag: `div[data-type="event-${name}"]` }],
    renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-type": `event-${name}` })],
    addNodeView: () => ReactNodeViewRenderer(view),
  });
}

export const EventImage = atomNode(
  "image",
  { src: "", alt: "", caption: "", width: "100", align: "center", rounded: true, shadow: false, border: false, mediaId: null },
  ImageView,
);
export const EventGallery = atomNode("gallery", { images: [], layout: "grid", columns: 3 }, GalleryView);
export const EventVideo = atomNode("video", { provider: "youtube", src: "", title: "", caption: "", poster: null, loop: false }, VideoView);
export const EventButton = atomNode("button", { label: "", href: "", variant: "primary", align: "left" }, ButtonView);
export const EventSpacer = atomNode("spacer", { size: "md" }, SpacerView);

export const EventCallout = Node.create({
  name: "callout",
  group: "block",
  content: "(paragraph | heading | bulletList | orderedList)+",
  defining: true,
  addAttributes: () => jsonAttrs({ tone: "info", color: null }),
  parseHTML: () => [{ tag: 'aside[data-type="event-callout"]' }],
  renderHTML: ({ HTMLAttributes }) => ["aside", mergeAttributes(HTMLAttributes, { "data-type": "event-callout" }), 0],
  addNodeView: () => ReactNodeViewRenderer(CalloutView),
});

export const EventColumns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,3}",
  isolating: true,
  parseHTML: () => [{ tag: 'div[data-type="event-columns"]' }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-type": "event-columns" }), 0],
  addNodeView: () => ReactNodeViewRenderer(ColumnsView),
});

export const EventColumn = Node.create({
  name: "column",
  content: "(paragraph | heading | bulletList | orderedList | blockquote | image | video | callout | button | spacer | horizontalRule)+",
  isolating: true,
  parseHTML: () => [{ tag: 'div[data-type="event-column"]' }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-type": "event-column", class: "event-col" }), 0],
});

/** Inserts a block after the current one (or replaces an empty paragraph). */
export function insertBlock(editor: Editor, content: Record<string, unknown> | Record<string, unknown>[]) {
  editor.chain().focus().insertContent(content).run();
}

export const CUSTOM_NODES = [EventImage, EventGallery, EventVideo, EventButton, EventSpacer, EventCallout, EventColumns, EventColumn];
