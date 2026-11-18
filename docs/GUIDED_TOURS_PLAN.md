# Guided tours for the admin area: implementation plan

> **Status (2026-11-18):** T0–T7 built (30 tours, every admin page, finance included). Migration `20261124000000_tours_seen.sql` still to apply to Supabase; until then tours work but come back on every visit. Changes from the plan below:
> - `driver.js` pinned to **1.4.0** (newer 1.10–1.14 releases all came out in the month before; not yet worth trusting).
> - The **Guide** button floats bottom-left on every page that has a tour (no edit to each page header).
> - Seen state uses `mark_tour_seen(p_tour, p_version)` (one-key jsonb merge) and `getSessionProfile()` falls back to the old select if the column is missing, so nobody gets signed out before the migration.
> - Decisions: every page auto-starts its guide on the first visit; admins cannot reset another member's tours.

Goal: every admin page explains itself. The first time someone opens a page, a short tour highlights the main controls one by one with a sentence each. It can be skipped, and replayed any time from a **Guide** button. Tours speak French or English like the rest of the admin, and only show what that person can actually use (admin vs member, sections).

## 1. Decisions

| Topic | Decision | Why |
|---|---|---|
| Library | [`driver.js`](https://driverjs.com) **1.3.x**, pinned exact version | MIT, ~5 kB gzipped, no dependencies, framework-agnostic. Handles the overlay, scrolling the target into view, popover placement and keyboard (←/→/Esc). Writing our own means re-solving positioning on phones. |
| Where tours are defined | One TypeScript file per area in `src/lib/tours/` (data only: route, version, steps) | Tours are reviewed like code and type-checked; no CMS needed. |
| How steps find elements | `data-tour="media.new-folder"` attributes on the real elements | Survives class and text changes. Never target CSS classes or translated text. |
| Text | `tours.<tourId>.<stepId>.title` / `.body` in `src/messages/en.json` and `fr.json` | Same system as the rest of the admin. |
| Who sees which step | Each step can set `only: "admin"` or `section: "media"`; steps whose element is missing on the page are skipped | One tour per page serves admins and members (e.g. "Deletion requests" step only for admins). Empty pages (no folder yet) don't break the tour. |
| When it starts | Automatically on the **first visit** to a page; replay with a **Guide** button | Help when it's needed, not a popup on every visit. |
| Remembering "seen" | New column `profiles.tours_seen jsonb` = `{ "media.library": 1, … }` (tour id → version) | Follows the person across phone and laptop. The existing "own update" RLS policy already allows it (it only protects role / status / sections / department). |
| Page changes later | Each tour has a `version`. Raising it shows the tour again once | When a page gets a new feature, people learn about it. |
| Tours never change data | Tours only point at controls; they never click "Create", open dialogs or fill forms | No risk of creating test folders, events or operations. |

## 2. How it works

```
src/lib/tours/
  types.ts        Tour, TourStep types
  registry.ts     every tour + matchTour(pathname) → tour for the current page
  dashboard.ts    events.ts  forms.ts  media.ts  finance.ts  team.ts  pages.ts  accounts.ts
  actions.ts      "use server": markTourSeen(id, version), resetTours()
  tours.test.ts   checks (see §6)
src/components/admin/tour/
  tour-provider.tsx   client; mounted once in admin/layout.tsx
  guide-button.tsx    "?" Guide button
  tour.css            driver.js theme with the site's colors
```

```ts
// src/lib/tours/types.ts
export type TourStep = {
  id: string;                    // text key: tours.<tourId>.<id>.title / .body
  target?: string;               // data-tour value; no target = centered popover (intro / outro)
  side?: "top" | "bottom" | "left" | "right";
  only?: "admin" | "member";     // who sees the step
  section?: Section;             // needs this section
};
export type Tour = {
  id: string;                    // "media.library"
  version: number;
  match: RegExp;                 // /^\/admin\/media$/ (pathname without locale)
  steps: TourStep[];
};
```

**Flow on each admin page:**
1. `admin/layout.tsx` passes `profile.role`, `profile.sections` and `profile.tours_seen` to `<TourProvider>`.
2. On navigation, the provider finds the tour for `usePathname()`. If its version is not in `tours_seen`, it waits for the page to render (first `requestAnimationFrame` after the target exists, max 2 s), then starts it.
3. Steps are filtered: wrong role / section → removed; `target` not in the DOM → removed. A tour left with 0–1 steps doesn't start.
4. On **Done** or **Skip** (close / Esc), `markTourSeen(id, version)` saves it and updates local state, so it doesn't restart on the next navigation.
5. The **Guide** button restarts the current page's tour, ignoring `tours_seen`. On the dashboard, a "Replay all guides" link calls `resetTours()`.

**Phones:** the admin sidebar becomes a horizontal bar at the top on phones, so the nav step targets that bar. Popovers use `side: "bottom"` and the theme makes them full-width (16 px margins) under 640 px. Steps never point at hover-only elements.

**Accessibility:** driver.js moves focus into the popover and supports the keyboard; buttons get translated labels (Next / Back / Done / Skip, "Step 2 of 6"). With `prefers-reduced-motion`, animation is turned off.

## 3. Database

`supabase/migrations/20261123000000_tours_seen.sql`

```sql
alter table public.profiles add column tours_seen jsonb not null default '{}'::jsonb;
```

`markTourSeen` does `update profiles set tours_seen = tours_seen || {id: version} where id = auth.uid()` through an RPC (`security invoker`), so two tabs finishing tours at the same moment don't overwrite each other. `getSessionProfile()` adds `tours_seen` to its select.

## 4. Tours, page by page

Step lists below are the content to write. The `data-tour` anchors are added to the existing elements while building each tour. **(A)** = admins only, **(M)** = members only.

### Dashboard & navigation: `dashboard` (`/admin`)
1. Welcome (centered): what the admin area is for.
2. Sidebar: the sections you have access to. Members: "Ask an admin if you need another section."
3. Each section card on the dashboard (one step per visible card).
4. Your account line (email · role · department).
5. Guide button: "Click **?** on any page to see its guide again."

### Events
- **`events.list`** (`/admin/events`): New event · search · Status / Period / Year filters · star to feature an event · **Featured** panel (drag to order, shown on the home page) · **Events page** settings button **(A)**.
- **`events.editor`** (`/admin/events/[id]`): tabs **Details / Photos & videos / Content / Design** · publish button and status · view on site.
- **`events.details`**, **`events.media`**, **`events.content`**, **`events.design`**: 2–4 steps each on the main fields (cover, key numbers, gallery upload, text editor toolbar, layout/colors).
- **`events.pageSettings`** (A): texts (FR/EN), layout, year dividers.

### Forms
- **`forms.list`** (`/admin/forms`): New form · a form card (status, open count) · edit / delete.
- **`forms.edit`**: add a question · question type · required toggle · reorder by dragging · preview · Publish.
- **`forms.design`**: colors / cover / theme.
- **`forms.share`**: link, QR code, embed.
- **`forms.results`**: summary vs individual responses · open a response · export.
- **`forms.integrations`**: Google Sheets connection.
- **`forms.settings`**: open/close dates, limits, notifications.

### Media library
- **`media.library`** (`/admin/media`): Google account and storage bar · **Change account (A)** · New folder · a folder card · the **⋮** menu (rename / delete) · **Deletion requests (A)**: approve or reject · **(M)**: "Deleting sends a request to an admin."
- **`media.folder`** (`/admin/media/[id]`): upload button / drag and drop · upload queue · filters (type, shape, video resolution) · select several files · move / delete selection · open a file (lightbox, download).

### Finance (after the finance work is finished)
- **`finance.home`** (`/admin/finance`): current year and balance · open / adjust the year **(A)** · balance chart · totals · **Sheets** list and New sheet · latest operations · history link.
- **`finance.sheet`** (`/admin/finance/sheets/[id]`): the ledger · quick-add row · filters · "edit your own rows for 24 h" **(M)** · Open in Google Sheets · download.
- **`finance.history`**: past years and archived sheets.

### Team (A)
- **`team.list`** (`/admin/team`): **Bureau** (president / vice president, show on site) · Departments list (drag to order, published / draft) · New department · view page.
- **`team.editor`** (`/admin/team/[id]`): tabs **Details / Content / Design / Photos** · autosave indicator ("saved automatically", no Save button) · publish.

### Site pages (A)
- **`pages.index`** (`/admin/pages`): the three pages you can edit.
- **`pages.general`**: logo and name · menu labels · contact details · social links · Save / undo / unsaved indicator.
- **`pages.home`**: banner · key figures · about / values · journey · testimonials · Save + view on site.
- **`pages.sponsors`**: sponsor list, logos and order.

### Accounts (A)
- **`accounts`** (`/admin/accounts`): Pending accounts to activate · role (admin / member) · department (pre-ticks sections) · sections checkboxes · disable / enable · "you can't remove the last admin".

That's **8 areas, about 30 tours, roughly 120–150 steps** (FR + EN text for each).

## 5. Milestones

| # | Work | Done when |
|---|---|---|
| T0 | Foundation: install `driver.js`, types, registry, `TourProvider`, Guide button, theme CSS, migration, `markTourSeen` / `resetTours`, test file | A one-step test tour starts on first visit, doesn't come back after Done, and comes back from the Guide button; works on phone width |
| T1 | Dashboard & navigation tour | Admin and member each see only their sections |
| T2 | Media library (2 tours) | Member and admin variants checked, empty library works |
| T3 | Events (list, editor, 4 tabs, page settings) | |
| T4 | Forms (list + 6 builder tabs) | Largest milestone |
| T5 | Team + Site pages | |
| T6 | Accounts | |
| T7 | Finance | Starts once the finance pages are stable, since their UI is still moving |
| T8 | Final pass: every tour in FR and EN, as admin and as a marketing member, at 375 px and desktop | Checklist in §6 all green |

T0 + T1 first, then one area at a time; each milestone can ship on its own.

## 6. Checks

**Automatic (`src/lib/tours/tours.test.ts`, vitest):**
- Every step has `title` and `body` in **both** `en.json` and `fr.json`.
- Every `target` appears as `data-tour="…"` somewhere under `src/` (catches anchors removed during a redesign).
- Tour ids are unique; every `match` regex matches at least one real admin route; no two tours match the same route.
- Step filtering: role / section rules, missing-target skipping (pure function, unit-tested).

**Manual, per milestone:**
- Admin and member (marketing) accounts, French and English.
- Phone (375 px) and desktop; the popover never covers the highlighted control.
- Empty states (no folder, no event, no form) still give a sensible tour.
- Skip in the middle → doesn't restart; Guide button → restarts from step 1.
- Raising a tour's `version` shows it once more.

## 7. Decisions taken (2026-11-18)

1. Every page starts its guide automatically on the first visit.
2. No "reset tours for a member" in Accounts.
3. Finance tours built now, on the committed finance pages.
