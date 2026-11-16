-- ═════════════ Roles & section permissions ═════════════
-- admin  = president, vice-president, department leaders, webmaster: everything, incl. accounts.
-- member = department member: only the admin sections listed in profiles.sections
--          (HR → forms, marketing → events by default; ER / FL / ORG → none).
-- The old 'leader' role is retired: existing leaders become members with both sections,
-- so nobody gains or loses access on deploy. Promote real leaders to admin from /admin/accounts.

create type public.department as enum ('hr', 'er', 'mrkt', 'fl', 'org');

alter table public.profiles
  add column department public.department,
  add column sections text[] not null default '{}',
  add constraint profiles_sections_valid check (sections <@ array['events', 'forms']::text[]);

update public.profiles set role = 'member', sections = array['events', 'forms'] where role = 'leader';
alter table public.profiles alter column role set default 'member';

-- New sign-ups: first account is the root admin, everyone else a pending member with no section.
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
    case when first_user then 'admin'::public.app_role else 'member'::public.app_role end,
    case when first_user then 'active'::public.account_status else 'pending'::public.account_status end
  );
  return new;
end $$;

-- ───────── Permission checks ─────────

-- Active account allowed into an admin section ('events' | 'forms'). Admins pass every section.
create or replace function public.can_access(p_section text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
      and (role = 'admin' or p_section = any(sections)))
$$;

-- Fail closed: anything still checking is_leader() is now admin-only.
create or replace function public.is_leader() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
$$;

-- ───────── Profiles: members see only themselves and cannot raise their own access ─────────

create or replace function public.own_privileges_unchanged(
  p_role public.app_role, p_status public.account_status, p_sections text[], p_department public.department
) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = p_role and status = p_status
      and sections = p_sections and department is not distinct from p_department)
$$;

drop policy "own or leader read" on public.profiles;
drop policy "own update (not role/status)" on public.profiles;
create policy "own or admin read" on public.profiles for select
  using (id = auth.uid() or (select public.is_admin()));
create policy "own update (not access fields)" on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and public.own_privileges_unchanged(role, status, sections, department));

-- Never leave the club without an active admin.
create or replace function public.keep_one_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'admin' or new.status <> 'active')
     and not exists (select 1 from public.profiles
                     where role = 'admin' and status = 'active' and id <> old.id) then
    raise exception 'last_admin';
  end if;
  return coalesce(new, old);
end $$;
create trigger profiles_keep_one_admin before update or delete on public.profiles
  for each row execute function public.keep_one_admin();

-- ───────── Events section ─────────

drop policy "public read published events" on public.events;
drop policy "leaders write events" on public.events;
drop policy "public read event media" on public.event_media;
drop policy "leaders write event media" on public.event_media;
drop policy "leaders manage attendees" on public.event_attendees;
drop policy "leaders upload event media files" on storage.objects;
drop policy "leaders update event media files" on storage.objects;
drop policy "leaders delete event media files" on storage.objects;

create policy "public read published events" on public.events for select
  using (status = 'published' or (select public.can_access('events')));
create policy "events team writes events" on public.events for all
  using ((select public.can_access('events'))) with check ((select public.can_access('events')));
create policy "public read event media" on public.event_media for select using (
  exists (select 1 from public.events e
          where e.id = event_id and (e.status = 'published' or (select public.can_access('events')))));
create policy "events team writes event media" on public.event_media for all
  using ((select public.can_access('events'))) with check ((select public.can_access('events')));
create policy "events team manages attendees" on public.event_attendees for all
  using ((select public.can_access('events'))) with check ((select public.can_access('events')));

create policy "events team uploads event media files" on storage.objects for insert
  with check (bucket_id = 'event-media' and (select public.can_access('events')));
create policy "events team updates event media files" on storage.objects for update
  using (bucket_id = 'event-media' and (select public.can_access('events')))
  with check (bucket_id = 'event-media' and (select public.can_access('events')));
create policy "events team deletes event media files" on storage.objects for delete
  using (bucket_id = 'event-media' and (select public.can_access('events')));

-- The public /events page design (site_settings key 'events_page') belongs to the events team.
create policy "events team writes events page" on public.site_settings for all
  using (key = 'events_page' and (select public.can_access('events')))
  with check (key = 'events_page' and (select public.can_access('events')));

-- ───────── Forms section (HR): forms, responses, files, members ─────────

drop policy "public read published forms" on public.forms;
drop policy "leaders write forms" on public.forms;
drop policy "public read live version" on public.form_versions;
drop policy "leaders manage versions" on public.form_versions;
drop policy "leaders read responses" on public.responses;
drop policy "leaders delete responses" on public.responses;
drop policy "leaders review responses" on public.responses;
drop policy "leaders read files" on public.response_files;
drop policy "leaders delete files" on public.response_files;
drop policy "leaders read sync jobs" on public.sheet_sync_jobs;
drop policy "leaders manage members" on public.members;
drop policy "leaders read form files" on storage.objects;

create policy "public read published forms" on public.forms for select
  using ((status = 'published' and not is_template) or (select public.can_access('forms')));
create policy "forms team writes forms" on public.forms for all
  using ((select public.can_access('forms'))) with check ((select public.can_access('forms')));
create policy "public read live version" on public.form_versions for select using (
  exists (select 1 from public.forms f
          where f.published_version_id = form_versions.id and f.status = 'published' and not f.is_template)
  or (select public.can_access('forms')));
create policy "forms team manages versions" on public.form_versions for all
  using ((select public.can_access('forms'))) with check ((select public.can_access('forms')));

create policy "forms team reads responses" on public.responses for select
  using ((select public.can_access('forms')));
create policy "forms team reviews responses" on public.responses for update
  using ((select public.can_access('forms'))) with check ((select public.can_access('forms')));
create policy "forms team deletes responses" on public.responses for delete
  using ((select public.can_access('forms')));
create policy "forms team reads files" on public.response_files for select
  using ((select public.can_access('forms')));
create policy "forms team deletes files" on public.response_files for delete
  using ((select public.can_access('forms')));
create policy "forms team reads sync jobs" on public.sheet_sync_jobs for select
  using ((select public.can_access('forms')));
create policy "forms team manages members" on public.members for all
  using ((select public.can_access('forms'))) with check ((select public.can_access('forms')));
create policy "forms team reads form files" on storage.objects for select
  using (bucket_id = 'form-uploads' and (select public.can_access('forms')));

create or replace function public.publish_form(p_form_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare f public.forms%rowtype; v int; vid uuid;
begin
  if not public.can_access('forms') then raise exception 'not allowed'; end if;
  select * into f from public.forms where id = p_form_id for update;
  if not found then raise exception 'form not found'; end if;
  select coalesce(max(version), 0) + 1 into v from public.form_versions where form_id = p_form_id;
  insert into public.form_versions (form_id, version, schema, theme, settings, published_by)
    values (p_form_id, v, f.schema, f.theme, f.settings, auth.uid())
    returning id into vid;
  update public.forms set status = 'published', published_version_id = vid where id = p_form_id;
  return vid;
end $$;

create or replace function public.duplicate_form(p_form_id uuid, p_title text, p_slug text) returns uuid
language plpgsql security definer set search_path = public as $$
declare f public.forms%rowtype; nid uuid;
begin
  if not public.can_access('forms') then raise exception 'not allowed'; end if;
  select * into f from public.forms where id = p_form_id;
  if not found then raise exception 'form not found'; end if;
  insert into public.forms (slug, title, status, kind, description, cover_url, logo_url, schema, theme, settings, created_by)
    values (p_slug, p_title, 'draft', f.kind, f.description, f.cover_url, f.logo_url, f.schema, f.theme, f.settings, auth.uid())
    returning id into nid;
  return nid;
end $$;

-- ───────── Shared 'media' bucket (form designs and event headers) ─────────

drop policy "leaders write media" on storage.objects;
create policy "content teams write media" on storage.objects for all
  using (bucket_id = 'media' and ((select public.can_access('events')) or (select public.can_access('forms'))))
  with check (bucket_id = 'media' and ((select public.can_access('events')) or (select public.can_access('forms'))));

-- team_members keeps its old policies, which now resolve to admin-only through is_leader().
