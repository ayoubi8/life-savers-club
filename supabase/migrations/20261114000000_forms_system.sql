-- Life Savers Club: forms system, members, settings (builds on 20261112000000_init.sql)

-- ═════════════ Forms: kinds, versions, templates ═════════════
create type public.form_kind as enum
  ('generic', 'membership', 'event_registration', 'feedback', 'quiz');

create table public.form_versions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  version int not null,
  schema jsonb not null,
  theme jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz not null default now(),
  unique (form_id, version)
);

alter table public.forms
  add column kind public.form_kind not null default 'generic',
  add column description text,
  add column cover_url text,
  add column logo_url text,
  add column is_template boolean not null default false,
  add column published_version_id uuid references public.form_versions(id) on delete set null,
  add column sheet_url text,
  add column sheet_tab text,
  add column sheet_last_synced_at timestamptz;

create index forms_event_idx on public.forms (event_id);

-- Publishing snapshots the editable form, so edits never change what old responses answered.
create or replace function public.publish_form(p_form_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare f public.forms%rowtype; v int; vid uuid;
begin
  if not public.is_leader() then raise exception 'not allowed'; end if;
  select * into f from public.forms where id = p_form_id for update;
  if not found then raise exception 'form not found'; end if;
  select coalesce(max(version), 0) + 1 into v from public.form_versions where form_id = p_form_id;
  insert into public.form_versions (form_id, version, schema, theme, settings, published_by)
    values (p_form_id, v, f.schema, f.theme, f.settings, auth.uid())
    returning id into vid;
  update public.forms set status = 'published', published_version_id = vid where id = p_form_id;
  return vid;
end $$;

-- Duplicate a form (also used to instantiate a template).
create or replace function public.duplicate_form(p_form_id uuid, p_title text, p_slug text) returns uuid
language plpgsql security definer set search_path = public as $$
declare f public.forms%rowtype; nid uuid;
begin
  if not public.is_leader() then raise exception 'not allowed'; end if;
  select * into f from public.forms where id = p_form_id;
  if not found then raise exception 'form not found'; end if;
  insert into public.forms (slug, title, status, kind, description, cover_url, logo_url, schema, theme, settings, created_by)
    values (p_slug, p_title, 'draft', f.kind, f.description, f.cover_url, f.logo_url, f.schema, f.theme, f.settings, auth.uid())
    returning id into nid;
  return nid;
end $$;

-- Public pages only see published, non-template forms.
drop policy "public read published forms" on public.forms;
create policy "public read published forms" on public.forms for select
  using ((status = 'published' and not is_template) or public.is_leader());

alter table public.form_versions enable row level security;
create policy "public read live version" on public.form_versions for select using (
  exists (select 1 from public.forms f
          where f.published_version_id = form_versions.id and f.status = 'published' and not f.is_template)
  or public.is_leader());
create policy "leaders manage versions" on public.form_versions for all
  using (public.is_leader()) with check (public.is_leader());

-- ═════════════ Responses: review workflow, scoring, files ═════════════
create type public.response_status as enum ('new', 'reviewed', 'accepted', 'rejected', 'spam');

alter table public.responses
  add column form_version_id uuid references public.form_versions(id) on delete set null,
  add column status public.response_status not null default 'new',
  add column reviewed_by uuid references public.profiles(id) on delete set null,
  add column reviewed_at timestamptz,
  add column review_note text,
  add column score numeric,
  add column max_score numeric;

create index responses_status_idx on public.responses (form_id, status);
create index responses_email_idx on public.responses (form_id, lower(respondent_email));

create table public.response_files (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  field_id text not null,
  storage_path text not null,
  file_name text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
create index response_files_response_idx on public.response_files (response_id);

-- Visitors may only submit "fresh" responses; review fields are leader-only.
drop policy "public submit to open form" on public.responses;
create policy "public submit to open form" on public.responses for insert with check (
  status = 'new' and reviewed_by is null and reviewed_at is null and score is null and review_note is null
  and exists (
    select 1 from public.forms f
    where f.id = form_id and f.status = 'published' and not f.is_template
      and (f.opens_at is null or f.opens_at <= now())
      and (f.closes_at is null or f.closes_at >= now())));
create policy "leaders review responses" on public.responses for update
  using (public.is_leader()) with check (public.is_leader());

alter table public.response_files enable row level security;
create policy "public attach files to new response" on public.response_files for insert with check (
  exists (select 1 from public.responses r where r.id = response_id and r.created_at > now() - interval '10 minutes'));
create policy "leaders read files" on public.response_files for select using (public.is_leader());
create policy "leaders delete files" on public.response_files for delete using (public.is_leader());

-- Response limit and one-per-email, driven by forms.settings: {"maxResponses": 100, "onePerEmail": true}
create or replace function public.before_response_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare f public.forms%rowtype; max_r int; cnt int;
begin
  select * into f from public.forms where id = new.form_id;
  new.form_version_id := coalesce(new.form_version_id, f.published_version_id);

  max_r := nullif(f.settings->>'maxResponses', '')::int;
  if max_r is not null then
    select count(*) into cnt from public.responses where form_id = new.form_id;
    if cnt >= max_r then raise exception 'response_limit_reached'; end if;
  end if;

  if coalesce((f.settings->>'onePerEmail')::boolean, false) and new.respondent_email is not null then
    if exists (select 1 from public.responses
               where form_id = new.form_id and lower(respondent_email) = lower(new.respondent_email)) then
      raise exception 'duplicate_response';
    end if;
  end if;
  return new;
end $$;
create trigger responses_before_insert before insert on public.responses
  for each row execute function public.before_response_insert();

-- ═════════════ Google Sheets outbox (reliable, retryable sync) ═════════════
create type public.sync_status as enum ('pending', 'done', 'failed');

create table public.sheet_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  form_id uuid not null references public.forms(id) on delete cascade,
  status public.sync_status not null default 'pending',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index sheet_sync_pending_idx on public.sheet_sync_jobs (created_at) where status <> 'done';

create or replace function public.enqueue_sheet_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.forms where id = new.form_id and sheet_id is not null) then
    insert into public.sheet_sync_jobs (response_id, form_id) values (new.id, new.form_id);
  end if;
  return new;
end $$;
create trigger responses_enqueue_sync after insert on public.responses
  for each row execute function public.enqueue_sheet_sync();

alter table public.sheet_sync_jobs enable row level security;
create policy "leaders read sync jobs" on public.sheet_sync_jobs for select using (public.is_leader());
-- writes happen with the service role only

-- ═════════════ Members & attendance (from accepted applications / manual entry) ═════════════
create type public.member_status as enum ('active', 'alumni', 'inactive');

create table public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  university text,
  field_of_study text,
  study_year text,
  status public.member_status not null default 'active',
  joined_at date not null default current_date,
  source_response_id uuid references public.responses(id) on delete set null,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index members_email_uidx on public.members (lower(email)) where email is not null;

create table public.event_attendees (
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  attended boolean not null default false,
  role text,
  primary key (event_id, member_id)
);

alter table public.members enable row level security;
alter table public.event_attendees enable row level security;
create policy "leaders manage members" on public.members for all using (public.is_leader()) with check (public.is_leader());
create policy "leaders manage attendees" on public.event_attendees for all using (public.is_leader()) with check (public.is_leader());

-- ═════════════ Events extras (old events can be entered fast) ═════════════
alter table public.events
  add column tags text[] not null default '{}',
  add column registration_form_id uuid references public.forms(id) on delete set null,
  add column attendee_count int;            -- free number for old events with no member list

-- ═════════════ Site settings (contact, socials, hero text editable from admin) ═════════════
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
create policy "public read settings" on public.site_settings for select using (true);
create policy "admin write settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

-- ═════════════ Storage limits ═════════════
update storage.buckets set file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'] where id = 'media';
update storage.buckets set file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'] where id = 'form-uploads';
