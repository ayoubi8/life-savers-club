-- ═════════════ Owner account ═════════════
-- One protected account (the webmaster). Other admins can't change or delete it, and only the
-- owner may change other accounts' email and password (server action with the service role).
-- The flag is set once on the right account directly in the database, never through the app:
--   update public.profiles set is_owner = true where email = '…';

alter table public.profiles add column is_owner boolean not null default false;
create unique index profiles_single_owner on public.profiles (is_owner) where is_owner;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active' and is_owner)
$$;

-- Requests from the app (auth.uid() set) can never grant or remove the flag, nor change or
-- delete the owner's row unless they are the owner. The service role / SQL editor (no
-- auth.uid()) is left alone, so the flag can still be managed from Supabase itself.
create or replace function public.protect_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' and new.is_owner is distinct from old.is_owner then
    raise exception 'owner_protected';
  end if;
  if old.is_owner and old.id <> auth.uid() then
    raise exception 'owner_protected';
  end if;
  return coalesce(new, old);
end $$;
create trigger profiles_protect_owner before update or delete on public.profiles
  for each row execute function public.protect_owner();

-- The owner always stays an active admin, even if they try it themselves.
create or replace function public.owner_stays_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_owner and (new.role <> 'admin' or new.status <> 'active') and auth.uid() is not null then
    raise exception 'owner_protected';
  end if;
  return new;
end $$;
create trigger profiles_owner_stays_admin before update on public.profiles
  for each row execute function public.owner_stays_admin();
