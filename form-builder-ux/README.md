# Form Builder — UX Handoff

This folder describes the **current user experience** of the Life Savers form builder so a designer or Claude Design can redesign it without reverse-engineering the code.

## What is in here

| File | Use it for |
| --- | --- |
| `UX_WALKTHROUGH.md` | End-to-end journeys: create a form, edit it, publish, share, read results, connect Google Sheets, and fill the public form. |
| `UI_INVENTORY.md` | Exhaustive screen-by-screen inventory: every button, field, state, empty state and error, with exact EN/FR copy. |
| `REDESIGN_BRIEF.md` | Paste-ready prompt for Claude Design. It contains the context, goals, constraints and expected deliverables. |
| `screenshots/` | Drop current screenshots here (see `screenshots/README.md`). The app was not screenshotted here because admin screens require a signed-in Supabase session. |

## How to hand this to Claude

1. Attach or paste `REDESIGN_BRIEF.md` first.
2. Attach `UX_WALKTHROUGH.md` and `UI_INVENTORY.md` as the source of truth.
3. Add screenshots to `screenshots/` if you have them.
4. Ask for a redesign that keeps the existing data model, routes and security behavior.

Suggested opener:

> Read the attached UX handoff for the Life Savers form builder. Redesign the admin form-building experience and the public form page. Keep every flow and data capability described in the handoff; improve clarity, speed, mobile use and accessibility. Follow the deliverable format in REDESIGN_BRIEF.md.

## Current state at a glance

- Product: a Tally-like form builder inside an existing bilingual (FR/EN) Next.js 16 admin app.
- Roles: `admin` and `leader` (any profile can manage forms).
- Admin routes: `/{locale}/admin/forms`, `/{locale}/admin/forms/{id}`.
- Public route: `/{locale}/f/{slug}`.
- Question types: short text, long text, email, phone, number, URL, date, multiple choice, checkboxes, dropdown, rating, text block, file upload.
- Capabilities: drafts, publish/archive, open/close dates, submissions table, CSV export, file uploads (10 MB), optional Google Sheets one-way sync, custom success message, post-submit redirect.
- Not supported yet: multi-page forms, conditional logic, autosave, form duplication, response search/filter/pagination, charts, response detail view, quiz scoring, payments, Tally imports.

## Source map

| Area | File |
| --- | --- |
| Form schema, validation helpers, option/answer formatting | `src/lib/forms/schema.ts` |
| Server actions (create, save, publish settings, submit, delete, disconnect) | `src/lib/forms/actions.ts` |
| Admin forms list | `src/app/[locale]/admin/forms/page.tsx` |
| Create-form control | `src/app/[locale]/admin/forms/new-form.tsx` |
| Builder shell and tabs | `src/app/[locale]/admin/forms/[id]/builder.tsx` |
| Builder page data loading | `src/app/[locale]/admin/forms/[id]/page.tsx` |
| Shared question renderer | `src/components/forms/field-input.tsx` |
| Public form interaction | `src/components/forms/public-form.tsx` |
| Public form page | `src/app/[locale]/f/[slug]/page.tsx` |
| CSV export | `src/app/api/forms/[id]/export/route.ts` |
| Google Sheets OAuth and sync | `src/app/api/integrations/google/*`, `src/lib/google/*` |
| Translations | `src/messages/en.json`, `src/messages/fr.json` |
| Brand tokens | `src/app/globals.css` |
| Database schema and RLS | `supabase/migrations/20261112000000_init.sql` |

## Ground rules for any redesign

- Do not copy Tally's code, assets or visual identity. The inspiration is the workflow, not the brand.
- Keep the database schema and Supabase row-level security unchanged unless explicitly asked.
- Keep FR and EN in sync: every new string must be added to both message files.
- Brand palette is fixed unless the brief says otherwise: pink `#ef4a6c`, blue `#2d74ba`, grey `#414042`, green `#6ebd45`, card radius `1.25rem`, font Nunito.
- Public forms are used on phones by students; mobile is a first-class case, not an afterthought.
- Admin forms are used by a small team; speed of editing and reading responses matters more than dense enterprise tooling.
