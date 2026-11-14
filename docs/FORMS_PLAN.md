# Forms system: implementation plan

Goal: leaders build any form (Tally-style), members fill it from a link with no account, and answers land in the admin and in a Google Sheet. The old site's **Join Us** form becomes an ordinary form made with the builder. The Articles feature is dropped.

## 1. Where we are

| Area | State |
|---|---|
| SQL | `20261112000000_init.sql` and `20261114000000_forms_system.sql`. Both apply cleanly and are tested (account activation, publish snapshot, response limit, sync queue). **Not pushed** to Supabase yet. |
| Builder UI | Exists (`admin/forms/[id]/builder.tsx`): 13 question types, one visible page, live preview, share tab, submissions tab, settings tab. |
| Public form | `/f/[slug]` exists with validation and file field. |
| Google Sheets | Inline sync code exists (`lib/google/*`), appends rows on submit. Needs the outbox + header sync. |
| Missing | themes, conditional logic, multi-page UI, scoring, templates, review workflow, article/member promotion, drag and drop, more question types. |

## 2. Data model (new in `20261114000000`)

- `forms`: + `kind`, `description`, `cover_url`, `logo_url`, `is_template`, `published_version_id`, `sheet_url`, `sheet_tab`, `sheet_last_synced_at`. `schema`, `theme`, `settings` stay JSON.
- `form_versions`: a snapshot per publish, so editing a live form never corrupts old answers. `publish_form(form_id)` does it atomically. The public page renders the snapshot.
- `responses`: + `form_version_id`, `status` (new / reviewed / accepted / rejected / spam), `reviewed_by/at`, `review_note`, `score`, `max_score`. Visitors can only insert fresh rows.
- `response_files`: one row per uploaded file (path, name, type, size).
- `before_response_insert` trigger: enforces `settings.maxResponses` and `settings.onePerEmail`, stamps the version.
- `sheet_sync_jobs`: outbox filled by a trigger. A worker appends rows to the Sheet and retries on failure.
- `members`, `event_attendees`: accepted applications become members; old events can list attendees or just an `attendee_count`.
- `events`: + `tags`, `registration_form_id`, `attendee_count`.
- `site_settings`: contact info, socials and hero text editable from admin.
- Storage: size and type limits on both buckets.
- `duplicate_form(id, title, slug)`: duplicates a form or instantiates a template.

### JSON shapes

`forms.schema` (already used by the code, `version: 1`):
`{ pages: [{ id, title, description, fields: [{ id, type, label, description, placeholder, required, options, min, max, maxLength }] }] }`

Extended in `version: 2` (additive, old forms keep working):
- field: `logic` (`[{ if: { field, op, value }, then: "show" | "hide" | "jump", target }]`), `score` and `correct` for quiz, `default`, `hiddenFromUrl`
- page: `logic` for jumps and `showIf`

`forms.theme`: `{ primary, background, text, button, font, radius, spacing, layout: "single" | "one-per-screen", cover, logo, mode }`

`forms.settings`: `{ submitLabel, successTitle, successMessage, redirectUrl, maxResponses, onePerEmail, notifyEmails[], requireName, requireEmail, honeypot }`

## 3. Question types

| Group | Types |
|---|---|
| Have | short text, long text, email, phone, number, URL, date, multiple choice, checkboxes, dropdown, rating, text block, file upload |
| Add | time, yes/no, linear scale, NPS, ranking, matrix/grid, signature, image choice, heading, image, video embed, divider, hidden field, calculated field |

## 4. Phases

**F0. Foundation (0.5 day)**
Push both migrations to the new Supabase project, set keys, sign up as the first (root admin) account, regenerate TypeScript DB types. Add the "Accounts" admin screen: list pending sign-ups, activate / disable, set role leader or admin. Show a "waiting for activation" page to pending users.

**F1. Builder core (3 to 4 days)**
- Drag and drop (dnd-kit) for questions and pages; add/remove/duplicate pages.
- Autosave with undo/redo; keyboard shortcuts; slash menu to insert a question.
- Publish button calls `publish_form`; "unpublished changes" badge.
- Public page renders the published snapshot.

**F2. More question types and validation (2 days)**
- Add the types above; per-type settings (min/max, regex, allowed file types, shuffle options, "Other" choice).
- Shared Zod validator used by both builder preview and the server action, so rules never drift.

**F3. Design (2 days)**
- Theme panel: colors, font, radius, cover/logo, one-question-per-screen layout, thank-you screen.
- Brand presets (Life Savers default, dark, minimal). Preview on phone and desktop.

**F4. Logic and scoring (2 to 3 days)**
- Show/hide and jump rules; calculated and hidden fields (prefill from URL).
- Quiz mode: correct answers, points, result screen, `score` saved on the response.

**F5. Responses and review (2 days)**
- Table with search, filters by status/date, row detail drawer, status changes with a note, bulk actions.
- CSV/XLSX export; per-question charts; file previews via signed URLs.

**F6. Google Sheets (2 to 3 days)**
- Create one Sheet per form; columns follow the question order (+ timestamp, status).
- Worker (route + Vercel cron or Supabase Edge Function) drains `sheet_sync_jobs` with retry and error display.
- Header rename/add when questions change; "Re-sync all" button to backfill.
- Google Cloud setup: OAuth client, Sheets scope, tokens encrypted in `google_connections`.

**F7. Club flows (2 to 3 days)**
- Templates: Membership application, Event registration, Feedback, Quiz (+ "Save as template").
- Join Us page renders the form marked `kind = membership`.
- Accept an application → create `members` row.
- Event page shows its `registration_form_id`; past events list attendees or a count.

**F8. Hardening (1 to 2 days)**
- Honeypot and rate limiting (Turnstile optional), file scanning limits, RLS tests, error pages for closed/full forms, accessibility pass, Playwright smoke tests.

## 5. Order of work

F0 → F1 → F2 → F5 (so you see real answers early) → F6 (Sheets) → F3 → F4 → F7 → F8.
F7 can move earlier if you want the Join Us form live first.

## 6. Decisions made

- Accounts: anyone can sign up but stays `pending`; the root admin activates them and picks leader or admin. The first account is the root admin automatically. No invite emails.
- No email notifications; leaders check responses in the admin or the Sheet.
- No Articles feature.
- Still open: quiz scoring now or later; whether the Join Us page shows one fixed form.
