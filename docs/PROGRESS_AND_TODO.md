# Life Savers Club — Progress & To-Do

_Last updated: 2026-11-14. Read this first in a new session, then `docs/FORMS_PLAN.md` and `docs/FORM_BUILDER_UX_PLAN.md`._

## 1. What the project is
Rebuild of the Life Savers student club website.
- **Public site** (FR default, EN second): home, events, team, sponsors, join us. Visitors fill forms without accounts.
- **Leaders-only admin** with login: Tally-like form builder, results, Google Sheets sync (one Sheet per form), manual entry of old events.
- **Stack:** Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19, Tailwind 4, next-intl 4, Supabase (Auth, Postgres, RLS, Storage), Docker for local dev.
- **Supabase project:** `kvqcnvbdzqxmvffipkui` ("life saver"). Migrations in `supabase/migrations/` are applied.
- **Brand:** pink #ef4a6c, blue #2d74ba, grey #414042, black #231f20, green #6ebd45, font Nunito, logo in `public/brand/`.
- **Run locally:** `docker compose up` → http://localhost:3000. After editing, if hot reload misses it: `docker compose restart web`. After dependency changes, recreate the volumes.
- Accounts: the first signup becomes active admin; others are `pending` until an admin activates them in Admin → Accounts. No invite emails (by decision). No Articles feature (removed by decision).

## 2. Done
| Area | Status |
|---|---|
| Public site pages (home, events, team, sponsors, join us) | Built with sample/placeholder data (`src/lib/sample-data.ts`) |
| Auth: login/signup, Google button, pending/disabled notices, Accounts admin page | Done |
| Form builder M1 safe editing: autosave, undo/redo, conflict detection, local backup, confirm dialogs | Done |
| M2: canvas, `/` insert palette, drag & drop, publish/unpublish, share (link, QR, WhatsApp) | Done |
| M3: results (filters, search, pagination, drawer, status workflow, summary charts/NPS, CSV/XLSX export, accept → member) | Done |
| M4: multi-page forms, accessible public stepper, one-question-at-a-time layout, templates, duplicate, save as template | Done |
| M5a: per-form design (presets, colours, font, corners, cover, logo, contrast warning) | Done |
| M5b: Sheets sync queue (`src/lib/google/sync.ts`), health card, retry, full rebuild, cron route `/api/cron/sheets` | Code done, **never run against Google** |

**Verification so far:** `tsc`, `eslint`, `next build`, Node logic tests, unauthenticated HTTP smoke tests only. **No logged-in browser click-through has been done by Claude.** Everything authenticated needs a manual test pass.

## 3. Needs your input / setup
1. **Google OAuth** (Cloud project → enable Sheets API → OAuth client, redirect `http://localhost:3000/api/integrations/google/callback`): set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_ENCRYPTION_KEY` (32+ chars) in `.env.local`.
2. **`SUPABASE_SERVICE_ROLE_KEY`** in `.env.local` (server only, never public).
3. `CRON_SECRET` for the Sheets scheduler (needed at deploy).
4. Decide: should **Join Us** show one fixed chosen form (suggested), with other forms reachable by share link?
5. Old events data (in your Drive) to be entered through the future events manager.

## 4. Unfinished — by priority

### A. Test pass of what exists (do first)
- [ ] Log in and walk through: create from template → edit pages → preview → publish → fill from a private window/phone → results → export → accept as member.
- [ ] Design tab: upload cover/logo, save, check public page; check Night/Paper themes readability.
- [ ] Google Sheets end to end: connect, submit, health card, retry, rebuild after renaming a question.
- [ ] Supabase RLS tests as a non-superuser (anon insert only to open published forms; anon cannot read responses; pending users blocked).
- [ ] Confirm email/signup flow works for a second account (activation by admin).

### B. Missing admin features (needed for the club's goal)
- [ ] **Events manager** (CRUD, cover, gallery via `event_media`, past/upcoming, FR/EN fields) — for entering old events.
- [ ] **Team manager** and **Sponsors manager**.
- [ ] **Site settings** (contact info, social links, texts).
- [ ] Members list page (accepted applicants become members already; no management UI yet).
- [ ] Public pages read from the database instead of `sample-data.ts`.
- [ ] **Join Us** page renders the chosen membership form.

### C. Form builder gaps
- [ ] Conditional logic (show/hide, jump to page).
- [ ] Quiz scoring + result screen (deferred, "explain more" was given).
- [ ] Hidden URL fields, calculated fields, multi-language forms.
- [ ] Settings changes are not tracked in "unpublished changes"; conflict check covers questions only.
- [ ] Editor Preview drawer does not use the form's theme.
- [ ] Design is live-only (not versioned with publish).
- [ ] Search/summary in results cover only the newest 5000 responses.
- [ ] Title/slug editing UX in builder header.
- [ ] Response notifications / receipt email (no email sending decided yet).

### D. Sheets sync polish
- [ ] Per-response sync status icon in results (flag exists: `synced_to_sheet`; failed-state icon missing).
- [ ] Guard against rare duplicate rows between inline sync and cron (idempotency/claim).
- [ ] Scheduler config at deploy (Vercel cron or Supabase) calling `/api/cron/sheets` with `Authorization: Bearer $CRON_SECRET`.

### E. Optimisation and quality
- [ ] Mobile pass on every admin screen (builder, results table, design).
- [ ] Accessibility audit (keyboard in builder, focus order, contrast).
- [ ] Performance: image optimisation for uploaded covers, caching of public pages, bundle size (exceljs only on export).
- [ ] SEO/metadata, OG images for public pages and forms, sitemap.
- [ ] Error pages (404/500), loading states, empty states.
- [ ] Automated tests (logic tests currently live only in the scratchpad: theme, steps/validate/templates) — move into the repo (e.g. vitest).
- [ ] Rate limiting / spam protection on public submit (honeypot or captcha).
- [ ] File upload quotas and cleanup of orphaned uploads.

### E2. Performance (2026-11-14)
- [x] Proxy matcher bug fixed: `".*\..*"` compiled to `.*..*`, so `proxy.ts` only ran on `/` (no session refresh, no admin gate, no locale handling). Now `\\.`, and `auth/` is excluded.
- [x] Auth: `getClaims()` (local ES256 check) instead of `getUser()` in proxy, admin layout, accounts, public draft preview; `getSessionProfile()` in `src/lib/auth.ts` (React `cache`). Proxy skips Supabase for visitors without a session cookie.
- [x] One round trip for the builder layout (`getForm` embeds response count + published snapshot), forms list (aliased `fresh:responses(count)`), integrations (counts run with the form query). Bare `/admin/forms/[id]` redirects in the proxy.
- [x] `loading.tsx` skeletons (`admin/`, `admin/forms/[id]/`) and `LinkPending` hint on sidebar and tab links.
- Measured (prod build, link-click RSC): before 0.4–1.7 s, after 0.14–0.4 s (results/integrations up to 0.6–0.76 s).
- [ ] Next: RLS `(select is_leader())`, index `sheet_sync_jobs(form_id, status)`, results page parallel fetch, dev outside OneDrive/Docker polling, caching, bundle size.

### F. Deployment
- [ ] Choose host (Vercel suggested) and domain; set env vars (Supabase URL/key, service role, Google, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`).
- [ ] Add production redirect URIs in Google Cloud and Supabase Auth URL settings.
- [ ] Commit to git (nothing from this rebuild is committed yet; repo `ayoubi8/life-savers-club`, branch `master`, main is `main`).
- [ ] Backups / Supabase plan check; security review (`/security-review`).

## 5. Key code map
- `src/lib/forms/` — `schema.ts` (types, validation), `actions.ts` (server actions), `queries.ts`, `responses-query.ts`, `response-actions.ts`, `validate.ts`, `steps.ts`, `templates.ts`, `theme.ts`.
- `src/lib/google/` — `config.ts`, `crypto.ts`, `sheets.ts` (API calls), `sync.ts` (queue worker, retry, rebuild).
- `src/app/[locale]/admin/forms/[id]/` — tabs `edit | design | share | results | integrations | settings`, `builder-provider.tsx` (state, autosave, undo).
- `src/components/forms/` — `public-form.tsx`, `field-input.tsx`, `form-shell.tsx`.
- `src/app/[locale]/f/[slug]/page.tsx` — public form page. `src/app/api/` — export, Google OAuth, cron.
- `src/messages/{fr,en}.json` — all UI text (keep both in sync).

## 6. Working notes / gotchas
- This Next.js version has breaking changes: read `node_modules/next/dist/docs/` before using unfamiliar APIs (see `AGENTS.md`).
- Pass `locale` explicitly to `getTranslations({locale, namespace})` and call `setRequestLocale`.
- Anonymous visitors can insert responses but not read them: generate the response id client-side, no `.select()` after insert.
- Supabase CLI: `npx supabase`; push with `db push --remote --yes` only after the user agrees; read-only checks with `db query --remote --read-only "<sql>"`.
- Shell heredocs with quotes break on this machine: write scripts with the file tool, then run them.
