-- ═════════════ Guided tours of the admin area ═════════════
-- Which page guides each person has finished or skipped: { "media.library": 1, … } (tour id → version).
-- Raising a tour's version in the app shows it once more. See docs/GUIDED_TOURS_PLAN.md.

alter table public.profiles add column tours_seen jsonb not null default '{}'::jsonb;

-- Merges one key, so two tabs finishing different tours never overwrite each other.
-- security invoker: the existing "own update (not access fields)" policy applies.
create or replace function public.mark_tour_seen(p_tour text, p_version int)
returns void language sql security invoker set search_path = public as $$
  update public.profiles
  set tours_seen = tours_seen || jsonb_build_object(p_tour, p_version)
  where id = auth.uid()
$$;
revoke execute on function public.mark_tour_seen(text, int) from public, anon;
grant execute on function public.mark_tour_seen(text, int) to authenticated;
