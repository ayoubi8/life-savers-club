# Claude Design Brief — Life Savers Form Builder

Copy this file into Claude Design (or attach it) together with `UX_WALKTHROUGH.md` and `UI_INVENTORY.md`. Add screenshots if available.

---

## Role

You are a senior product designer specializing in form builders and small-team admin tools. Redesign the Life Savers form builder experience: the admin flow for creating and editing forms, and the public form respondents fill out.

You are not writing production code unless asked. Your job is to produce a clear, buildable UX/UI specification that a Next.js + Tailwind engineer can implement without guessing.

## Product context

Life Savers is a student scientific club. A small team of leaders (`admin` / `leader` roles) creates forms for membership, event registration, feedback, sponsors and internal sign-ups. Respondents are students, often on phones, usually without an account.

The form builder is a Tally-like tool embedded in an existing bilingual (French default, English) Next.js 16 admin app using Supabase. The current build already works end-to-end; this is a redesign, not a greenfield invention.

### Existing capabilities that must survive the redesign

- Create a form with a title; slug generated automatically.
- Draft / Published / Archived states.
- Optional open and close dates.
- Five admin tabs: Editor, Share, Submissions, Integrations, Settings.
- 13 question types: short text, long text, email, phone, number, URL, date, multiple choice, checkboxes, dropdown, rating, text block, file upload.
- Per-question settings: label, help text, placeholder, required, options, number min/max, rating max, text max length.
- Reorder, duplicate and delete questions.
- Live preview.
- Public form at `/{locale}/f/{slug}` with validation, file uploads (10 MB max), success message, optional post-submit redirect, and a closed state.
- Share link + iframe embed code.
- Submissions table, dynamic answer columns, signed file links, delete response, CSV export.
- Optional Google Sheets one-way sync with connect / reconnect / disconnect.
- Settings: title, slug, status, open/close dates, submit label, confirmation title/message, redirect URL, delete form.
- Full EN/FR localization.

### Non-goals unless you explicitly propose them as future work

- Payments, quizzes/scoring, conditional logic, multi-page forms, email marketing, CRM.
- Replacing Supabase, changing the database schema, or changing row-level security.
- Copying Tally's code, assets or visual identity. Workflow inspiration is fine; branding must stay Life Savers.

## Users and jobs

1. **First-time leader** — “I need a membership form by tomorrow.” Wants speed, confidence that it works, and a link they can paste in WhatsApp.
2. **Frequent leader** — builds several forms a month, clones patterns, checks responses weekly, exports to Excel.
3. **Admin/owner** — publishes, closes, connects Google Sheets, deletes test responses, cares about correctness and privacy.
4. **Respondent** — on a mid-range Android phone, one hand, possibly slow connection. Wants a short, trustworthy, obvious form with clear errors.

## Design goals

- Make the first form publishable in under two minutes without reading instructions.
- Make question editing feel direct and reversible.
- Make it obvious what is saved, what is unsaved, and what is public.
- Make results easy to scan and act on, not just a raw database table.
- Keep destructive actions safe without ugly browser dialogs.
- Make the public form feel like the Life Savers brand: warm, clear, credible.
- Mobile-first for respondents; mobile-usable for admins.
- Full FR/EN parity and strong accessibility.

## Current information architecture

```text
/{locale}/admin/forms                         Forms list + create
/{locale}/admin/forms/{id}                    Builder
  Editor tab                                  Description, questions, inspector, preview
  Share tab                                   Public URL, copy, embed
  Submissions tab                             Response table, CSV
  Integrations tab                            Google Sheets
  Settings tab                                Metadata, publishing, copy, delete
/{locale}/f/{slug}                            Public form
```

Current tab state is client-side; the URL only carries `?tab=` on first load. Google OAuth returns to `?tab=integrations&connected=1`.

## Known UX problems to solve

Use the walkthrough and inventory as evidence. The highest-impact issues are:

### P0 — must address

1. **Saving is ambiguous.** Edits are local until “Save changes”; switching tabs keeps them, leaving the page loses them. There is no autosave, draft recovery or leave warning.
2. **Tabs are not shareable or reload-safe.** A leader cannot send a colleague a link to the Settings tab, and refresh jumps back to Editor.
3. **No draft preview.** “View form” opens a 404 for drafts, so leaders publish to see the result.
4. **Admin mobile navigation is broken.** The sidebar disappears under 768 px with no replacement.
5. **Errors are easy to miss.** Public errors are not announced, focus does not move to the invalid question, and required fields are only marked with `*`.
6. **Destructive actions use native `window.confirm`.** Deletion of questions is instant with no undo.

### P1 — strongly recommended

7. Reordering only via up/down buttons; no drag and drop, no collapse for long forms.
8. Submissions have no search, filter, pagination, detail view, charts or “new since last visit”.
9. Respondent name/email columns are guessed from labels; no mapping control.
10. Google Sheets has no sync status, retry or backfill.
11. No form duplication or templates.
12. File links expire after one hour with no explanation.
13. Embed code is fixed-size with no preview.
14. The builder does not support multiple pages despite the data model allowing it.

### P2 — future ideas

15. Conditional logic, multi-page logic, quiz scoring, response notifications, additional integrations.

## Brand and visual constraints

| Token | Value |
| --- | --- |
| Pink | `#ef4a6c` |
| Blue | `#2d74ba` |
| Grey | `#414042` |
| Ink | `#231f20` |
| Green | `#6ebd45` |
| Muted surface | `#f4f6f9` |
| Border | `#e6e8ee` |
| Card radius | `1.25rem` |
| Font | Nunito |
| Gradient | blue → pink |

You may refine spacing, hierarchy, iconography and component styling, but keep the brand recognizable. Do not introduce a dark theme unless you present it as an optional extra.

## What to produce

Return a single, well-structured design specification with these sections:

### 1. UX audit

- Top 5 problems you would fix and why, ranked by user impact.
- Anything in the current flows you would keep because it already works.

### 2. Revised information architecture

- Final structure for the Forms list and builder.
- How tabs, sub-views or panels should map to URLs.
- Where autosave/save status lives.
- How create, duplicate and template entry points work.
- How the admin frame works on mobile.

### 3. Screen-by-screen design

For each screen, describe layout, hierarchy, primary/secondary actions, states and responsive behavior:

1. Forms list (empty, populated, filtered, loading, error).
2. Create-form interaction (inline, modal, or dedicated page — recommend one).
3. Builder shell: header, save state, publish state, public-link access, tab navigation.
4. Editor: question list, selected question inspector, add-question, drag/reorder, duplicate, delete/undo.
5. Live preview, including a draft-public preview path.
6. Share: link, QR if you recommend it, embed with size options and preview.
7. Submissions: table + detail, filters, search, pagination or virtualization, export, delete/undo, sync status.
8. Integrations: Google Sheets state machine (unavailable, disconnected, connecting, connected, error), sync health.
9. Settings: metadata, scheduling, confirmation screen, redirect, danger zone.
10. Public form: default, focused question, submitting, per-field error, success, closed, file upload, long form, mobile keyboard behavior.
11. Public 404 / unavailable state.

Use annotated wireframes or high-fidelity mockups if your output supports them. Otherwise use precise layout descriptions with component names, hierarchy and spacing intent.

### 4. Component and interaction system

Specify the reusable pieces a developer needs:

- Buttons and their variants/sizes/states.
- Inputs, textareas, selects, radio/checkbox rows, rating, file upload.
- Question list row and inspector.
- Save-state indicator, publish control, status badges.
- Tabs, empty states, banners, toasts, inline validation, confirmation dialogs.
- Response table cells and detail drawer.
- Mobile admin navigation.
- Focus, hover, disabled, loading and error states for each.

Include interaction rules: autosave timing, optimistic UI, undo windows, keyboard shortcuts, drag behavior, validation timing, and what happens on navigation with unsaved changes.

### 5. Microcopy

Provide final English and French copy for every new or changed label, button, empty state, error and confirmation. Keep the tone concise and human. French is the default locale.

### 6. Accessibility specification

- Keyboard model for the builder and tabs.
- ARIA roles and live regions.
- Focus management after save, submit and validation errors.
- Touch target sizes.
- Required-field and error announcement.
- Color contrast expectations.
- Reduced-motion behavior.

### 7. Implementation notes

Map the design to the existing code areas:

- `src/app/[locale]/admin/forms/page.tsx`
- `src/app/[locale]/admin/forms/[id]/builder.tsx`
- `src/app/[locale]/admin/forms/[id]/page.tsx`
- `src/components/forms/field-input.tsx`
- `src/components/forms/public-form.tsx`
- `src/app/[locale]/f/[slug]/page.tsx`
- `src/lib/forms/schema.ts`
- `src/lib/forms/actions.ts`
- `src/messages/en.json`, `src/messages/fr.json`

Flag anything that would require new client state, new routes, new server actions or a schema change. Do not silently assume backend changes.

### 8. Prioritized rollout

Split the redesign into:

- **Now:** must ship together.
- **Next:** high-value, can follow.
- **Later:** future bets.

For each item, state the user problem, the change, and how success would be measured (e.g. time to publish, drop-off on public forms, support messages).

## Acceptance criteria

Your specification is acceptable when:

- Every capability in “Existing capabilities” still has a place.
- Every screen has empty, loading, error and success states.
- Mobile admin navigation is solved.
- Save/unsaved behavior is unambiguous.
- Public validation is accessible and focus-managed.
- Every destructive action has a safe pattern.
- All new copy exists in EN and FR.
- A developer can build from it without asking where a control lives.
- It explicitly separates “now” from “future”.

## Questions to resolve in your response

State your recommendation and one-sentence rationale for each:

1. Inline create card, modal, or dedicated creation page?
2. Autosave, explicit save, or hybrid? What is the save-status model?
3. Tabs as routes, panels, or a hybrid? How are deep links handled?
4. Drag-and-drop only, buttons only, or both?
5. Publish as a toggle in the header or only in Settings?
6. How should draft preview work without exposing drafts publicly?
7. How should submissions scale past 500 responses?
8. Should respondent name/email be explicit field mappings?
9. Should Google Sheets sync failures be visible per response?
10. What is the minimum viable mobile admin experience?

## Do not

- Do not invent backend features and present them as already available.
- Do not remove question types or admin capabilities.
- Do not change the database schema or security model without calling it out as a dependency.
- Do not use Tally assets, screenshots or branding.
- Do not design a generic SaaS dashboard that loses the Life Savers personality.
- Do not produce only mood boards; produce buildable UX decisions.

## Reference files

Attach or paste alongside this brief:

- `UX_WALKTHROUGH.md` — journeys, persistence rules, current friction.
- `UI_INVENTORY.md` — exact controls, states and EN/FR copy.
- `screenshots/` — current screenshots, if available.
