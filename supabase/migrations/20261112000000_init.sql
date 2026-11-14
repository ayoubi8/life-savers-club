-- Life Savers Club: foundation schema (phase 1)
create extension if not exists pgcrypto;

-- ───────── Roles & profiles ─────────
create type public.app_role as enum ('admin', 'leader');

-- Anyone can create an account, but it stays 'pending' (no access) until an admin activates it.
create type public.account_status as enum ('pending', 'active', 'disabled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role public.app_role not null default 'leader',
  status public.account_status not null default 'pending',
  created_at timestamptz not null default now(),
  activated_by uuid references public.profiles(id) on delete set null,
  activated_at timestamptz
);

create or replace function public.current_role_of_user()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_status_of_user()
returns public.account_status language sql stable security definer set search_path = public as $$
  select status from public.profiles where id = auth.uid()
$$;

-- "Leader" = any ACTIVE account (leader or admin). Pending/disabled accounts have no access.
create or replace function public.is_leader() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active' and role = 'admin')
$$;

-- The very first account becomes the active root admin. Everyone else starts 'pending'.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  first_user := not exists (select 1 from public.profiles);
  insert into public.profiles (id, email, full_name, avatar_url, role, status)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    case when first_user then 'admin'::public.app_role else 'leader'::public.app_role end,
    case when first_user then 'active'::public.account_status else 'pending'::public.account_status end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── Events ─────────
create type public.publish_status as enum ('draft', 'published', 'archived');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_fr text not null,
  title_en text,
  description_fr text,
  description_en text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  cover_url text,
  status public.publish_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_starts_at_idx on public.events (starts_at desc);

create table public.event_media (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  url text not null,
  caption text,
  sort_order int not null default 0
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role_title_fr text,
  role_title_en text,
  photo_url text,
  sort_order int not null default 0,
  is_visible boolean not null default true
);

-- ───────── Forms & responses ─────────
create table public.forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  status public.publish_status not null default 'draft',
  event_id uuid references public.events(id) on delete set null,
  schema jsonb not null default '{"pages":[]}'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  sheet_id text,
  sheet_owner uuid references public.profiles(id) on delete set null,
  opens_at timestamptz,
  closes_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  answers jsonb not null,
  respondent_name text,
  respondent_email text,
  meta jsonb not null default '{}'::jsonb,
  synced_to_sheet boolean not null default false,
  created_at timestamptz not null default now()
);
create index responses_form_idx on public.responses (form_id, created_at desc);

create table public.google_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  refresh_token_enc text not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
create trigger forms_touch  before update on public.forms  for each row execute function public.touch_updated_at();

-- ───────── Row Level Security ─────────
alter table public.profiles           enable row level security;
alter table public.events             enable row level security;
alter table public.event_media        enable row level security;
alter table public.team_members       enable row level security;
alter table public.forms              enable row level security;
alter table public.responses          enable row level security;
alter table public.google_connections enable row level security;

-- profiles
create policy "own or leader read" on public.profiles for select using (id = auth.uid() or public.is_leader());
create policy "own update (not role/status)" on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_role_of_user() and status = public.current_status_of_user());
create policy "admin manage" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
-- events
create policy "public read published events" on public.events for select using (status = 'published' or public.is_leader());
create policy "leaders write events" on public.events for all using (public.is_leader()) with check (public.is_leader());
create policy "public read event media" on public.event_media for select using (
  exists (select 1 from public.events e where e.id = event_id and (e.status = 'published' or public.is_leader())));
create policy "leaders write event media" on public.event_media for all using (public.is_leader()) with check (public.is_leader());
-- team
create policy "public read team" on public.team_members for select using (is_visible or public.is_leader());
create policy "leaders write team" on public.team_members for all using (public.is_leader()) with check (public.is_leader());
-- forms
create policy "public read published forms" on public.forms for select using (status = 'published' or public.is_leader());
create policy "leaders write forms" on public.forms for all using (public.is_leader()) with check (public.is_leader());
-- responses: anyone may submit to an open, published form; only leaders read
create policy "public submit to open form" on public.responses for insert with check (
  exists (
    select 1 from public.forms f
    where f.id = form_id and f.status = 'published'
      and (f.opens_at is null or f.opens_at <= now())
      and (f.closes_at is null or f.closes_at >= now())
  ));
create policy "leaders read responses"   on public.responses for select using (public.is_leader());
create policy "leaders delete responses" on public.responses for delete using (public.is_leader());
-- google_connections: no policies, so only the service role can touch it

-- ───────── Storage ─────────
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('form-uploads', 'form-uploads', false) on conflict do nothing;

create policy "public read media" on storage.objects for select using (bucket_id = 'media');
create policy "leaders write media" on storage.objects for all
  using (bucket_id = 'media' and public.is_leader()) with check (bucket_id = 'media' and public.is_leader());
create policy "public upload form files" on storage.objects for insert with check (bucket_id = 'form-uploads');
create policy "leaders read form files" on storage.objects for select using (bucket_id = 'form-uploads' and public.is_leader());
