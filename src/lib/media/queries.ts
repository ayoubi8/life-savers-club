// Server only. Reads go through the user's Supabase client, so RLS (can_access('media')) applies.
import { createClient } from "@/lib/supabase/server";
import { decodeCursor, encodeCursor, PAGE_SIZE, type AssetFilters, type MediaKind, type Orientation } from "./schema";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

const THUMBS = "media-thumbs";
const THUMB_TTL = 60 * 60; // seconds

export type ActiveAccount = { id: string; google_email: string; connected_at: string };

export type FolderSummary = {
  id: string;
  name: string;
  created_at: string;
  images: number;
  videos: number;
  coverUrl: string | null;
};

export type AssetItem = {
  id: string;
  name: string;
  mime_type: string;
  kind: MediaKind;
  width: number | null;
  height: number | null;
  orientation: Orientation | null;
  duration_s: number | null;
  size_bytes: number;
  created_at: string;
  thumbUrl: string | null;
};

const ASSET_COLUMNS = "id, name, mime_type, kind, width, height, orientation, duration_s, size_bytes, created_at, thumb_path";

/** The connected Google account, or null (also null for users without the media section). */
export async function getActiveAccount(supabase: ServerClient): Promise<ActiveAccount | null> {
  const { data } = await supabase.rpc("active_drive_account");
  const row = Array.isArray(data) ? data[0] : null;
  return (row as ActiveAccount | undefined) ?? null;
}

/** Short-lived links to private thumbnails, signed in one call. */
async function signThumbs(supabase: ServerClient, paths: (string | null)[]) {
  const wanted = [...new Set(paths.filter((path): path is string => !!path))];
  if (!wanted.length) return new Map<string, string>();
  const { data } = await supabase.storage.from(THUMBS).createSignedUrls(wanted, THUMB_TTL);
  return new Map((data ?? []).filter((item) => item.signedUrl && item.path).map((item) => [item.path!, item.signedUrl]));
}

type FolderRow = {
  id: string;
  name: string;
  created_at: string;
  images: { count: number }[] | null;
  videos: { count: number }[] | null;
  cover: { thumb_path: string | null }[] | null;
};

/** Folders of the active account with their counts and latest thumbnail, in one round trip. */
export async function listFolders(supabase: ServerClient, accountId: string): Promise<FolderSummary[]> {
  const { data } = await supabase
    .from("media_folders")
    .select("id, name, created_at, images:media_assets(count), videos:media_assets(count), cover:media_assets(thumb_path)")
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .eq("images.kind", "image")
    .is("images.deleted_at", null)
    .eq("videos.kind", "video")
    .is("videos.deleted_at", null)
    .is("cover.deleted_at", null)
    .not("cover.thumb_path", "is", null)
    .order("created_at", { referencedTable: "cover", ascending: false })
    .limit(1, { referencedTable: "cover" })
    .order("name", { ascending: true });

  const rows = (data ?? []) as unknown as FolderRow[];
  const thumbs = await signThumbs(supabase, rows.map((row) => row.cover?.[0]?.thumb_path ?? null));
  return rows.map((row) => {
    const path = row.cover?.[0]?.thumb_path;
    return {
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      images: Number(row.images?.[0]?.count ?? 0),
      videos: Number(row.videos?.[0]?.count ?? 0),
      coverUrl: path ? (thumbs.get(path) ?? null) : null,
    };
  });
}

export async function getFolder(supabase: ServerClient, folderId: string, accountId: string) {
  const { data } = await supabase
    .from("media_folders")
    .select("id, name, drive_folder_id")
    .eq("id", folderId)
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as { id: string; name: string; drive_folder_id: string } | null) ?? null;
}

/** One page of a folder, newest first, with the filters applied by the database. */
export async function listAssets(
  supabase: ServerClient,
  folderId: string,
  filters: AssetFilters,
  cursor?: string | null,
): Promise<{ items: AssetItem[]; nextCursor: string | null }> {
  let query = supabase
    .from("media_assets")
    .select(ASSET_COLUMNS)
    .eq("folder_id", folderId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.orientation) query = query.eq("orientation", filters.orientation);
  if (filters.resolution) query = query.eq("kind", "video").eq("resolution", filters.resolution);
  const after = decodeCursor(cursor);
  if (after) {
    // Quoted: timestamps contain ':' '.' and '+', which PostgREST's or() syntax would misread.
    const at = `"${after.createdAt}"`;
    query = query.or(`created_at.lt.${at},and(created_at.eq.${at},id.lt.${after.id})`);
  }

  const { data } = await query;
  const rows = (data ?? []) as (Omit<AssetItem, "thumbUrl"> & { thumb_path: string | null })[];
  const page = rows.slice(0, PAGE_SIZE);
  const thumbs = await signThumbs(supabase, page.map((row) => row.thumb_path));
  return {
    items: page.map(({ thumb_path, ...row }) => ({
      ...row,
      duration_s: row.duration_s == null ? null : Number(row.duration_s),
      size_bytes: Number(row.size_bytes),
      thumbUrl: thumb_path ? (thumbs.get(thumb_path) ?? null) : null,
    })),
    nextCursor: rows.length > PAGE_SIZE ? encodeCursor(page[page.length - 1]) : null,
  };
}

export type DeleteRequest = {
  id: string;
  created_at: string;
  requester: string;
  folder: { id: string; name: string };
  /** null = the whole folder. */
  files: { id: string; name: string; kind: MediaKind; thumbUrl: string | null }[] | null;
  /** Files currently in the folder (whole-folder requests). */
  folderFiles: number;
};

type RequestRow = {
  id: string;
  created_at: string;
  asset_ids: string[] | null;
  requester: { full_name: string | null; email: string } | null;
  folder: { id: string; name: string; account_id: string; deleted_at: string | null; assets: { count: number }[] | null } | null;
};

/** Pending deletion requests for the active account (admins only, through RLS). */
export async function listDeleteRequests(supabase: ServerClient, accountId: string): Promise<DeleteRequest[]> {
  const { data } = await supabase
    .from("media_delete_requests")
    .select(
      "id, created_at, asset_ids, requester:profiles!media_delete_requests_requested_by_fkey(full_name, email), folder:media_folders(id, name, account_id, deleted_at, assets:media_assets(count))",
    )
    .eq("status", "pending")
    .is("folder.assets.deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(50);
  const rows = ((data ?? []) as unknown as RequestRow[]).filter((row) => row.folder?.account_id === accountId && !row.folder.deleted_at);

  const assetIds = [...new Set(rows.flatMap((row) => row.asset_ids ?? []))];
  const { data: assets } = assetIds.length
    ? await supabase.from("media_assets").select("id, name, kind, thumb_path").in("id", assetIds).is("deleted_at", null)
    : { data: [] };
  const assetRows = (assets ?? []) as { id: string; name: string; kind: MediaKind; thumb_path: string | null }[];
  const thumbs = await signThumbs(supabase, assetRows.map((asset) => asset.thumb_path));
  const byId = new Map(assetRows.map((asset) => [asset.id, asset]));

  return rows.flatMap((row) => {
    const files = row.asset_ids
      ? row.asset_ids.flatMap((id) => {
          const asset = byId.get(id);
          return asset ? [{ id, name: asset.name, kind: asset.kind, thumbUrl: asset.thumb_path ? (thumbs.get(asset.thumb_path) ?? null) : null }] : [];
        })
      : null;
    // Every file already gone: nothing left to decide.
    if (files && files.length === 0) return [];
    return [
      {
        id: row.id,
        created_at: row.created_at,
        requester: row.requester?.full_name || row.requester?.email || "—",
        folder: { id: row.folder!.id, name: row.folder!.name },
        files,
        folderFiles: row.folder!.assets?.[0]?.count ?? 0,
      },
    ];
  });
}
