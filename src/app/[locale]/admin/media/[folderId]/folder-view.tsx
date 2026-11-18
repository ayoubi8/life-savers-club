"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Download, Film, FolderUp, ImageIcon, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useConfirm } from "@/components/ui/confirm";
import { loadMoreAssets, moveAssets, renameAsset, setOrientation, trashAssets } from "@/lib/media/actions";
import type { AssetItem } from "@/lib/media/queries";
import { formatDuration, kindOf, mimeOf, RESOLUTION_LABELS, resolutionOf, type AssetFilters, type Orientation } from "@/lib/media/schema";
import { droppedFiles, PICK_FOLDER } from "@/lib/media/local-folder";
import { cn } from "@/lib/utils";
import { useMediaError } from "../library-client";
import { NameDialog } from "../name-dialog";
import { fileUrl, Lightbox } from "./lightbox";
import { useUploads } from "../upload-queue";

type Page = { items: AssetItem[]; nextCursor: string | null };

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif,video/mp4,video/quicktime,video/webm,.mov";

/** Small outline drawn in the file's shape. */
function ShapeIcon({ orientation }: { orientation: Orientation | null }) {
  if (!orientation) return null;
  const size = orientation === "horizontal" ? "h-2.5 w-3.5" : orientation === "vertical" ? "h-3.5 w-2.5" : "h-3 w-3";
  return <span aria-hidden className={cn("inline-block rounded-[2px] border-[1.5px] border-current", size)} />;
}

function matches(filters: AssetFilters, item: { kind: string; orientation: string | null; width: number | null; height: number | null }) {
  return (
    (!filters.kind || filters.kind === item.kind) &&
    (!filters.orientation || filters.orientation === item.orientation) &&
    (!filters.resolution || filters.resolution === resolutionOf(item.width, item.height))
  );
}

/** Starts the browser downloads one after the other (browsers drop clicks fired all at once). */
async function downloadAll(ids: string[]) {
  for (const id of ids) {
    const link = document.createElement("a");
    link.href = fileUrl(id, true);
    link.rel = "noopener";
    document.body.append(link);
    link.click();
    link.remove();
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
}

export function FolderView({
  folderId,
  filters,
  initial,
  folders,
  admin,
}: {
  folderId: string;
  admin: boolean;
  filters: AssetFilters;
  initial: Page;
  folders: { id: string; name: string }[];
}) {
  const t = useTranslations("adminMedia");
  const errorText = useMediaError();
  const router = useRouter();
  const confirm = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);

  // Server data, plus pages loaded with "Load more" and files uploaded since.
  const [base, setBase] = useState(initial);
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<AssetItem | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, startLoading] = useTransition();
  if (base !== initial) {
    // router.refresh() brought fresh server data: start over from it.
    setBase(initial);
    setItems(initial.items);
    setCursor(initial.nextCursor);
    setSelected((current) => new Set([...current].filter((id) => initial.items.some((item) => item.id === id))));
  }

  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  // Files finished uploading into this folder appear at once, with the thumbnail made locally.
  const uploads = useUploads();
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  });
  useEffect(
    () =>
      uploads.subscribe((target, asset, thumb) => {
        if (target !== folderId || !matches(filtersRef.current, asset)) return;
        const thumbUrl = thumb ? URL.createObjectURL(thumb) : null;
        if (thumbUrl) objectUrls.current.push(thumbUrl);
        setItems((list) => (list.some((item) => item.id === asset.id) ? list : [{ ...asset, thumbUrl }, ...list]));
      }),
    [uploads, folderId],
  );

  function addFiles(files: File[]) {
    // System files a picked folder brings along (.DS_Store, Thumbs.db…) aren't worth a warning.
    files = files.filter((file) => !file.name.startsWith(".") && file.name !== "Thumbs.db" && file.name !== "desktop.ini");
    if (!files.length) return void toast.error(t("emptyPick"));
    const accepted = files.filter((file) => kindOf(mimeOf(file)));
    const refused = files.length - accepted.length;
    if (refused) toast.error(t("refused", { count: refused }));
    if (accepted.length) uploads.add(folderId, accepted);
  }

  function loadMore() {
    if (!cursor) return;
    startLoading(async () => {
      const result = await loadMoreAssets(folderId, filters, cursor);
      if (!result.ok) return void toast.error(errorText(result.error));
      setItems((list) => [...list, ...result.items.filter((item) => !list.some((known) => known.id === item.id))]);
      setCursor(result.nextCursor);
    });
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeFromView(ids: string[]) {
    const gone = new Set(ids);
    setItems((list) => list.filter((item) => !gone.has(item.id)));
    setSelected((current) => new Set([...current].filter((id) => !gone.has(id))));
    setOpenId((current) => (current && gone.has(current) ? null : current));
  }

  async function remove(ids: string[]) {
    const ok = await confirm({
      title: admin ? t("deleteFilesTitle", { count: ids.length }) : t("requestFilesTitle", { count: ids.length }),
      message: admin ? t("deleteFilesText") : t("requestText"),
      confirmLabel: admin ? t("delete") : t("sendRequest"),
      danger: admin,
    });
    if (!ok) return;
    const result = await trashAssets(ids);
    if (!result.ok) return void toast.error(errorText(result.error));
    if (result.requested) {
      setSelected(new Set());
      return void toast.success(t("requestSent"));
    }
    toast.success(t("deleted", { count: result.deleted }));
    if (result.failed) toast.error(t("partlyFailed", { count: result.failed }));
    // Only what the server confirmed is removed from the grid.
    if (result.failed === 0) removeFromView(ids);
    router.refresh();
  }

  async function move(ids: string[], target: string) {
    const result = await moveAssets(ids, target);
    if (!result.ok) return void toast.error(errorText(result.error));
    toast.success(t("moved", { count: result.moved }));
    if (result.failed) toast.error(t("partlyFailed", { count: result.failed }));
    if (result.failed === 0) removeFromView(ids);
    router.refresh();
  }

  async function changeOrientation(item: AssetItem, orientation: Orientation | null) {
    const result = await setOrientation(item.id, orientation);
    if (!result.ok) return void toast.error(errorText(result.error));
    setItems((list) =>
      list.flatMap((entry) => (entry.id !== item.id ? [entry] : matches(filters, { ...entry, orientation }) ? [{ ...entry, orientation }] : [])),
    );
    toast.success(t("saved"));
  }

  const openIndex = openId ? items.findIndex((item) => item.id === openId) : -1;
  const openItem = openIndex >= 0 ? items[openIndex] : null;
  const selection = [...selected];

  return (
    <div
      onDragEnter={(event) => {
        if (event.dataTransfer.types.includes("Files")) setDragging(true);
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void droppedFiles(event.dataTransfer).then(addFiles);
      }}
      className={cn("relative min-h-[50vh] rounded-card transition", dragging && "ring-4 ring-blue/40")}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-tour="media.upload"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-full bg-blue px-4 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          <Upload className="h-4 w-4" aria-hidden />
          {t("upload")}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            addFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-full border border-blue px-4 py-2 text-sm font-bold text-blue hover:bg-blue/5"
        >
          <FolderUp className="h-4 w-4" aria-hidden />
          {t("uploadFolder")}
        </button>
        <input
          ref={folderInputRef}
          type="file"
          multiple
          {...PICK_FOLDER}
          className="hidden"
          onChange={(event) => {
            addFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
        <p className="text-xs text-muted-foreground">{t("dropHint")}</p>
      </div>

      {selection.length > 0 && (
        <div className="sticky top-2 z-30 mb-4 flex flex-wrap items-center gap-2 rounded-card border border-border bg-white px-3 py-2 shadow-soft">
          <span className="text-sm font-bold text-grey">{t("selected", { count: selection.length })}</span>
          <button type="button" onClick={() => void downloadAll(selection)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-blue hover:bg-muted">
            <Download className="h-4 w-4" aria-hidden />
            {t("download")}
          </button>
          {folders.length > 0 && (
            <>
              <label className="sr-only" htmlFor="bulk-move">{t("moveTo")}</label>
              <select
                id="bulk-move"
                value=""
                onChange={(event) => event.target.value && void move(selection, event.target.value)}
                className="rounded-full border border-border bg-white px-3 py-1.5 text-sm font-bold text-grey"
              >
                <option value="">{t("moveTo")}</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <button type="button" onClick={() => void remove(selection)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-pink hover:bg-muted">
            <Trash2 className="h-4 w-4" aria-hidden />
            {t("delete")}
          </button>
          <button type="button" onClick={() => setSelected(new Set(items.map((item) => item.id)))} className="rounded-full px-3 py-1.5 text-sm font-bold text-grey hover:bg-muted">
            {t("selectAll")}
          </button>
          <button type="button" onClick={() => setSelected(new Set())} aria-label={t("clearSelection")} className="ml-auto rounded-full p-1.5 text-grey hover:bg-muted">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-card border-2 border-dashed border-border bg-white px-6 py-16 text-center hover:border-blue"
        >
          <Upload className="h-8 w-8 text-blue" aria-hidden />
          <span className="font-bold text-grey">{filters.kind || filters.orientation ? t("emptyFiltered") : t("emptyFolderView")}</span>
          <span className="text-sm text-muted-foreground">{t("dropHere")}</span>
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {items.map((item, index) => {
            const checked = selected.has(item.id);
            return (
              <li key={item.id} data-tour={index === 0 ? "media.file" : undefined} className="group relative">
                <button
                  type="button"
                  onClick={() => (selection.length ? toggle(item.id) : setOpenId(item.id))}
                  className={cn(
                    "relative block aspect-square w-full overflow-hidden rounded-lg bg-grey/10 outline-offset-2",
                    checked && "ring-4 ring-blue",
                  )}
                >
                  {item.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed, private thumbnail
                    <img src={item.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-grey/40">
                      {item.kind === "video" ? <Film className="h-10 w-10" aria-hidden /> : <ImageIcon className="h-10 w-10" aria-hidden />}
                    </span>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
                    {item.kind === "video" && (
                      <>
                        <Film className="h-3 w-3" aria-hidden />
                        {formatDuration(item.duration_s)}
                        {resolutionOf(item.width, item.height) && (
                          <span className="rounded bg-white/20 px-1">{RESOLUTION_LABELS[resolutionOf(item.width, item.height)!]}</span>
                        )}
                      </>
                    )}
                    <ShapeIcon orientation={item.orientation} />
                    <span className="sr-only">
                      {item.kind === "video" ? t("filters.videos") : t("filters.images")}
                      {item.orientation ? `, ${t(`filters.${item.orientation}`)}` : ""}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={t("selectFile", { name: item.name })}
                  onClick={() => toggle(item.id)}
                  className={cn(
                    "absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-black/30 text-white shadow transition",
                    checked ? "bg-blue opacity-100" : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
                    selection.length > 0 && "opacity-100",
                  )}
                >
                  {checked && <Check className="h-3.5 w-3.5" aria-hidden />}
                </button>
                <p className="mt-1 truncate text-xs font-semibold text-grey" title={item.name}>
                  {item.name}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {cursor && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-full border border-border bg-white px-5 py-2 text-sm font-bold text-grey hover:bg-muted disabled:opacity-50"
          >
            {loading ? t("loading") : t("loadMore")}
          </button>
        </div>
      )}

      {openItem && (
        <Lightbox
          key="lightbox"
          item={openItem}
          folders={folders}
          hasPrevious={openIndex > 0}
          hasNext={openIndex < items.length - 1}
          onPrevious={() => setOpenId(items[openIndex - 1]?.id ?? null)}
          onNext={() => setOpenId(items[openIndex + 1]?.id ?? null)}
          onClose={() => setOpenId(null)}
          onRename={() => setRenaming(openItem)}
          onMove={(target) => void move([openItem.id], target)}
          onOrientation={(orientation) => void changeOrientation(openItem, orientation)}
          onDelete={() => void remove([openItem.id])}
        />
      )}

      <NameDialog
        open={!!renaming}
        title={t("renameFile")}
        label={t("fileName")}
        initialValue={renaming?.name ?? ""}
        maxLength={255}
        submitLabel={t("save")}
        onClose={() => setRenaming(null)}
        onSubmit={async (name) => {
          if (!renaming) return null;
          const result = await renameAsset(renaming.id, name);
          if (!result.ok) return errorText(result.error);
          setItems((list) => list.map((item) => (item.id === renaming.id ? { ...item, name: result.name } : item)));
          toast.success(t("renamed"));
          return null;
        }}
      />
    </div>
  );
}
