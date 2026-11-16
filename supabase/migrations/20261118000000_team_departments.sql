-- ═════════════ Team: bureau (president + vice-president) and department pages ═════════════
-- Edited by active admins only (president, VP, department leaders), like the site pages.
-- Photos live in the public `event-media` bucket under `team/…` (admins already pass its policies).

-- ───────── Bureau: exactly two fixed people, reusing team_members ─────────
alter table public.team_members
  add column position    text,
  add column bio_fr      text,
  add column bio_en      text,
  add column photo_focus jsonb not null default '{"x":50,"y":50}'::jsonb,  -- focal point, 0-100 %
  add column updated_at  timestamptz not null default now(),
  add column updated_by  uuid references public.profiles(id) on delete set null,
  add constraint team_members_position_check check (position in ('president', 'vice_president')),
  add constraint team_members_position_key unique (position);

create trigger team_members_touch before update on public.team_members
  for each row execute function public.touch_updated_at();

insert into public.team_members (position, full_name, role_title_fr, role_title_en, sort_order, is_visible)
values
  ('president', 'Nom Prénom', 'Président(e)', 'President', 0, true),
  ('vice_president', 'Nom Prénom', 'Vice-président(e)', 'Vice president', 1, true)
on conflict (position) do nothing;

drop policy "public read team" on public.team_members;
drop policy "leaders write team" on public.team_members;
create policy "public read team" on public.team_members for select
  using (is_visible or (select public.is_admin()));
-- Only the two bureau rows can be edited; they are never created or deleted from the app.
create policy "admins update team" on public.team_members for update
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ───────── Departments ─────────
create table public.departments (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  status             text not null default 'draft' check (status in ('draft', 'published')),
  name_fr            text not null,
  name_en            text,
  tagline_fr         text,                                   -- short line on the /team card
  tagline_en         text,
  content_fr         jsonb,                                  -- TipTap: what the department does (sanitized on save)
  content_en         jsonb,                                  -- falls back to content_fr when null
  leader_name        text,
  leader_role_fr     text,
  leader_role_en     text,
  leader_photo_url   text,
  leader_photo_focus jsonb not null default '{"x":50,"y":50}'::jsonb,
  leader_bio_fr      text,
  leader_bio_en      text,
  cover_url          text,                                   -- page header image (usually the team photo)
  cover_alt          text,
  cover_focus        jsonb not null default '{"x":50,"y":50}'::jsonb,
  gallery_mode       text not null default 'group' check (gallery_mode in ('group', 'members', 'both')),
  theme              jsonb not null default '{}'::jsonb,     -- parsed by parseDepartmentTheme()
  sort_order         int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references public.profiles(id) on delete set null,
  updated_by         uuid references public.profiles(id) on delete set null,
  constraint departments_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  constraint departments_theme_object check (jsonb_typeof(theme) = 'object')
);
create index departments_status_order_idx on public.departments (status, sort_order);
create trigger departments_touch before update on public.departments
  for each row execute function public.touch_updated_at();

-- Team photos (one big group photo, or several), also used as images in the content.
create table public.department_media (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  url           text not null,
  storage_path  text,
  width         int,
  height        int,
  size_bytes    bigint,
  alt           text,
  caption       text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index department_media_department_idx on public.department_media (department_id, sort_order);

-- "One photo per member": name + photo only.
create table public.department_members (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  full_name     text not null check (length(full_name) between 1 and 120),
  photo_url     text,
  photo_focus   jsonb not null default '{"x":50,"y":50}'::jsonb,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index department_members_department_idx on public.department_members (department_id, sort_order);

alter table public.departments        enable row level security;
alter table public.department_media   enable row level security;
alter table public.department_members enable row level security;

create policy "public read published departments" on public.departments for select
  using (status = 'published' or (select public.is_admin()));
create policy "admins write departments" on public.departments for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "public read department media" on public.department_media for select using (
  exists (select 1 from public.departments d
          where d.id = department_id and (d.status = 'published' or (select public.is_admin()))));
create policy "admins write department media" on public.department_media for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "public read department members" on public.department_members for select using (
  exists (select 1 from public.departments d
          where d.id = department_id and (d.status = 'published' or (select public.is_admin()))));
create policy "admins write department members" on public.department_members for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ───────── Order of departments on /team, rewritten in one call (drag and drop) ─────────
create or replace function public.reorder_departments(ids uuid[])
returns void language sql security invoker set search_path = public as $$
  update public.departments d
     set sort_order = o.pos
    from unnest(ids) with ordinality as o(id, pos)
   where d.id = o.id;
$$;
revoke all on function public.reorder_departments(uuid[]) from public, anon;
grant execute on function public.reorder_departments(uuid[]) to authenticated;

create or replace function public.reorder_department_members(ids uuid[])
returns void language sql security invoker set search_path = public as $$
  update public.department_members m
     set sort_order = o.pos
    from unnest(ids) with ordinality as o(id, pos)
   where m.id = o.id;
$$;
revoke all on function public.reorder_department_members(uuid[]) from public, anon;
grant execute on function public.reorder_department_members(uuid[]) to authenticated;
