-- ═════════════ Events CMS: rich event pages, themes, featured events, media library ═════════════

-- ───────── events: content, design, position, stats ─────────
alter table public.events
  add column content_fr        jsonb,                              -- TipTap document (sanitized on save)
  add column content_en        jsonb,                              -- falls back to content_fr when null
  add column cover_alt         text,
  add column cover_focus       jsonb not null default '{"x":50,"y":50}'::jsonb,  -- focal point, 0-100 %
  add column theme             jsonb not null default '{}'::jsonb, -- parsed by parseEventTheme()
  add column featured          boolean not null default false,     -- pinned on home / "À la une"
  add column featured_order    int not null default 0,
  add column stats             jsonb not null default '[]'::jsonb, -- [{value, label_fr, label_en, icon}]
  add column show_registration boolean not null default false,
  add column updated_by        uuid references public.profiles(id) on delete set null;

alter table public.events
  add constraint events_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  add constraint events_stats_array check (jsonb_typeof(stats) = 'array'),
  add constraint events_theme_object check (jsonb_typeof(theme) = 'object'),
  add constraint events_dates_order check (ends_at is null or ends_at >= starts_at);

create index events_status_starts_idx on public.events (status, starts_at desc);
create index events_featured_idx on public.events (featured_order) where featured;
create index events_registration_form_idx on public.events (registration_form_id);

-- ───────── event_media: the event's media library (every upload is tracked) ─────────
alter table public.event_media
  add column kind         text not null default 'image' check (kind in ('image', 'video')),
  add column storage_path text,          -- path inside the event-media bucket, used for cleanup
  add column width        int,
  add column height       int,
  add column size_bytes   bigint,
  add column alt          text,
  add column created_at   timestamptz not null default now();

create index event_media_event_idx on public.event_media (event_id, sort_order);

-- Faster RLS: evaluate the role check once per query, not once per row.
drop policy "public read published events" on public.events;
drop policy "leaders write events" on public.events;
drop policy "public read event media" on public.event_media;
drop policy "leaders write event media" on public.event_media;

create policy "public read published events" on public.events for select
  using (status = 'published' or (select public.is_leader()));
create policy "leaders write events" on public.events for all
  using ((select public.is_leader())) with check ((select public.is_leader()));
create policy "public read event media" on public.event_media for select using (
  exists (select 1 from public.events e
          where e.id = event_id and (e.status = 'published' or (select public.is_leader()))));
create policy "leaders write event media" on public.event_media for all
  using ((select public.is_leader())) with check ((select public.is_leader()));

-- ───────── Storage: event photos and short videos ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-media', 'event-media', true, 52428800,  -- 50 MB (free-plan maximum per file)
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public read event media files" on storage.objects for select
  using (bucket_id = 'event-media');
create policy "leaders upload event media files" on storage.objects for insert
  with check (bucket_id = 'event-media' and (select public.is_leader()));
create policy "leaders update event media files" on storage.objects for update
  using (bucket_id = 'event-media' and (select public.is_leader()))
  with check (bucket_id = 'event-media' and (select public.is_leader()));
create policy "leaders delete event media files" on storage.objects for delete
  using (bucket_id = 'event-media' and (select public.is_leader()));

-- ───────── Featured order: rewrite positions in one call ─────────
-- Called by the admin "À la une" drag-and-drop. Runs with the caller's rights (RLS applies).
create or replace function public.reorder_featured_events(ids uuid[])
returns void language sql security invoker set search_path = public as $$
  update public.events e
     set featured_order = o.pos
    from unnest(ids) with ordinality as o(id, pos)
   where e.id = o.id;
$$;
revoke all on function public.reorder_featured_events(uuid[]) from public, anon;
grant execute on function public.reorder_featured_events(uuid[]) to authenticated;
