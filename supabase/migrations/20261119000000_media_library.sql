-- ═════════════ Media library (Google Drive) ═════════════
-- Marketing stores photos and videos in the club's Google Drive. Supabase keeps one row per
-- folder and file (name, kind, size, orientation…) so browsing and filtering never wait on Drive.
-- See docs/MEDIA_LIBRARY_PLAN.md.

-- ───────── New admin section 'media' ─────────
alter table public.profiles drop constraint profiles_sections_valid;
alter table public.profiles add constraint profiles_sections_valid
  check (sections <@ array['events', 'forms', 'media']::text[]);

-- Marketing members get the library next to events (same rule as DEPARTMENT_SECTIONS in the app).
update public.profiles
set sections = array_append(sections, 'media')
where role = 'member' and department = 'mrkt' and not ('media' = any(sections));

-- ───────── Google accounts that hold the library ─────────
-- One row per Google account ever connected; at most one is active. Switching accounts keeps the
-- old row, so connecting it again brings its folders back. No RLS policy: only the service role
-- (server code, after an admin check) reads or writes it. The token never reaches a browser.
create table public.drive_accounts (
  id uuid primary key default gen_random_uuid(),
  google_email text not null unique,
  refresh_token_enc text not null,
  root_folder_id text not null,
  is_active boolean not null default false,
  connected_by uuid references public.profiles(id) on delete set null,
  connected_at timestamptz not null default now()
);
create unique index drive_accounts_one_active on public.drive_accounts (is_active) where is_active;
alter table public.drive_accounts enable row level security;

-- What the UI may know about the connection: which account, never the token.
create or replace function public.active_drive_account()
returns table (id uuid, google_email text, connected_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.google_email, a.connected_at
  from public.drive_accounts a
  where a.is_active and (select public.can_access('media'))
$$;
revoke execute on function public.active_drive_account() from public, anon;
grant execute on function public.active_drive_account() to authenticated;

-- Makes one account the active one, atomically (called by the OAuth callback with the service role).
create or replace function public.activate_drive_account(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.drive_accounts where id = p_id) then
    raise exception 'unknown_drive_account';
  end if;
  update public.drive_accounts set is_active = false where is_active and id <> p_id;
  update public.drive_accounts set is_active = true where id = p_id;
end $$;
revoke execute on function public.activate_drive_account(uuid) from public, anon, authenticated;
grant execute on function public.activate_drive_account(uuid) to service_role;

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
  duration_s numeric(10, 2) check (duration_s >= 0),
  size_bytes bigint not null check (size_bytes > 0),
  thumb_path text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index media_assets_browse on public.media_assets (folder_id, created_at desc, id desc)
  where deleted_at is null;
create index media_assets_filter on public.media_assets (folder_id, kind, orientation)
  where deleted_at is null;

alter table public.media_folders enable row level security;
alter table public.media_assets enable row level security;

-- The media team reads and edits; nothing is ever hard-deleted (soft delete through deleted_at).
create policy "media team reads folders" on public.media_folders for select
  using ((select public.can_access('media')));
create policy "media team creates folders" on public.media_folders for insert
  with check ((select public.can_access('media')));
create policy "media team updates folders" on public.media_folders for update
  using ((select public.can_access('media'))) with check ((select public.can_access('media')));

create policy "media team reads assets" on public.media_assets for select
  using ((select public.can_access('media')));
create policy "media team updates assets" on public.media_assets for update
  using ((select public.can_access('media'))) with check ((select public.can_access('media')));
-- No insert policy: /api/media/finalize inserts with the service role, after checking the file in Drive.

-- ───────── Thumbnails (small WebP made in the browser) ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media-thumbs', 'media-thumbs', false, 512000, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "media team reads thumbs" on storage.objects for select
  using (bucket_id = 'media-thumbs' and (select public.can_access('media')));
create policy "media team uploads thumbs" on storage.objects for insert
  with check (bucket_id = 'media-thumbs' and (select public.can_access('media')));
create policy "media team replaces thumbs" on storage.objects for update
  using (bucket_id = 'media-thumbs' and (select public.can_access('media')))
  with check (bucket_id = 'media-thumbs' and (select public.can_access('media')));
