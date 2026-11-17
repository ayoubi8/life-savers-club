# Finance & logistics space: implementation plan

Goal: the Finance & Logistics department (FL) runs the club's money from the admin. The year starts with the money the club has now; from then on, every purchase, event cost and income changes it. The team works in **sheets** they create and name as they like ("Gala 2026", "Formation octobre", "Matériel secourisme"…). Each sheet lists operations with product, unit price × quantity, an automatic total, date, place and note. Every sheet can be opened in Google Sheets with the member's own Gmail, or downloaded.

> **Status (2026-11-17):** F1–F6 implemented. Migration `20261121000000_finance.sql` tested on a local Postgres (24-hour rule, roles, totals, history) and **applied to Supabase on 2026-11-17**. Not yet tried against real Google Sheets. Differences from the plan below:
> - In the sheet table, single-product rows are edited in place (double-click); multi-product purchases and incomes with all details are edited in a dialog. A quick-add row sits at the bottom.
> - A Google copy is created the first time someone clicks "Open in Google Sheets", then refreshed automatically after each change. The Google files are written in French.
> - Linking a sheet to an event (`event_id`) exists in the database but has no screen yet.

Decisions below come from the FL leader's answers.

## 1. Decisions

| Topic | Decision |
|---|---|
| Access | New admin section **`finance`**, pre-ticked for department **`fl`** (Finance and Logistics, already on the site). Admins always have it. No new role type. |
| Currency | **DZD only.** Amounts stored as `numeric(14,2)`, shown without decimals unless there are centimes (`12 500 DA`). |
| Budget | **One budget per year** (e.g. "2026-2027"). It opens with what the club has now; every operation moves it. The balance after each operation is the "progress at every stage". |
| Sheets | Any number per year, **created and named freely** by FL members and admins. A sheet groups operations (purchases, event costs, income). The data lives in **Supabase**; the site is the master copy. |
| Google Sheets | Each sheet can be **opened in Google Sheets with the member's Gmail** (a copy in the club Drive, shared with them as viewer and refreshed from the site) or **downloaded** (.xlsx / .csv). Edits made in Google Sheets do not come back to the site. |
| 24-hour lock | A member can edit or cancel **their own** operation for **24 hours after creating it**. After that it is locked: **only an admin** can change it. Enforced by the database, not just the screen. |
| Budget changes | Only **admins** (leaders) set the opening amount and make balance adjustments, always with a reason. |
| Receipts | **Optional** photo/PDF per operation, private bucket `finance-receipts`. |
| Nothing is deleted | Operations are **cancelled** (kept, struck through, excluded from totals) with a reason. Every create/edit/cancel goes to an **audit log** written by a database trigger. |

## 2. Who can do what

| Action | FL member | Admin |
|---|---|---|
| See the year, all sheets, totals, chart, history | ✅ | ✅ |
| Create a sheet, rename / archive **their own** sheet | ✅ | ✅ (any sheet) |
| Add a purchase or an income to a sheet | ✅ | ✅ |
| Edit or cancel **their own** operation | ✅ within 24 h | ✅ any time |
| Edit or cancel **someone else's** operation | ❌ | ✅ |
| Set the opening amount, adjust the balance (with reason) | ❌ | ✅ |
| Open a new year / close the year | ❌ | ✅ |
| Open in Google Sheets / download | ✅ | ✅ |

## 3. What the team sees

**`/admin/finance`: the year**
- Big numbers: **current balance**, received this year, spent this year, opening amount.
- **Chart**: balance after every operation across the year, plus totals by category.
- **Sheets** grid: name, number of operations, total received / spent in that sheet, last change, who created it. **New sheet** button.
- **Adjustments** (admins): "set opening amount" and "adjust balance" with a reason, listed with who and when.
- **Latest operations** across all sheets.

**`/admin/finance/sheets/[sheetId]`: one sheet (the "internal sheet")**
- A table edited in place, keyboard friendly (Tab / Enter / arrows), totals row at the bottom:

  | Date | Type | Product / label | Category | Qty | Unit price | Total | Place / source | Note | Receipt | Year balance after | By | 🔒 |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|
  | 12/11 | Income | Sponsor X | Sponsor | 1 | 50 000 | **50 000** | Sponsor X | Gala sponsoring | 📎 | 230 000 | Sara | 🔒 |
  | 14/11 | Expense | Bandages | Medical supplies | 20 | 150 | **3 000** | Pharmacie Y | For training | | 227 000 | Amine | 🔒 |
  | 17/11 | Expense | Water packs | Food | 10 | 250 | **2 500** | Supermarket Z | | | 224 500 | Amine | ✏️ 21 h left |

  - **Total** = quantity × unit price, calculated by the database when the row is saved.
  - **Year balance after** = where the club's money stood right after that operation.
  - The last column shows the time left to edit, or a lock with "Ask an admin to change it".
- **Add purchase**: date, place, note, optional receipt, and one or more product lines (product, quantity, unit price → total). One shop receipt with several products is one purchase.
- **Add income**: amount, date, **source** (Sponsor, Formation, Membership fees, Donation, Tickets, Other), payer name, note.
- Header: sheet totals (received, spent, net), optional link to an event, **Open in Google Sheets**, **Download (.xlsx / .csv)**.
- Filters: type, category, date, added by, search; cancelled rows hidden by default.

**`/admin/finance/history`**: audit log (what changed, old → new, who, when) and adjustment history. Admins only.

## 4. Google Sheets: open with your Gmail, or download

**Open in Google Sheets**
1. The member clicks **Open in Google Sheets** on a sheet.
2. The server creates (first time) or refreshes a Google spreadsheet with that sheet's data in the club Drive (`Life Savers – Finance / 2026-2027 /`), using the club account already connected for the media library (scope `drive.file`, no new consent).
3. It shares the file **as viewer** with the member's Gmail (their account email by default; they can enter another Gmail once, saved on their profile). No notification email is sent.
4. The browser opens the Google Sheet in a new tab. The member is signed in to Google with that Gmail and sees it, can view, filter, print, or **File → Make a copy** for their own work.

- The Google file is refreshed automatically a few seconds after any change on the site, so it stays current.
- Viewer access means nobody edits the copy by mistake; the site stays the only place where money is recorded.
- Tabs in each file: **Operations** (the table above), **Summary** (totals by category).
- A year file with **one tab per sheet** plus a summary tab is available from the year page.

**Download**
- **.xlsx**: same columns, money formatted, one tab per sheet for the year export (`exceljs`, already installed).
- **.csv**: one sheet, for any other tool.

## 5. Data model: `supabase/migrations/20261121000000_finance.sql`

```sql
-- Section
alter table public.profiles drop constraint profiles_sections_valid,
  add constraint profiles_sections_valid
  check (sections <@ array['events', 'forms', 'media', 'finance']::text[]);
update public.profiles set sections = array_append(sections, 'finance')
where role = 'member' and department = 'fl' and not ('finance' = any(sections));
alter table public.profiles add column google_share_email text;      -- Gmail used for "Open in Google Sheets"

-- The year: one open at a time
create table public.finance_years (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,                         -- "2026-2027"
  opening_balance numeric(14,2) not null default 0,   -- what the club has at the start
  status text not null default 'open' check (status in ('open', 'closed')),
  starts_on date not null, ends_on date,
  gsheet_id text,                                     -- year file (one tab per sheet)
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index finance_years_one_open on public.finance_years (status) where status = 'open';

-- Sheets the team creates and names
create table public.finance_sheets (
  id uuid primary key default gen_random_uuid(),
  year_id uuid not null references public.finance_years(id),
  name text not null check (length(btrim(name)) between 1 and 120),
  description text,
  event_id uuid references public.events(id) on delete set null,
  gsheet_id text, gsheet_synced_at timestamptz,
  sync_pending boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create unique index finance_sheets_name on public.finance_sheets (year_id, lower(btrim(name))) where archived_at is null;

-- Operations: purchases / event costs (expense), income, and admin adjustments
create type public.finance_kind as enum ('income', 'expense', 'adjustment');
create table public.finance_operations (
  id uuid primary key default gen_random_uuid(),
  year_id uuid not null references public.finance_years(id),
  sheet_id uuid references public.finance_sheets(id),   -- null only for adjustments
  kind public.finance_kind not null,
  occurred_on date not null,
  category text not null,
  label text not null check (length(btrim(label)) between 1 and 200),
  counterparty text,                 -- shop / supplier, or sponsor / payer
  payment_method text check (payment_method in ('cash', 'transfer', 'card', 'cheque', 'other')),
  note text check (length(note) <= 2000),
  adjustment_amount numeric(14,2),   -- signed, adjustments only (admins)
  receipt_path text,
  cancelled_at timestamptz, cancelled_by uuid references public.profiles(id), cancel_reason text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id), updated_at timestamptz not null default now(),
  check ((kind = 'adjustment') = (sheet_id is null)),
  check ((kind = 'adjustment') = (adjustment_amount is not null))
);

-- Product lines (an income has one line: 1 × amount)
create table public.finance_lines (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.finance_operations(id) on delete cascade,
  product text not null check (length(btrim(product)) between 1 and 200),
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  total numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  position int not null default 0
);

-- Amount per operation and year balance after each one, computed by Postgres
create view public.finance_ledger with (security_invoker = true) as ...;
  -- amount = sum(lines.total) (or adjustment_amount), signed by kind, 0 when cancelled
  -- balance_after = opening_balance + running sum over (occurred_on, created_at, id) within the year
create view public.finance_sheet_totals with (security_invoker = true) as ...;
create view public.finance_year_totals with (security_invoker = true) as ...;

-- Audit log, written by triggers on years, sheets, operations and lines
create table public.finance_audit (
  id bigint generated always as identity primary key,
  table_name text not null, row_id uuid not null, action text not null,
  old_row jsonb, new_row jsonb,
  changed_by uuid, changed_at timestamptz not null default now()
);

-- Who each Google file is shared with (to share once, and to remove access later)
create table public.finance_gsheet_shares (
  sheet_id uuid references public.finance_sheets(id),
  year_id uuid references public.finance_years(id),
  email text not null,
  permission_id text not null,
  shared_at timestamptz not null default now()
);
```

### The 24-hour lock, enforced in Postgres

```sql
-- true when the signed-in user may still change this operation
create function public.finance_can_edit(p_created_by uuid, p_created_at timestamptz, p_year uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.finance_years y where y.id = p_year and y.status = 'open')
     and (public.is_admin()
          or (p_created_by = auth.uid() and p_created_at > now() - interval '24 hours'))
$$;
```
- RLS `update` on `finance_operations` and on `finance_lines` (through their operation) uses `finance_can_edit(...)`.
- A trigger refuses any change to `created_by`, `created_at`, `year_id` and `kind`, so nobody can "refresh" the 24 hours or move an operation.
- Cancelling is an update (`cancelled_at`, reason), so the same 24-hour rule applies. Hard `delete` is refused for everyone.
- `adjustment` operations and `opening_balance` changes: admins only (RLS + RPC `adjust_balance(year_id, amount, reason)`).
- Closed year: read-only for everyone until an admin reopens it (logged).

### Read access
`can_access('finance')` on every finance table and view; receipts bucket private with the same rule; audit log readable by admins only.

## 6. Server code

| File | Role |
|---|---|
| `src/lib/finance/schema.ts` | zod schemas, categories, DZD parsing ("1 500", "1500,50"), DZD formatting, `editableUntil(createdAt)`. Pure, unit tested. |
| `src/lib/finance/queries.ts` | `getOpenYear`, `listSheets` (with totals), `getSheet`, `listOperations(sheetId, filters, cursor)` from `finance_ledger`, `balanceSeries(yearId)`, `listAdjustments`, `listAudit`. |
| `src/lib/finance/actions.ts` | `createSheet`, `renameSheet`, `archiveSheet`, `saveOperation` (operation + lines in one RPC so a purchase never half-saves), `cancelOperation`, admin: `openYear`, `closeYear`, `adjustBalance`, `setOpeningBalance`. Concurrency: updates send `updated_at` and fail cleanly if someone changed the row. Errors such as `locked` come straight from the database rule. |
| `src/lib/finance/gsheets.ts` | Create/refresh the Google spreadsheet of a sheet or of the year (Sheets API with the club `drive_accounts` token, `valueInputOption=RAW`), formatting, share as viewer (`permissions.create`, `sendNotificationEmail=false`). |
| `src/app/api/finance/sheets/[sheetId]/open/route.ts` | Refresh if needed, share with the member's Gmail, redirect to the Google Sheet. |
| `src/app/api/finance/sheets/[sheetId]/export/route.ts` and `.../years/[yearId]/export` | .xlsx / .csv downloads. |
| `src/app/api/cron/sheets/route.ts` | Extended to refresh sheets with `sync_pending`, so Google files catch up even if a refresh failed. |
| `src/app/api/finance/receipts/[operationId]/route.ts` | Short-lived signed link to a receipt. |

## 7. Admin UI: `src/app/[locale]/admin/finance/`

- `page.tsx`: year numbers, chart, sheets grid, adjustments, latest operations; "Open year" screen when none is open (admins).
- `sheets/[sheetId]/page.tsx` + `ledger-grid.tsx`: the editable table; autosave per row; time-left / lock badge per row; quantity × price recalculated while typing, replaced by the database total on save.
- `sheets/[sheetId]/purchase-dialog.tsx`, `income-dialog.tsx`, `cancel-dialog.tsx`.
- `adjust-dialog.tsx` (admins): amount (+/−) and reason.
- `history/page.tsx` (admins).
- `balance-chart.tsx`: inline SVG, no chart library.
- Nav "Finance" behind `can(profile, "finance")`, dashboard card, Accounts checkbox, `adminFinance.*` texts in FR and EN.

## 8. Phases

**F1. Foundation (1.5 days)**
Migration (tables, views, 24-hour rule, triggers, RPCs, RLS), `permissions.ts` (`finance`, `fl → ["finance"]`) + tests, Accounts label, nav. Tested on a local Postgres: member inside 24 h ✅, member after 24 h ❌, other member ❌, admin ✅, closed year ❌, other sections and visitors ❌, `created_at` cannot be changed.

**F2. Year and sheets (1 day)**
Open year with opening amount, adjustments with reason, create / rename / archive sheets, year page numbers.

**F3. Internal sheet (2.5 days)**
Editable table, purchase with several lines, income with source, year balance after each row, lock badges, cancel with reason, filters, concurrency.

**F4. Receipts, chart, downloads (1 day)**
Receipt upload/preview, balance chart and category totals, .xlsx / .csv for a sheet and for the year.

**F5. Open in Google Sheets (1.5 days)**
First confirm the Sheets API works with `drive.file` and the club account; then create/refresh, share as viewer with the member's Gmail, auto refresh after changes, year file with one tab per sheet.

**F6. Tests and polish (1 day)**
Unit: DZD parsing, totals, balance with cancelled rows and back-dated operations, 24-hour countdown. Manual: two people editing one row, phone layout, a sheet with 300 operations, opening the Google file with a second Gmail.

About **8.5 working days**.

## 9. Calculations

- Line total = `round(quantity × unit_price, 2)`.
- Purchase amount = sum of its lines. Income amount = its single line.
- Sheet: received, spent, net = received − spent (non-cancelled operations of that sheet).
- **Year balance** = opening amount + all income − all expenses ± adjustments (non-cancelled, all sheets).
- **Balance after** a row = year balance counting every operation up to that row, ordered by date, then creation time. A purchase entered later with an earlier date updates the rows after it.

## 10. Risks and how they are covered

| Risk | Cover |
|---|---|
| A member changes an old purchase | 24-hour rule in the database; `created_at` cannot be edited; admins' changes are logged. |
| A purchase disappears | No hard delete; cancel needs a reason; audit log by trigger. |
| Rounding differences | Totals only in Postgres `numeric`. |
| Two people edit the same row | `updated_at` check; second save refused with the fresh row shown. |
| Someone edits the Google copy | Shared as viewer; the copy is rewritten from the site anyway. |
| Formula injection in Google Sheets | Values written as `RAW`, never as formulas. |
| Wrong Gmail gets the file | Shared only with the signed-in member's own email (or the Gmail they saved on their profile); shares recorded and removed if the member loses the finance section. |
| Google disconnected | The site keeps working; Google files catch up after an admin reconnects. |

## 11. Later

- Approval step for big purchases.
- Logistics inventory (what was bought, where it is stored, used per event).
- Monthly PDF report for the bureau.
- Budget targets per category.
