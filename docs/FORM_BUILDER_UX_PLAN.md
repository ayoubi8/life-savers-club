# Form builder UX: implementation plan (Tally-style)

Source: `form-builder-ux/` (walkthrough, UI inventory, redesign brief) plus the current code.
Goal: a leader goes from "I need a form" to a link on WhatsApp in under 2 minutes, edits without fear of losing work, and reads answers without exporting to Excel.

---

## 0. Where we start

### Already fixed since the handoff was written

| Handoff problem | Status |
|---|---|
| P0-3 No draft preview | **Done.** Active leaders see drafts at `/f/{slug}` with a "draft preview" banner; visitors get 404. |
| P0-4 No mobile admin nav | **Done.** Sidebar becomes a top bar under 768 px. |
| Inspector far from the question | **Done.** Editor opens inline under the selected question. |
| Required only in inspector | **Done.** Required / Optional pill on every row. |
| 13 question types | **19 types** now (time, yes/no, NPS, consent, heading, divider added). |
| Accounts | Pending → active by admin; builder checks `status = 'active'`. |

### Database pieces already live (no new migration needed for most of this plan)

`form_versions` + `publish_form()`, `duplicate_form()`, `forms.is_template`, `forms.theme`, `responses.status / review_note / score`, `response_files`, `sheet_sync_jobs` outbox, `settings.maxResponses / onePerEmail` enforced by trigger.

### Still open from the handoff

Autosave, URL-based tabs, undo, drag and drop, multi-page, confirm dialogs, results view (search, filter, detail, charts), field mapping, Sheets health/backfill, templates/duplicate, embed options, accessibility of errors.

---

## 1. Design decisions (answers to the brief's 10 questions)

| # | Question | Decision | Why |
|---|---|---|---|
| 1 | Create: inline, modal or page? | **Modal "New form"**: pick *Blank* or a *template*, type a title, Enter. | One step, and templates have a natural home. |
| 2 | Save model | **Autosave** (debounced 800 ms + on blur), status pill: *Saving… / Saved · 12:04 / Offline, retrying*. Local backup in `localStorage` for recovery. **Publishing is explicit.** | Tally users never press Save; publishing is the only moment that changes what the public sees. |
| 3 | Tabs | **Routes**: `/admin/forms/{id}/edit`, `/share`, `/results`, `/settings` (Integrations folded into Settings → "Integrations"). | Reload-safe, shareable, browser back works. |
| 4 | Reorder | **Both**: drag handle (dnd-kit) + keyboard (Alt+↑/↓) + "Move" in the ⋯ menu. | Drag is fast, keys/menu keep it accessible. |
| 5 | Publish control | **Header button**: *Publish* → *Publish changes* (when the draft differs from the live version) → menu: *Unpublish, Close responses*. Settings keeps scheduling. | Publishing is the main action; it shouldn't hide in Settings. |
| 6 | Draft preview | **Preview button** opens `/f/{slug}?preview=1` (already works for leaders) and an in-builder **Desktop / Mobile** preview drawer. | No public exposure, true rendering. |
| 7 | Many responses | **Server pagination (50/page) + search + filters** via URL params; counts from SQL; CSV streams all. | Scales past 500 without loading everything. |
| 8 | Name/email mapping | **Explicit**: in Settings → "Respondent", pick which question is *Name* and *Email* (auto-suggested). Stored in `settings.respondentNameField / respondentEmailField`. | No more label guessing; needed for one-per-email. |
| 9 | Sheets failures | **Yes, per response** (small icon + tooltip) **and** a health card with *Retry failed* and *Sync all*. | Uses the existing `sheet_sync_jobs` table. |
| 10 | Minimum mobile admin | Top bar + bottom tab bar in the builder (Edit / Share / Results / Settings); editing via full-screen question sheet; results as cards. | Leaders check responses on phones most of the time. |

---

## 2. Target experience

### 2.1 Forms list `/admin/forms`

```text
Formulaires                                   [ + Nouveau formulaire ]
[ Rechercher… ]  [Tous ▾ Brouillon · Publié · Archivé]  [Trier: Récent ▾]

┌───────────────────────────┐ ┌───────────────────────────┐
│ Adhésion 2026   ● PUBLIÉ  │ │ Atelier BLS     ○ BROUILLON│
│ 42 réponses · 3 nouvelles │ │ 0 réponse                  │
│ Modifié il y a 2 h        │ │ Modifié hier               │
│ [Ouvrir] [Copier lien] ⋯  │ │ [Ouvrir] ⋯                 │
└───────────────────────────┘ └───────────────────────────┘
⋯ = Dupliquer · Enregistrer comme modèle · Archiver · Supprimer
```

- "New responses since last visit" badge (store `last_seen_at` per leader/form in `localStorage` first; DB later if needed).
- Empty state shows 4 template cards (Adhésion, Inscription événement, Avis, Quiz) + *Blank*.

### 2.2 Builder shell

```text
← Formulaires   Adhésion 2026 ✎        ✓ Enregistré 12:04   [Aperçu] [Publier ▾]
                ● Publié · modifications non publiées
   Éditer   Partager   Réponses (42)   Paramètres
```

- Title editable inline in the header.
- Status line tells the truth: *Brouillon* / *Publié* / *Publié · modifications non publiées* / *Fermé*.
- Mobile: header collapses to title + save dot + Publish; tabs move to a bottom bar.

### 2.3 Editor: document-style canvas (the core Tally feel)

```text
┌──────────────────────────── canvas (max 720 px) ────────────────────────────┐
│  [cover image]                                                              │
│  Adhésion 2026                       ← click to edit title                  │
│  Rejoignez Life Savers…               ← click to edit description           │
│                                                                             │
│ ⠿ Nom complet *                               [Obligatoire] ⋯              │
│   [ réponse courte                ]                                        │
│                                                                             │
│ ⠿ Pourquoi nous rejoindre ? *                 [Obligatoire] ⋯              │
│   ┌ settings panel (inline, only when selected) ─────────────────────────┐ │
│   │ Type ▾  Aide…  Texte indicatif…  Longueur max…                       │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   + Ajouter une question   (or type "/" anywhere)                           │
│ ── Page 2 ─────────────────────────────── [+ page] ─────────────────────── │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **WYSIWYG**: questions are edited where they appear: label, help text, options typed directly on the canvas (contentEditable-free: inputs styled as text).
- **Insert menu**: "+" button between blocks and **`/` command** with search ("/email", "/oui"), grouped: *Texte · Choix · Date & nombre · Notation · Fichier · Mise en page*.
- **Options editing inline**: Enter adds the next option, Backspace on empty removes it, paste a multi-line list → one option per line.
- **⋯ menu per block**: Duplicate, Move up/down, Change type, Move to page…, Delete.
- **Delete = instant + Undo toast (6 s)**; plus global **Ctrl+Z / Ctrl+Shift+Z** (history stack, 50 steps).
- **Drag handle** ⠿ on hover (always visible on touch).
- **Pages**: "+ page" divider; pages become steps with a progress bar on the public form.
- **Keyboard**: ↑/↓ select block, Enter edit, Esc deselect, Ctrl+D duplicate, Alt+↑/↓ move, Ctrl+Enter add question below.
- **Right rail (desktop ≥1280 px)**: tabs *Question* (advanced settings) / *Design* (theme) / *Logique* (later). Below 1280 the rail becomes a bottom sheet.

### 2.4 Preview

- Drawer with Desktop / Mobile toggle rendering the real `PublicForm` in preview mode (interactive but not submitting, validation works).
- "Open in a new tab" → `/f/{slug}` (draft preview for leaders).

### 2.5 Publish & Share

- Publish calls `publish_form()` → snapshot in `form_versions`; public page renders `published_version_id` snapshot.
- After publishing: **Share modal** opens automatically: link with Copy, **QR code** (download PNG), WhatsApp / email share links, embed code with *Full page / Fixed height / Popup button* presets and live preview.
- Slug edit in Share with a warning "old links will stop working".

### 2.6 Results `/admin/forms/{id}/results`

```text
Réponses (42)   [Résumé] [Tableau]          [Rechercher…] [Statut ▾] [Date ▾] [Exporter ▾]
```

- **Résumé**: per-question summary: bar charts for choices/yes-no/rating/NPS (NPS score), counts for text with latest 5 answers, file count.
- **Tableau**: paginated table, sticky first column, column chooser, new-row highlight, status chip (*Nouveau / Vu / Accepté / Refusé / Spam*), Sheets sync icon.
- **Detail drawer**: all answers in question order, files with preview/download (re-signed on open), status buttons, internal note, prev/next navigation, delete with Undo.
- **Bulk**: select rows → change status, export selection, delete.
- **Export**: CSV (exists), XLSX, "copy to clipboard".
- "Accept" on a *membership* form offers **Create member** (uses `members` table).

### 2.7 Settings `/admin/forms/{id}/settings`

Sections with a left mini-nav: *Général* (title, slug, language), *Réponses* (open/close dates, max responses, one per email, respondent mapping), *Après envoi* (title, message, redirect, "send another response" button), *Design* (theme, cover, logo), *Intégrations* (Google Sheets health card), *Zone sensible* (archive, delete with type-to-confirm).
Settings also autosave per field (with inline ✓), except slug and danger actions.

### 2.8 Public form

- One-column card (current) **or** "one question per screen" layout (theme option).
- Multi-page with progress bar, Back / Next, answers kept when going back.
- Client-side validation on blur + submit; **focus moves to first invalid question**, error under the field with `aria-live="polite"`, summary at top for screen readers.
- Required marked with `*` + visually hidden "(obligatoire)".
- Draft answers saved in `sessionStorage` (refresh-safe).
- Success screen with optional "Submit another response".
- Closed / full / not-yet-open screens with the reason.

---

## 3. Implementation phases

Effort is for one developer (me) on this codebase. Each phase ends with typecheck, build, and a manual click-through in Docker.

### U1. Foundations (1.5 days) → *no more lost work*

| Task | Files |
|---|---|
| Split builder into route segments `edit / share / results / settings` with a shared `layout.tsx` (header + tabs as links). Redirect old `?tab=`. | `admin/forms/[id]/layout.tsx`, `.../edit/page.tsx`, etc. |
| Break `builder.tsx` (1.3k lines) into components: `BuilderHeader`, `Canvas`, `Block`, `BlockSettings`, `InsertMenu`, `SharePanel`, `ResultsView`, `SettingsView`. | `src/components/form-builder/*` |
| Builder state store (React context + reducer) with history stack (undo/redo). | `form-builder/store.ts` |
| Autosave: debounced `saveSchema`, save-status pill, retry with backoff, `beforeunload` guard while pending, localStorage backup + "Restore unsaved changes?" banner. | store + `actions.ts` (return `updated_at` for conflict check) |
| Conflict guard: save sends last known `updated_at`; if changed by someone else → banner "Edited elsewhere, reload". | `actions.ts` |
| Replace all `window.confirm` with a branded `ConfirmDialog`; question delete → Undo toast. | `components/ui/confirm-dialog.tsx` |

### U2. Canvas editing (2.5 days) → *the Tally feel*

| Task | Notes |
|---|---|
| WYSIWYG blocks: label/help/options edited in place; settings panel inline under selected block. | Reuse `FieldInput` visuals in "edit" mode. |
| Insert menu: "+" between blocks and `/` command palette with search and groups. | `cmdk` (small dependency) |
| Options UX: Enter to add, Backspace to remove, paste list, "Other" option toggle, shuffle toggle. | schema: `allowOther`, `shuffle` (JSON only) |
| Drag and drop (dnd-kit) + keyboard moves + ⋯ menu. | `@dnd-kit/core`, `@dnd-kit/sortable` |
| Keyboard shortcuts + visible shortcut help (`?`). | |
| Title and description editable on canvas and in header. | |

### U3. Publish, preview, share (1.5 days)

| Task | Notes |
|---|---|
| Header Publish button using `publish_form()`; "unpublished changes" detection (compare draft vs live version). | Public page reads the snapshot from `form_versions`. |
| Preview drawer Desktop/Mobile, interactive, non-submitting. | `PublicForm` gets `mode="preview"` |
| Share modal: copy, QR (`qrcode` lib), WhatsApp/email links, embed presets + live preview, slug edit warning. | |

### U4. Results (2.5 days)

| Task | Notes |
|---|---|
| Server-paginated table with search (`answers::text ilike`), status/date filters in URL. | Supabase range queries |
| Detail drawer with status, note, prev/next, files re-signed on open. | uses `responses.status/review_note` |
| Summary view with charts per question (lightweight SVG bars, no chart lib). | |
| Bulk actions, XLSX export, Undo on delete (soft delete via status `spam`→purge later, or delayed delete). | |
| Respondent mapping in settings; submit uses it instead of label guessing. | `settings.respondent*Field` |
| "New since last visit" badges (list + results). | localStorage |
| Accept membership → create member. | `members` |

### U5. Multi-page and public form polish (2 days)

| Task | Notes |
|---|---|
| Pages in editor (add, rename, reorder, move question to page). | schema already supports `pages[]` |
| Public stepper with progress bar, per-page validation, Back/Next. | |
| Accessible errors: inline per field, `aria-live`, focus first invalid, "(required)" SR text. | |
| `sessionStorage` answer recovery, "Submit another response". | |
| One-question-per-screen layout option. | theme `layout` |

### U6. Templates and duplication (1 day)

| Task | Notes |
|---|---|
| New-form modal with templates: Adhésion, Inscription événement, Avis, Quiz, Blank. | seed templates as `is_template = true` forms |
| Duplicate form, Save as template. | `duplicate_form()` exists |

### U7. Design / theming (1.5 days)

| Task | Notes |
|---|---|
| Design panel: brand presets, primary/background/text colors, font, radius, cover image, logo, button style. | `forms.theme` exists; upload to `media` bucket |
| Public page applies theme via CSS variables; contrast warning if poor. | |

### U8. Google Sheets health (1 day; needs Google credentials + service-role key)

| Task | Notes |
|---|---|
| Worker route draining `sheet_sync_jobs` (cron) with retries; per-response sync icon. | Vercel cron or Supabase Edge Function |
| Health card: last sync, failed count, *Retry failed*, *Sync all (backfill)*, header update when questions change. | |

### U9. Later (not scheduled)

Conditional logic (show/hide, jump to page), calculated fields and hidden URL fields, quiz scoring screen, response notifications, response receipt email, multi-language forms.

**Total for U1–U8: about 13–14 working days.**

---

## 4. Order and milestones

| Milestone | Phases | What you can do afterwards |
|---|---|---|
| M1 "Safe editing" | U1 | Edit forms without ever losing work; reload-safe tabs; no ugly dialogs. |
| M2 "Feels like Tally" | U2 + U3 | Type `/` to add questions, drag them, publish from the header, share by QR/WhatsApp. |
| M3 "Read answers easily" | U4 | Search, filter, open a response, accept a member, see charts. |
| M4 "Long forms" | U5 + U6 | Multi-step forms, templates, duplicate. |
| M5 "Branded & synced" | U7 + U8 | Custom look per form, reliable Google Sheets. |

---

## 5. Acceptance checks (per milestone)

- Create → publish → share link in **< 2 min** by someone who has never used it.
- Kill the tab mid-edit → reopen → nothing lost.
- Every destructive action has Undo or a branded confirm.
- Builder fully usable at 390 px width and with keyboard only.
- Public form: invalid submit moves focus to the first error and announces it.
- Results with 2 000 fake responses load the first page in < 1 s.
- FR and EN keys added together for every new string.

## 6. New dependencies

`@dnd-kit/core`, `@dnd-kit/sortable` (drag), `cmdk` (slash menu), `qrcode` (QR), `exceljs` or `xlsx` (XLSX export, optional). No database migration is required except two optional JSON settings keys; `members` and `form_versions` are already in place.
