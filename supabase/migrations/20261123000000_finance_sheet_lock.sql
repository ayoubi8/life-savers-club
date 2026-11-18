-- ═════════════ Finance: admins can lock a sheet ═════════════
-- A locked sheet is read-only for everyone (admins included) until an admin unlocks it:
-- no new operation, no edit, no cancel. Only admins lock and unlock; changes are in the history.

alter table public.finance_sheets
  add column locked_at timestamptz,
  add column locked_by uuid references public.profiles(id) on delete set null;

-- Lock column belongs to admins; a locked sheet cannot be renamed or archived by members.
-- The server's own bookkeeping (service role, no signed-in user) is never blocked.
create or replace function public.finance_sheet_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.locked_at := null;
    new.locked_by := null;
    return new;
  end if;
  if auth.uid() is null then return new; end if;
  if new.locked_at is distinct from old.locked_at then
    if not public.is_admin() then raise exception 'forbidden'; end if;
    new.locked_by := case when new.locked_at is null then null else auth.uid() end;
  elsif old.locked_at is not null and not public.is_admin() then
    raise exception 'sheet_locked';
  end if;
  return new;
end $$;

create trigger finance_sheets_guard before insert or update on public.finance_sheets
  for each row execute function public.finance_sheet_guard();

-- Operations and product lines of a locked sheet cannot be added, changed or cancelled.
create or replace function public.finance_check_unlocked() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sheets uuid[];
begin
  if tg_table_name = 'finance_lines' then
    select array[o.sheet_id] into v_sheets
    from public.finance_operations o
    where o.id = case when tg_op = 'DELETE' then old.operation_id else new.operation_id end;
  elsif tg_op = 'INSERT' then
    v_sheets := array[new.sheet_id];
  else
    v_sheets := array[old.sheet_id, new.sheet_id];   -- moving out of, or into, a locked sheet
  end if;
  if exists (select 1 from public.finance_sheets s where s.id = any(v_sheets) and s.locked_at is not null) then
    raise exception 'sheet_locked';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger finance_operations_unlocked before insert or update on public.finance_operations
  for each row execute function public.finance_check_unlocked();
create trigger finance_lines_unlocked before insert or update or delete on public.finance_lines
  for each row execute function public.finance_check_unlocked();
