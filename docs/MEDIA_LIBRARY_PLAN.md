# Media library (Google Drive): implementation plan

> **Status (2026-11-17):** M1–M6 implemented. Migration `20261119000000_media_library.sql` tested on a local Postgres and **applied to Supabase on 2026-11-17**. M0 (Google Cloud setup) is still to do by the owner. Changes from the plan below:
> - The upload queue lives in `admin/media/layout.tsx` (`UploadProvider`), so uploads keep running while people switch folders or filters.
> - There is no `/api/media/[id]/thumb` route: thumbnails are signed in one batch call when a page loads.
> - Marketing members who already exist get the `media` section from the migration.

Goal: the marketing team stores the club's photos and videos from the admin. They create and name folders, upload and download files, and filter each folder by **image / video** and **horizontal / vertical / square**. The files live in the club's Google Drive. Only a full admin chooses which Google account holds them.

## 1. Decisions

| Topic | Decision | Why |
|---|---|---|
| Storage | Google Drive of a **dedicated club account** (e.g. `lifesaversclub.media@gmail.com`), not a personal Gmail | Files stay with the club when the board changes. 15 GB free; Google One 100 GB ≈ $2/month if needed. |
| Google scope | `openid email https://www.googleapis.com/auth/drive.file` | Non-sensitive scope: no Google review and no security audit. The app only sees files it created. Files added by hand in drive.google.com do not show on the site (Google Picker import is a later option). |
| Who connects the account | `role = admin` only (`can(profile, "accounts")`) | Changing the account hides every file stored in the old one, so it is an admin decision. |
| Who uses the library | New section `media`. Pre-ticked for the marketing department. Admins always have it. | Same model as `events` / `forms`. |
| Upload path | Browser → Google directly (resumable upload). The server only opens the session and checks the result. | Videos are far above the 12 MB server-action limit and must not pass through server memory. |
| Metadata | Read **automatically in the browser** before upload (type, width, height, duration) and saved as a row in Supabase. Nobody types it. | Filters run as one fast database query. Drive takes minutes to know a video's size, so it cannot be relied on for filtering. |
| Viewing / downloading | A server route streams the file from Drive (with `Range` support). Thumbnails are small WebP files in Supabase storage. | Drive files are private, so `<img src>` cannot point at Drive. |
| Delete | Drive trash (recoverable 30 days) + soft delete (`deleted_at`) | One wrong click must not lose event footage. |

### Google Cloud setup (free, no payment card)

The Sheets integration already uses a Cloud project (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`). In that project:

1. **APIs & Services → Library**: enable **Google Drive API** (free, no billing account needed).
2. **Credentials → OAuth client**: add the redirect URI `<site origin>/api/integrations/google/drive/callback` (and the `http://localhost:3000/...` one for dev).
3. **OAuth consent screen**: add the `drive.file` scope, then set publishing status to **In production**. While the app is in *Testing*, Google expires refresh tokens after **7 days** and the library would disconnect every week.
4. Create the club Google account if it does not exist yet.

No new environment variables: it reuses `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`.

## 2. How an upload works

```
Browser (marketing member)
  1. reads kind, width, height, duration; draws a 400px WebP thumbnail
  2. POST /api/media/upload-session  ──► server: permission, folder, type, size checks
                                          → asks Google for a resumable upload URL
                                            (sent with "Origin: <site origin>" so the browser may use it)
  3. PUT 8 MB chunks ─────────────────► googleapis.com directly (resumes after a network drop)
  4. POST /api/media/finalize ────────► server reads the file from Drive, checks parent folder,
                                          type and size, then inserts the media_assets row
  5. uploads the thumbnail to the private `media-thumbs` bucket
```

Orientation rule (pure function, unit tested):

```ts
// within 5% → square
export function orientationOf(w: number, h: number): "horizontal" | "vertical" | "square" {
  const r = w / h;
  if (r > 1.05) return "horizontal";
  if (r < 1 / 1.05) return "vertical";
  return "square";
}
```

How the browser reads sizes:
- **Images**: `createImageBitmap(file, { imageOrientation: "from-image" })`, so a portrait phone photo with a rotation flag (EXIF) is reported as vertical.
- **Videos**: a hidden `<video>` with `URL.createObjectURL(file)` → `videoWidth`, `videoHeight`, `duration` after `loadedmetadata` (browsers apply the rotation flag). The thumbnail is the frame at 1 s (or 0 for short clips).
- **HEIC** (iPhone) and other formats the browser cannot decode: upload anyway, no thumbnail. `finalize` fills width/height from Drive's `imageMediaMetadata` when present. Otherwise orientation stays empty and can be set by hand from the file menu.

## 3. Data model: `supabase/migrations/20261119000000_media_library.sql`

```sql
-- ───────── Section ─────────
alter table public.profiles drop constraint profiles_sections_valid,
  add constraint profiles_sections_valid
  check (sections <@ array['events', 'forms', 'media']::text[]);

-- ───────── Google accounts that hold the library ─────────
-- One row per Google account ever connected; exactly one is active.
-- Switching accounts keeps old rows, so switching back brings their files back.
-- No RLS policies: only the service role (server, after an admin check) reads or writes it.
create table public.drive_accounts (
  id uuid primary key default gen_random_uuid(),
  google_email text not null unique,
  refresh_token_enc text not null,
  root_folder_id text not null,            -- "Life Savers – Media" folder in that Drive
  is_active boolean not null default false,
  connected_by uuid references public.profiles(id) on delete set null,
  connected_at timestamptz not null default now()
);
create unique index drive_accounts_one_active on public.drive_accounts (is_active) where is_active;
alter table public.drive_accounts enable row level security;

-- Safe view for the UI: which account is connected, never the token.
create function public.active_drive_account()
returns table (id uuid, google_email text, connected_at timestamptz)
language sql stable security definer set search_path = public as $$
  select id, google_email, connected_at from public.drive_accounts
  where is_active and (select public.can_access('media'))
$$;

-- ───────── Folders ─────────
create table public.media_folders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.drive_accounts(id),
  name text not null check (length(btrim(name)) between 1 and 80),
  drive_folder_id text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index media_folders_name on public.media_folders (account_id, lower(btrim(name)))
  where deleted_at is null;

-- ───────── Files ─────────
create type public.media_kind as enum ('image', 'video');
create type public.media_orientation as enum ('horizontal', 'vertical', 'square');

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.media_folders(id),
  drive_file_id text not null unique,
  name text not null check (length(name) between 1 and 255),
  mime_type text not null,
  kind public.media_kind not null,
  width int check (width > 0),
  height int check (height > 0),
  orientation public.media_orientation,
  duration_s numeric(10, 2),
  size_bytes bigint not null check (size_bytes > 0),
  thumb_path text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index media_assets_browse on public.media_assets (folder_id, kind, orientation, created_at desc)
  where deleted_at is null;

alter table public.media_folders enable row level security;
alter table public.media_assets enable row level security;

-- Read and write for the media section; no delete policy (soft delete only).
create policy "media team reads folders" on public.media_folders for select
  using ((select public.can_access('media')));
create policy "media team writes folders" on public.media_folders for insert
  with check ((select public.can_access('media')));
create policy "media team updates folders" on public.media_folders for update
  using ((select public.can_access('media'))) with check ((select public.can_access('media')));
create policy "media team reads assets" on public.media_assets for select
  using ((select public.can_access('media')));
create policy "media team updates assets" on public.media_assets for update
  using ((select public.can_access('media'))) with check ((select public.can_access('media')));
-- Inserts into media_assets happen only in /api/media/finalize with the service role,
-- after the file has been verified in Drive.

-- ───────── Thumbnails ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media-thumbs', 'media-thumbs', false, 512000, array['image/webp', 'image/jpeg'])
on conflict do nothing;
create policy "media team reads thumbs" on storage.objects for select
  using (bucket_id = 'media-thumbs' and (select public.can_access('media')));
create policy "media team writes thumbs" on storage.objects for insert
  with check (bucket_id = 'media-thumbs' and (select public.can_access('media')));
```

All browse queries filter on the active account: `media_folders.account_id = (select id from active_drive_account())`.

App side, in `src/lib/permissions.ts`: add `"media"` to `SECTIONS` and set `mrkt: ["events", "media"]`. The Accounts screen picks the new checkbox up from `SECTIONS`; add its en/fr label.

## 4. Server code

| File | Role |
|---|---|
| `src/lib/google/oauth.ts` | Move `tokenRequest`, `exchangeCode`, `refreshAccessToken` out of `sheets.ts` so Sheets and Drive share them. `sheets.ts` re-imports them (no behaviour change). |
| `src/lib/google/drive.ts` | `fetch` wrappers for the Drive v3 REST API (no new dependency, same style as `sheets.ts`): `createFolder(name, parentId)`, `renameFile`, `moveFile(addParents, removeParents)`, `startResumableUpload({ name, mimeType, size, parentId, origin })` → session URL, `getFile(id, fields)`, `fetchMedia(id, range)` → `Response`, `trashFile`, `storageQuota()` (`about.get?fields=storageQuota,user`). |
| `src/lib/media/drive-token.ts` | `getDriveAccess()`: loads the active `drive_accounts` row with the admin client, refreshes the access token, caches it in memory until 5 min before expiry. Google `invalid_grant` → throws `drive_disconnected`. |
| `src/lib/media/schema.ts` | zod schemas (folder name, upload request, finalize request, filters), the `ALLOWED_TYPES` map, `MAX_FILE_BYTES` (10 GB), `orientationOf`. |
| `src/lib/media/queries.ts` | `listFolders()` (with item count and latest thumbnail), `listAssets(folderId, { kind, orientation, cursor })` with 48 per page, keyset paging on `(created_at, id)`. |
| `src/lib/media/actions.ts` | Server actions, each starting with `requireSection("media")`: `createFolder`, `renameFolder`, `deleteFolder` (only when empty; otherwise the UI asks to delete its files first), `renameAsset`, `moveAsset`, `setOrientation`, `trashAssets(ids[])`. The Drive change happens first; the DB row changes only if Drive succeeded. |
| `src/app/api/integrations/google/drive/start/route.ts` | **Admin only** (`requireSection("accounts")`). Signed state `{ userId, locale, exp }`, scopes from §1, `access_type=offline`, `prompt=consent select_account` so the admin picks the club account. |
| `src/app/api/integrations/google/drive/callback/route.ts` | Re-checks admin + state user. Exchanges the code, reads the Google email (`about.get`), creates the root folder when the account is new, upserts `drive_accounts`, and in one transaction (RPC `activate_drive_account(id)`) sets it active and the previous one inactive. Redirects to `/admin/media?connected=1`. |
| `src/app/api/media/upload-session/route.ts` | POST `{ folderId, name, mimeType, size }`. Checks section, folder belongs to the active account, type in allowlist, size ≤ limit. Returns `{ uploadUrl }`. |
| `src/app/api/media/finalize/route.ts` | POST `{ folderId, driveFileId, width?, height?, durationS? }`. Reads the file from Drive and rejects it unless its parent is the folder's `drive_folder_id`, its type is allowed and its size matches. Computes `kind` from Drive's `mimeType` (not the client's). Inserts the row with the service role. |
| `src/app/api/media/[id]/file/route.ts` | GET. Checks section, forwards the `Range` header to Drive, streams the body back (`206` + `Content-Range` when ranged, so videos seek). `?download=1` → `Content-Disposition: attachment; filename*=UTF-8''<encoded>`. `Cache-Control: private, max-age=3600`. |
| `src/app/api/media/[id]/thumb/route.ts` | GET. Redirects to a 1 h signed URL of the thumbnail (or a placeholder icon). |

Allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/heic`, `image/heif`, `video/mp4`, `video/quicktime`, `video/webm`.

## 5. Admin UI: `src/app/[locale]/admin/media/`

**Nav**: add `{ href: "/admin/media", label: t("admin.media") }` behind `can(profile, "media")` in `admin/layout.tsx`.

**`page.tsx`: library home**
- Header: connected account (`club…@gmail.com`) and a storage bar (`used / limit`, amber at 85 %, red at 95 %).
- Admins see **Connect Google Drive** (nothing connected) or **Change account**. Members see "Ask an admin to connect Google Drive" when nothing is connected, and the account name otherwise.
- **Change account** opens a confirm dialog (`components/ui/confirm.tsx`). When the active account has files: "N files are stored in old@gmail.com. They stay there and will be hidden from the site until that account is connected again." The admin must type the old email to confirm.
- Folder grid: cover thumbnail, name, counts (`12 photos · 3 videos`), menu (rename, delete). **New folder** button.

**`[folderId]/page.tsx`: folder view**
- Filter chips kept in the URL: `?kind=image|video` and `?o=horizontal|vertical|square`. Server-rendered from `listAssets`, "Load more" for the next page.
- Grid of thumbnails with a video badge + duration and the orientation shape (vertical cards are drawn taller).
- Drop zone on the whole page + **Upload** button (multiple files).
- Click a file → lightbox: `<img>` or `<video controls preload="metadata">` from `/api/media/[id]/file`; arrows for previous/next; Download, Rename, Move to folder, Set orientation, Delete.
- Multi-select: download (one file after another) and delete.

**`upload-queue.tsx`** (client component)
- Per file: read metadata → thumbnail → session → chunks (8 MB, a multiple of 256 KiB) → finalize → thumbnail upload.
- Shows progress, speed, cancel, retry. 3 uploads at a time. On a chunk error it asks Google how many bytes arrived (`PUT` with `Content-Range: bytes */<size>`) and resumes from there; three retries with back-off.
- Warns before leaving the page while uploads are running (`beforeunload`).
- When done, `router.refresh()` so the grid shows the new files.

**Messages**: `media.*` keys in `src/messages/en.json` and `fr.json` (titles, filters, errors `drive_disconnected`, `quota_full`, `type_not_allowed`, `too_large`).

## 6. Phases

**M0. Google setup (0.5 day, done by the owner)**
The checklist in §1: Drive API on, redirect URI, `drive.file` scope, **In production**, club account ready.

**M1. Foundation (0.5 day)**
Migration, `permissions.ts` + tests, Accounts checkbox label, nav entry, empty `/admin/media` page.

**M2. Drive connection (1 day)**
`oauth.ts` refactor (Sheets still works), `drive.ts`, `drive-token.ts`, admin-only start/callback, `activate_drive_account` RPC, connect / change card with the typed confirmation, storage bar.

**M3. Folders (0.5 day)**
Create, rename, delete-when-empty, folder grid with counts.

**M4. Upload (1.5 days)**
`upload-session`, `finalize` with checks, upload queue with metadata reading, thumbnails, resume and retry.

**M5. Browse and download (1 day)**
Folder view, filters in the URL, paging, file and thumb routes with `Range`, lightbox, download.

**M6. File actions and polish (0.5 day)**
Rename, move, set orientation, trash, multi-select, empty states, loading skeletons, en/fr text.

**M7. Tests and checks (0.5 day)**
- Unit (vitest): `orientationOf`, zod schemas, `can(profile, "media")`, finalize rejecting a wrong parent / type / size.
- Manual: 500 MB phone video (seek in the lightbox), portrait iPhone photo with rotation flag → vertical, HEIC, square image, upload interrupted by turning Wi-Fi off and on, member without `media` gets 403 on every route, member cannot see **Change account**, switch account and back → files reappear, Sheets integration still syncs.

About 6 working days in total.

## 7. Risks and how they are covered

| Risk | Cover |
|---|---|
| OAuth app left in *Testing* → token dies after 7 days | M0 checklist; `drive_disconnected` shows an admin "Reconnect" banner instead of a broken page. |
| Drive full (15 GB shared with Gmail/Photos) | Storage bar with warnings; Google's `storageQuotaExceeded` error mapped to a clear message. |
| A client registers a Drive file that is not theirs | `finalize` verifies parent folder, type and size in Drive before inserting; `drive.file` limits the app to its own files anyway. |
| Somebody deletes a file in drive.google.com | File and thumb routes get 404 from Drive → mark the row deleted and show "Removed from Drive". |
| Large downloads tie up the server | Streamed, never buffered; the Docker Node server has no request time limit. If the site moves to serverless hosting, revisit this route. |
| Admin changes account by mistake | Typed confirmation; old account rows kept, so reconnecting it restores everything. |

## 8. Later (not in the first version)

- Download a whole folder as a ZIP (streamed).
- "Pick from library" in the events media panel (needs a public copy, since library files are private).
- Import existing Drive files with Google Picker (gets around the `drive.file` limit).
- Tags and search by name.
