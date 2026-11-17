-- ═════════════ Media library: deletions need an admin ═════════════
-- Admins delete folders (with everything inside) and files directly. Other media members send a
-- request instead; an admin approves (the app then trashes the items in Drive) or rejects it.

create type public.media_request_status as enum ('pending', 'approved', 'rejected');

create table public.media_delete_requests (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.media_folders(id),
  -- null = the whole folder; otherwise these files of the folder.
  asset_ids uuid[] check (asset_ids is null or cardinality(asset_ids) between 1 and 100),
  requested_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  status public.media_request_status not null default 'pending',
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz
);
-- One pending request per folder deletion.
create unique index media_delete_requests_one_folder on public.media_delete_requests (folder_id)
  where status = 'pending' and asset_ids is null;
create index media_delete_requests_pending on public.media_delete_requests (created_at)
  where status = 'pending';

alter table public.media_delete_requests enable row level security;

create policy "own or admin reads delete requests" on public.media_delete_requests for select
  using (requested_by = auth.uid() or (select public.is_admin()));
create policy "media team requests deletions" on public.media_delete_requests for insert
  with check (
    (select public.can_access('media'))
    and requested_by = auth.uid() and status = 'pending' and decided_by is null and decided_at is null);
create policy "admin decides delete requests" on public.media_delete_requests for update
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ───────── Only admins (or server code with the service role) may soft-delete ─────────
create or replace function public.media_delete_admin_only() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.deleted_at is null and new.deleted_at is not null
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger media_folders_delete_admin_only before update of deleted_at on public.media_folders
  for each row execute function public.media_delete_admin_only();
create trigger media_assets_delete_admin_only before update of deleted_at on public.media_assets
  for each row execute function public.media_delete_admin_only();
