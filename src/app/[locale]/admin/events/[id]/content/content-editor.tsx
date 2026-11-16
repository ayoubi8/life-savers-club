"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { useLocale, useTranslations } from "next-intl";
import { CircleAlert, CircleCheck, Copy, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { copyContentToEnglish, saveEventContent } from "@/lib/events/actions";
import { EMPTY_DOC, isEmptyDoc, safeHref, type EventDoc } from "@/lib/events/content";
import { IMAGE_TYPES } from "@/lib/events/upload";
import { cn } from "@/lib/utils";
import { CUSTOM_NODES, FontSizeToken, MoveBlock } from "./extensions";
import { EventMediaProvider, useEventMedia, type LibraryItem } from "./media-context";
import { InsertPalette, SelectionMenu, Toolbar } from "./toolbar";

type Lang = "fr" | "en";
type SaveStatus = "saved" | "pending" | "saving" | "retrying" | "conflict";

const SAVE_DELAY = 1500;
const backupKey = (id: string, lang: Lang) => `event-content:${id}:${lang}`;

function readBackup(id: string, lang: Lang): { doc: EventDoc; at: number } | null {
  try {
    const raw = window.localStorage.getItem(backupKey(id, lang));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeBackup(id: string, lang: Lang, doc: EventDoc | null) {
  try {
    if (doc) window.localStorage.setItem(backupKey(id, lang), JSON.stringify({ doc, at: Date.now() }));
    else window.localStorage.removeItem(backupKey(id, lang));
  } catch {
    // Storage can be full or blocked (private mode): the server copy is the source of truth.
  }
}

export function ContentEditor(props: {
  eventId: string;
  lang: Lang;
  docs: { fr: EventDoc | null; en: EventDoc | null };
  updatedAt: string;
  library: LibraryItem[];
}) {
  return (
    <EventMediaProvider eventId={props.eventId} initial={props.library}>
      <EditorInner {...props} />
    </EventMediaProvider>
  );
}

function EditorInner({
  eventId,
  lang,
  docs,
  updatedAt,
}: {
  eventId: string;
  lang: Lang;
  docs: { fr: EventDoc | null; en: EventDoc | null };
  updatedAt: string;
}) {
  const t = useTranslations("adminEvents.editor");
  const router = useRouter();
  const media = useEventMedia();
  const base = useRef(updatedAt);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retries = useRef(0);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [palette, setPalette] = useState<{ top: number; left: number } | null>(null);
  const initial = docs[lang];
  // A newer local copy (tab closed or connection lost before saving) is offered for restore.
  // This component only renders in the browser (see content-loader.tsx), so localStorage is safe here.
  const [backup, setBackup] = useState<EventDoc | null>(() => {
    const local = readBackup(eventId, lang);
    return local && !isEmptyDoc(local.doc) && JSON.stringify(local.doc) !== JSON.stringify(initial ?? EMPTY_DOC) ? local.doc : null;
  });

  // ProseMirror props and onUpdate are created once, with the first render's closures
  // (where `editor` is still null). They call the latest versions through these refs.
  const editorRef = useRef<Editor | null>(null);
  const saveRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  const openPaletteRef = useRef<(editor: Editor) => void>(() => {});
  const uploadRef = useRef<(editor: Editor, files: File[], pos?: number) => void>(() => {});

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        code: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          isAllowedUri: (url) => Boolean(safeHref(url)),
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: null },
        },
      }),
      TextStyle,
      Color,
      FontSizeToken,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: ({ node }) => (node.type.name === "heading" ? t("placeholderHeading") : t("placeholder")),
        showOnlyCurrent: true,
        includeChildren: true,
      }),
      CharacterCount,
      MoveBlock,
      ...CUSTOM_NODES,
    ],
    content: initial ?? EMPTY_DOC,
    editorProps: {
      attributes: {
        class: "event-editor min-h-[50vh] px-5 py-6 outline-none sm:px-10",
        "aria-label": t("ariaLabel"),
        role: "textbox",
        "aria-multiline": "true",
      },
      handleKeyDown: (view, event) => {
        // "/" on an empty line opens the insert palette.
        const { $from, empty } = view.state.selection;
        const current = editorRef.current;
        if (event.key === "/" && empty && $from.parent.type.name === "paragraph" && $from.parent.content.size === 0 && current) {
          event.preventDefault();
          openPaletteRef.current(current);
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const files = [...(event.clipboardData?.files ?? [])].filter((file) => IMAGE_TYPES.includes(file.type));
        const current = editorRef.current;
        if (!files.length || !current) return false;
        event.preventDefault();
        uploadRef.current(current, files);
        return true;
      },
      handleDrop: (view, event) => {
        const files = [...(event.dataTransfer?.files ?? [])].filter((file) => IMAGE_TYPES.includes(file.type));
        const current = editorRef.current;
        if (!files.length || !current) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        uploadRef.current(current, files, pos);
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      const doc = e.getJSON() as EventDoc;
      writeBackup(eventId, lang, doc);
      setStatus((s) => (s === "conflict" ? s : "pending"));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void saveRef.current(), SAVE_DELAY);
    },
  });
  const save = useCallback(
    async (force = false) => {
      if (!editor) return;
      if (timer.current) clearTimeout(timer.current);
      setStatus("saving");
      // ProseMirror attribute objects have a null prototype, which server-action
      // serialization silently drops (colours, sizes, links, image settings…).
      // A JSON round trip turns everything into plain objects.
      const doc = JSON.parse(JSON.stringify(editor.getJSON()));
      try {
        const result = await saveEventContent(eventId, lang, doc, base.current, { force });
        if (result.ok) {
          base.current = result.updated_at;
          retries.current = 0;
          writeBackup(eventId, lang, null);
          setSavedAt(new Date());
          setStatus((s) => (s === "saving" ? "saved" : s));
          return;
        }
        if (result.error === "conflict") {
          setStatus("conflict");
          return;
        }
        throw new Error(result.error);
      } catch {
        // Network or server hiccup: retry with backoff, the local backup keeps the work safe.
        retries.current += 1;
        setStatus("retrying");
        timer.current = setTimeout(() => void saveRef.current(force), Math.min(30000, 2000 * 2 ** retries.current));
      }
    },
    [editor, eventId, lang],
  );

  // Keep the refs used by ProseMirror callbacks pointing at the latest values.
  useEffect(() => {
    editorRef.current = editor;
    saveRef.current = save;
    openPaletteRef.current = (e: Editor) => {
      const coords = e.view.coordsAtPos(e.state.selection.from);
      setPalette({ top: coords.bottom + 6, left: coords.left });
    };
    uploadRef.current = async (e: Editor, files: File[], pos?: number) => {
      const added = await media.uploadFiles(files);
      const nodes = added.map((item) => ({ type: "image", attrs: { src: item.url, alt: "", mediaId: item.id } }));
      if (!nodes.length) return;
      if (typeof pos === "number") e.chain().focus().insertContentAt(pos, nodes).run();
      else e.chain().focus().insertContent(nodes).run();
    };
  });

  // Warn before leaving with unsaved changes; flush on unmount.
  useEffect(() => {
    if (status === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  async function switchLang(next: Lang) {
    if (next === lang) return;
    if (status === "pending" || status === "saving") await save();
    router.push(`/admin/events/${eventId}/content?lang=${next}`);
  }

  async function copyFromFrench() {
    if (status !== "saved") await save();
    const result = await copyContentToEnglish(eventId, base.current);
    if (!result.ok) return void toast.error(t(result.error === "not_empty" ? "copyNotEmpty" : "saveFailed"));
    base.current = result.updated_at;
    editor?.commands.setContent(docs.fr ?? EMPTY_DOC, { emitUpdate: false });
    toast.success(t("copied"));
  }

  const words = editor?.storage.characterCount?.words?.() ?? 0;
  const enEmpty = lang === "en" && editor ? isEmptyDoc(editor.getJSON() as EventDoc) : false;

  return (
    <div className="rounded-card border border-border bg-white">
      {/* Header: languages + save state */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div role="tablist" aria-label={t("language")} className="inline-flex rounded-full bg-muted p-0.5">
          {(["fr", "en"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={lang === value}
              onClick={() => void switchLang(value)}
              className={cn("rounded-full px-4 py-1 text-xs font-extrabold", lang === value ? "bg-white text-blue shadow-sm" : "text-grey")}
            >
              {value === "fr" ? "Français" : "English"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">{t("words", { count: words })}</span>
          <SavePill status={status} savedAt={savedAt} onRetry={() => void save()} />
        </div>
      </div>

      {lang === "en" && enEmpty && docs.fr && !isEmptyDoc(docs.fr) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-blue/5 px-4 py-2.5 text-sm">
          <span className="text-grey">{t("enEmpty")}</span>
          <button type="button" onClick={() => void copyFromFrench()} className="inline-flex items-center gap-1.5 rounded-full bg-blue px-3 py-1.5 text-xs font-extrabold text-white">
            <Copy className="h-3.5 w-3.5" aria-hidden />
            {t("copyFr")}
          </button>
        </div>
      )}

      {backup && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-[#fff4d6] px-4 py-2.5 text-sm">
          <span className="font-semibold text-[#7a5200]">{t("backupFound")}</span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                editor?.commands.setContent(backup);
                setBackup(null);
              }}
              className="rounded-full bg-blue px-3 py-1.5 text-xs font-extrabold text-white"
            >
              {t("restore")}
            </button>
            <button
              type="button"
              onClick={() => {
                writeBackup(eventId, lang, null);
                setBackup(null);
              }}
              className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-bold text-grey"
            >
              {t("discard")}
            </button>
          </span>
        </div>
      )}

      {status === "conflict" && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-pink/30 bg-pink/5 px-4 py-2.5 text-sm">
          <span>
            <strong className="text-pink">{t("conflictTitle")}</strong> <span className="text-muted-foreground">{t("conflictText")}</span>
          </span>
          <span className="flex gap-2">
            <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-blue px-3 py-1.5 text-xs font-extrabold text-white">
              {t("conflictReload")}
            </button>
            <button type="button" onClick={() => void save(true)} className="rounded-full border border-pink bg-white px-3 py-1.5 text-xs font-bold text-pink">
              {t("conflictOverwrite")}
            </button>
          </span>
        </div>
      )}

      {editor && (
        <div className="sticky top-0 z-20 border-b border-border bg-white/95 px-2 py-1.5 backdrop-blur">
          <Toolbar
            editor={editor}
            onInsert={(anchor) => {
              const box = anchor.getBoundingClientRect();
              setPalette({ top: box.bottom + 6, left: box.left - 200 });
            }}
          />
        </div>
      )}

      <EditorContent editor={editor} />
      {editor && <SelectionMenu editor={editor} />}
      {editor && palette && <InsertPalette editor={editor} position={palette} onClose={() => setPalette(null)} />}

      <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">{t("shortcuts")}</p>
    </div>
  );
}

function SavePill({ status, savedAt, onRetry }: { status: SaveStatus; savedAt: Date | null; onRetry: () => void }) {
  const locale = useLocale();
  const t = useTranslations("adminEvents.editor");
  const time = savedAt ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(savedAt) : null;
  if (status === "saving" || status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-grey" aria-live="polite">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
        {status === "saving" ? t("saving") : t("pending")}
      </span>
    );
  }
  if (status === "retrying" || status === "conflict") {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-pink" aria-live="polite">
        <CircleAlert className="h-3.5 w-3.5" aria-hidden />
        {status === "conflict" ? t("conflictShort") : t("retrying")}
        {status === "retrying" && (
          <button type="button" onClick={onRetry} className="underline">
            {t("retry")}
          </button>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-bold text-green" aria-live="polite">
      <CircleCheck className="h-3.5 w-3.5" aria-hidden />
      {time ? t("savedAt", { time }) : t("saved")}
    </span>
  );
}
