-- ═════════════ Finance & logistics ═════════════
-- One budget per year: it opens with what the club has, then every purchase, event cost and
-- income moves it. The team records operations in sheets they create and name freely.
-- Members may change their own operations for 24 hours; after that only admins can.
-- See docs/FINANCE_PLAN.md.

-- ───────── Section 'finance' (Finance & Logistics department + admins) ─────────
alter table public.profiles drop constraint profiles_sections_valid;
alter table public.profiles add constraint profiles_sections_valid
  check (sections <@ array['events', 'forms', 'media', 'finance']::text[]);

update public.profiles
set sections = array_append(sections, 'finance')
where role = 'member' and department = 'fl' and not ('finance' = any(sections));

-- Gmail used to open finance sheets in Google Sheets (defaults to the account email).
alter table public.profiles add column google_share_email text
  check (google_share_email is null or google_share_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Folder of the finance Google files in the club Drive (created on first use).
alter table public.drive_accounts add column finance_folder_id text;

-- ───────── Years ─────────
create table public.finance_years (
  id uuid primary key default gen_random_uuid(),
  label text not null unique check (length(btrim(label)) between 1 and 40),
  opening_balance numeric(14,2) not null default 0,
  status text not null default 'open' check (status in ('open', 'closed')),
  starts_on date not null default current_date,
  ends_on date,
  gsheet_id text,
  gsheet_account_id uuid references public.drive_accounts(id) on delete set null,
  gsheet_synced_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index finance_years_one_open on public.finance_years (status) where status = 'open';

-- ───────── Sheets (created and named by the team) ─────────
create table public.finance_sheets (
  id uuid primary key default gen_random_uuid(),
  year_id uuid not null references public.finance_years(id),
  name text not null check (length(btrim(name)) between 1 and 120),
  description text check (length(description) <= 1000),
  event_id uuid references public.events(id) on delete set null,
  gsheet_id text,
  gsheet_account_id uuid references public.drive_accounts(id) on delete set null,
  gsheet_synced_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create unique index finance_sheets_name on public.finance_sheets (year_id, lower(btrim(name)))
  where archived_at is null;

-- ───────── Operations ─────────
create type public.finance_kind as enum ('income', 'expense', 'adjustment');

create table public.finance_operations (
  id uuid primary key default gen_random_uuid(),
  year_id uuid not null references public.finance_years(id),
  sheet_id uuid references public.finance_sheets(id),
  kind public.finance_kind not null,
  occurred_on date not null,
  category text not null check (length(category) between 1 and 40),
  label text not null check (length(btrim(label)) between 1 and 200),
  counterparty text check (length(counterparty) <= 200),
  payment_method text check (payment_method in ('cash', 'transfer', 'card', 'cheque', 'other')),
  note text check (length(note) <= 2000),
  adjustment_amount numeric(14,2),
  receipt_path text,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancel_reason text check (length(cancel_reason) <= 500),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  -- Adjustments (admins) live outside sheets and carry their own signed amount.
  constraint finance_adjustment_shape check (
    (kind = 'adjustment' and sheet_id is null and adjustment_amount is not null)
    or (kind <> 'adjustment' and sheet_id is not null and adjustment_amount is null)),
  constraint finance_cancel_reason check (cancelled_at is null or length(btrim(cancel_reason)) >= 3)
);
create index finance_operations_year on public.finance_operations (year_id, occurred_on, created_at, id);
create index finance_operations_sheet on public.finance_operations (sheet_id, occurred_on, created_at, id);

-- Product lines (an income has a single line: 1 × amount)
create table public.finance_lines (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.finance_operations(id) on delete cascade,
  product text not null check (length(btrim(product)) between 1 and 200),
  quantity numeric(12,3) not null check (quantity > 0 and quantity <= 1000000),
  unit_price numeric(14,2) not null check (unit_price >= 0 and unit_price <= 1000000000),
  total numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  position int not null default 0
);
create index finance_lines_operation on public.finance_lines (operation_id, position);

-- ───────── History of every change ─────────
create table public.finance_audit (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id uuid not null,
  operation_id uuid,                -- for lines: the operation they belong to
  action text not null check (action in ('insert', 'update', 'delete')),
  old_row jsonb,
  new_row jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index finance_audit_recent on public.finance_audit (changed_at desc);

-- ───────── Google Sheets: queue of files to refresh, and who each file is shared with ─────────
create table public.finance_sync (
  target text not null check (target in ('sheet', 'year')),
  target_id uuid not null,
  queued_at timestamptz not null default now(),
  primary key (target, target_id)
);
create table public.finance_gsheet_shares (
  gsheet_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  permission_id text not null,
  shared_at timestamptz not null default now(),
  primary key (gsheet_id, email)
);

-- ═════════════ Calculations (always in Postgres numeric) ═════════════

-- One row per operation: its amount, its signed effect, and the year balance right after it
-- (ordered by date, then creation time). Cancelled operations count for 0.
create view public.finance_ledger with (security_invoker = true) as
with amounts as (
  select o.*,
    case when o.kind = 'adjustment' then o.adjustment_amount
         else coalesce((select sum(l.total) from public.finance_lines l where l.operation_id = o.id), 0)
    end as amount
  from public.finance_operations o
), signed as (
  select a.*,
    case when a.cancelled_at is not null then 0::numeric
         when a.kind = 'expense' then -a.amount
         else a.amount end as signed_amount
  from amounts a
)
select s.*,
  y.opening_balance + sum(s.signed_amount) over (
    partition by s.year_id order by s.occurred_on, s.created_at, s.id
    rows between unbounded preceding and current row) as balance_after
from signed s
join public.finance_years y on y.id = s.year_id;

create view public.finance_sheet_totals with (security_invoker = true) as
select s.id as sheet_id,
  coalesce(sum(l.amount) filter (where l.kind = 'income' and l.cancelled_at is null), 0) as received,
  coalesce(sum(l.amount) filter (where l.kind = 'expense' and l.cancelled_at is null), 0) as spent,
  count(l.id) filter (where l.cancelled_at is null) as operations,
  max(l.updated_at) as last_change
from public.finance_sheets s
left join public.finance_ledger l on l.sheet_id = s.id
group by s.id;

create view public.finance_year_totals with (security_invoker = true) as
select y.id as year_id, y.opening_balance,
  coalesce(sum(l.amount) filter (where l.kind = 'income' and l.cancelled_at is null), 0) as received,
  coalesce(sum(l.amount) filter (where l.kind = 'expense' and l.cancelled_at is null), 0) as spent,
  coalesce(sum(l.amount) filter (where l.kind = 'adjustment' and l.cancelled_at is null), 0) as adjustments,
  y.opening_balance + coalesce(sum(l.signed_amount), 0) as balance
from public.finance_years y
left join public.finance_ledger l on l.year_id = y.id
group by y.id;

-- ═════════════ Permissions ═════════════

create or replace function public.finance_year_open(p_year uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.finance_years where id = p_year and status = 'open')
$$;

-- The signed-in user may still change this operation: admins always (open year);
-- members only their own, not cancelled, within 24 hours of creating it.
create or replace function public.finance_can_edit(
  p_created_by uuid, p_created_at timestamptz, p_year uuid, p_kind public.finance_kind, p_cancelled_at timestamptz
) returns boolean
language sql stable security definer set search_path = public as $$
  select public.finance_year_open(p_year)
     and public.can_access('finance')
     and (public.is_admin()
          or (p_kind <> 'adjustment'
              and p_cancelled_at is null
              and p_created_by = auth.uid()
              and p_created_at > now() - interval '24 hours'))
$$;

alter table public.finance_years enable row level security;
alter table public.finance_sheets enable row level security;
alter table public.finance_operations enable row level security;
alter table public.finance_lines enable row level security;
alter table public.finance_audit enable row level security;
alter table public.finance_sync enable row level security;          -- service role only
alter table public.finance_gsheet_shares enable row level security; -- service role only

create policy "finance reads years" on public.finance_years for select
  using ((select public.can_access('finance')));
create policy "admins open years" on public.finance_years for insert
  with check ((select public.is_admin()));
create policy "admins update years" on public.finance_years for update
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "finance reads sheets" on public.finance_sheets for select
  using ((select public.can_access('finance')));
create policy "finance creates sheets" on public.finance_sheets for insert
  with check ((select public.can_access('finance')) and public.finance_year_open(year_id));
create policy "authors and admins update sheets" on public.finance_sheets for update
  using ((select public.can_access('finance')) and public.finance_year_open(year_id)
         and ((select public.is_admin()) or created_by = auth.uid()))
  with check ((select public.can_access('finance')) and public.finance_year_open(year_id)
         and ((select public.is_admin()) or created_by = auth.uid()));

create policy "finance reads operations" on public.finance_operations for select
  using ((select public.can_access('finance')));
create policy "finance adds operations" on public.finance_operations for insert
  with check ((select public.can_access('finance')) and public.finance_year_open(year_id)
              and (kind <> 'adjustment' or (select public.is_admin())));
create policy "editable operations" on public.finance_operations for update
  using (public.finance_can_edit(created_by, created_at, year_id, kind, cancelled_at))
  with check (public.finance_year_open(year_id));

create policy "finance reads lines" on public.finance_lines for select
  using ((select public.can_access('finance')));
create policy "lines of editable operations" on public.finance_lines for all
  using (exists (select 1 from public.finance_operations o where o.id = operation_id
                 and public.finance_can_edit(o.created_by, o.created_at, o.year_id, o.kind, o.cancelled_at)))
  with check (exists (select 1 from public.finance_operations o where o.id = operation_id
                 and public.finance_can_edit(o.created_by, o.created_at, o.year_id, o.kind, o.cancelled_at)));

create policy "admins read finance history" on public.finance_audit for select
  using ((select public.is_admin()));

-- Members cannot read other profiles; the finance pages only need authors' display names.
create or replace function public.finance_people(p_ids uuid[])
returns table (id uuid, name text)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(nullif(btrim(p.full_name), ''), split_part(p.email, '@', 1))
  from public.profiles p
  where p.id = any(p_ids) and (select public.can_access('finance'))
$$;
revoke execute on function public.finance_people(uuid[]) from public, anon;
grant execute on function public.finance_people(uuid[]) to authenticated;

-- ═════════════ Triggers ═════════════

-- Author and creation time come from the session, never from the browser: nobody can
-- back-date or post-date an operation to dodge the 24-hour rule.
create or replace function public.finance_stamp() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    if auth.uid() is not null then new.created_by := auth.uid(); end if;
    if tg_table_name = 'finance_operations' then
      new.updated_at := now();
      new.updated_by := new.created_by;
      new.cancelled_at := null;
      new.cancelled_by := null;
    end if;
    return new;
  end if;
  -- UPDATE: identity of the row never changes.
  if new.created_at is distinct from old.created_at or new.created_by is distinct from old.created_by then
    raise exception 'immutable_field';
  end if;
  if tg_table_name = 'finance_sheets' then
    if new.year_id is distinct from old.year_id then raise exception 'immutable_field'; end if;
  end if;
  if tg_table_name = 'finance_operations' then
    if new.kind is distinct from old.kind or new.year_id is distinct from old.year_id then
      raise exception 'immutable_field';
    end if;
    new.updated_at := now();
    if auth.uid() is not null then new.updated_by := auth.uid(); end if;
    -- Only admins bring a cancelled operation back.
    if old.cancelled_at is not null and new.cancelled_at is null and not public.is_admin() then
      raise exception 'locked';
    end if;
  end if;
  return new;
end $$;

create trigger finance_operations_stamp before insert or update on public.finance_operations
  for each row execute function public.finance_stamp();
create trigger finance_sheets_stamp before insert or update on public.finance_sheets
  for each row execute function public.finance_stamp();
create trigger finance_years_stamp before insert or update on public.finance_years
  for each row execute function public.finance_stamp();

-- Operations must sit in an active sheet of their own year.
create or replace function public.finance_check_sheet() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.sheet_id is not null and not exists (
    select 1 from public.finance_sheets s
    where s.id = new.sheet_id and s.year_id = new.year_id and s.archived_at is null) then
    raise exception 'invalid_sheet';
  end if;
  return new;
end $$;
create trigger finance_operations_sheet before insert or update of sheet_id, year_id on public.finance_operations
  for each row execute function public.finance_check_sheet();

-- History: every insert / update / delete on finance tables.
create or replace function public.finance_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_bookkeeping text[] := array['gsheet_id', 'gsheet_account_id', 'gsheet_synced_at'];
begin
  -- Google file bookkeeping by the server is not a change people made.
  if tg_op = 'UPDATE' and tg_table_name in ('finance_sheets', 'finance_years')
     and (to_jsonb(new) - v_bookkeeping) = (to_jsonb(old) - v_bookkeeping) then
    return new;
  end if;
  insert into public.finance_audit (table_name, row_id, operation_id, action, old_row, new_row, changed_by)
  values (
    tg_table_name,
    (v_row->>'id')::uuid,
    case when tg_table_name = 'finance_lines' then (v_row->>'operation_id')::uuid
         when tg_table_name = 'finance_operations' then (v_row->>'id')::uuid end,
    lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end,
    auth.uid());
  return coalesce(new, old);
end $$;

create trigger finance_years_log after insert or update or delete on public.finance_years
  for each row execute function public.finance_log();
create trigger finance_sheets_log after insert or update or delete on public.finance_sheets
  for each row execute function public.finance_log();
create trigger finance_operations_log after insert or update or delete on public.finance_operations
  for each row execute function public.finance_log();
create trigger finance_lines_log after insert or update or delete on public.finance_lines
  for each row execute function public.finance_log();

-- Google files to refresh after any change (the sheet's file and the year file).
create or replace function public.finance_queue_sync() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sheet uuid;
  v_year uuid;
begin
  if tg_table_name = 'finance_lines' then
    select o.sheet_id, o.year_id into v_sheet, v_year
    from public.finance_operations o where o.id = coalesce(new.operation_id, old.operation_id);
  elsif tg_table_name = 'finance_operations' then
    v_sheet := coalesce(new.sheet_id, old.sheet_id);
    v_year := coalesce(new.year_id, old.year_id);
    if tg_op = 'UPDATE' and old.sheet_id is distinct from new.sheet_id and old.sheet_id is not null then
      insert into public.finance_sync (target, target_id) values ('sheet', old.sheet_id)
        on conflict (target, target_id) do update set queued_at = now();
    end if;
  elsif tg_table_name = 'finance_sheets' then
    v_sheet := coalesce(new.id, old.id);
    v_year := coalesce(new.year_id, old.year_id);
  else
    v_year := coalesce(new.id, old.id);
  end if;
  if v_sheet is not null then
    insert into public.finance_sync (target, target_id) values ('sheet', v_sheet)
      on conflict (target, target_id) do update set queued_at = now();
  end if;
  if v_year is not null then
    insert into public.finance_sync (target, target_id) values ('year', v_year)
      on conflict (target, target_id) do update set queued_at = now();
  end if;
  return coalesce(new, old);
end $$;

create trigger finance_operations_sync after insert or update or delete on public.finance_operations
  for each row execute function public.finance_queue_sync();
create trigger finance_lines_sync after insert or update or delete on public.finance_lines
  for each row execute function public.finance_queue_sync();
-- Sheets and years: only changes people see (not the Google bookkeeping columns).
create trigger finance_sheets_sync after insert or update of name, description, archived_at, event_id
  on public.finance_sheets for each row execute function public.finance_queue_sync();
create trigger finance_years_sync after insert or update of label, opening_balance, status
  on public.finance_years for each row execute function public.finance_queue_sync();

-- ═════════════ RPCs (run as the caller: RLS and triggers apply) ═════════════

-- Saves an operation and its lines in one transaction, so a purchase never half-saves.
-- p: {id?, sheet_id, kind, occurred_on, category, label, counterparty, payment_method, note,
--     receipt_path, expected_updated_at?, lines: [{product, quantity, unit_price}]}
create or replace function public.finance_save_operation(p jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_kind public.finance_kind := (p->>'kind')::public.finance_kind;
  v_sheet uuid := (p->>'sheet_id')::uuid;
  v_year uuid;
  v_lines jsonb := coalesce(p->'lines', '[]'::jsonb);
  v_count int := jsonb_array_length(coalesce(p->'lines', '[]'::jsonb));
  v_old public.finance_operations;
  v_line jsonb;
  v_pos int := 0;
begin
  if v_kind = 'adjustment' then raise exception 'invalid'; end if;
  if v_count < 1 or v_count > 50 or (v_kind = 'income' and v_count <> 1) then raise exception 'invalid_lines'; end if;

  select year_id into v_year from public.finance_sheets where id = v_sheet and archived_at is null;
  if v_year is null then raise exception 'invalid_sheet'; end if;

  if v_id is null then
    insert into public.finance_operations
      (year_id, sheet_id, kind, occurred_on, category, label, counterparty, payment_method, note, receipt_path)
    values (v_year, v_sheet, v_kind, (p->>'occurred_on')::date, p->>'category', btrim(p->>'label'),
            nullif(btrim(p->>'counterparty'), ''), nullif(p->>'payment_method', ''),
            nullif(btrim(p->>'note'), ''), nullif(p->>'receipt_path', ''))
    returning id into v_id;
  else
    select * into v_old from public.finance_operations where id = v_id;
    if not found then raise exception 'not_found'; end if;
    if v_old.kind <> v_kind then raise exception 'immutable_field'; end if;
    if not public.finance_can_edit(v_old.created_by, v_old.created_at, v_old.year_id, v_old.kind, v_old.cancelled_at) then
      raise exception 'locked';
    end if;
    if p ? 'expected_updated_at' and (p->>'expected_updated_at')::timestamptz <> v_old.updated_at then
      raise exception 'stale';
    end if;
    update public.finance_operations set
      sheet_id = v_sheet, occurred_on = (p->>'occurred_on')::date, category = p->>'category',
      label = btrim(p->>'label'), counterparty = nullif(btrim(p->>'counterparty'), ''),
      payment_method = nullif(p->>'payment_method', ''), note = nullif(btrim(p->>'note'), ''),
      receipt_path = nullif(p->>'receipt_path', '')
    where id = v_id;
    delete from public.finance_lines where operation_id = v_id;
  end if;

  for v_line in select * from jsonb_array_elements(v_lines) loop
    insert into public.finance_lines (operation_id, product, quantity, unit_price, position)
    values (v_id, btrim(v_line->>'product'), (v_line->>'quantity')::numeric, (v_line->>'unit_price')::numeric, v_pos);
    v_pos := v_pos + 1;
  end loop;
  return v_id;
end $$;

-- Cancels (never deletes) an operation, with a reason. Same 24-hour rule as editing.
create or replace function public.finance_cancel_operation(p_id uuid, p_reason text) returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_old public.finance_operations;
begin
  select * into v_old from public.finance_operations where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if v_old.cancelled_at is not null then return; end if;
  if not public.finance_can_edit(v_old.created_by, v_old.created_at, v_old.year_id, v_old.kind, null) then
    raise exception 'locked';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'reason_required'; end if;
  update public.finance_operations
  set cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = btrim(p_reason)
  where id = p_id;
end $$;

-- Admins: add or remove money outside sheets (correction, cash count…), with a reason.
create or replace function public.finance_adjust_balance(p_year uuid, p_amount numeric, p_reason text, p_on date)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_amount is null or p_amount = 0 then raise exception 'invalid'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'reason_required'; end if;
  insert into public.finance_operations (year_id, kind, occurred_on, category, label, adjustment_amount)
  values (p_year, 'adjustment', coalesce(p_on, current_date), 'adjustment', btrim(p_reason), round(p_amount, 2))
  returning id into v_id;
  return v_id;
end $$;

revoke execute on function public.finance_save_operation(jsonb) from public, anon;
revoke execute on function public.finance_cancel_operation(uuid, text) from public, anon;
revoke execute on function public.finance_adjust_balance(uuid, numeric, text, date) from public, anon;
grant execute on function public.finance_save_operation(jsonb) to authenticated;
grant execute on function public.finance_cancel_operation(uuid, text) to authenticated;
grant execute on function public.finance_adjust_balance(uuid, numeric, text, date) to authenticated;

-- ═════════════ Receipts (optional photo / PDF) ═════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('finance-receipts', 'finance-receipts', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "finance reads receipts" on storage.objects for select
  using (bucket_id = 'finance-receipts' and (select public.can_access('finance')));
create policy "finance uploads receipts" on storage.objects for insert
  with check (bucket_id = 'finance-receipts' and (select public.can_access('finance')));
