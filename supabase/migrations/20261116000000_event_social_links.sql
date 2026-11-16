-- ═════════════ Events: links to the event's own posts on social networks ═════════════
-- {"instagram": "https://www.instagram.com/p/…", "facebook": "https://…", "tiktok": "https://…"}
-- Set in the admin Details tab, shown as "Voir sur Instagram / Facebook / TikTok" on the event page.
-- Values are validated by parseSocialLinks() (https + known host) before they are saved.
alter table public.events
  add column social_links jsonb not null default '{}'::jsonb;

alter table public.events
  add constraint events_social_links_object check (jsonb_typeof(social_links) = 'object');
