# Form Builder — UI Inventory

Screen-by-screen inventory of the current interface, including exact copy in English and French. Use this as the checklist a redesign must preserve or intentionally replace.

Copy is shown as **EN / FR**. Admin translations live under `admin` and `adminForms`; public copy lives under `formPublic`.

---

## 1. Global admin frame

| Element | Behavior / copy |
| --- | --- |
| Sidebar | Dark grey vertical bar, 240 px, hidden below 768 px. |
| Logo | White circular Life Savers logo at the top. |
| Nav items | Dashboard, Forms, Events, Team, Settings / Tableau de bord, Formulaires, Événements, Équipe, Paramètres. Forms is the only live section besides the dashboard. |
| User line | `email · role` in small white text. |
| Log out | Pill-style link / button, label **Log out** / **Se déconnecter**. |
| Main area | Light grey background (`bg-muted`), 24 px padding. |
| Toasts | Sonner toasts appear top-center inside the admin area (used for schema save and copy actions). |

Known gap: on screens below 768 px the sidebar disappears and there is **no alternative admin navigation** (no hamburger, no bottom bar).

---

## 2. Forms list — `/{locale}/admin/forms`

### Page header

| Element | EN | FR |
| --- | --- | --- |
| H1 | Forms | Formulaires |
| Subtitle | Create forms, share them and read responses. | Créez des formulaires, partagez-les et consultez les réponses. |

### New-form card

White card with border and rounded corners.

| Element | EN | FR |
| --- | --- | --- |
| Heading | New form | Nouveau formulaire |
| Input placeholder | e.g. Membership 2026 | ex. Adhésion 2026 |
| Button | Create | Créer |
| Pending button | Creating… | Création… |
| Error examples | Add a title. / The title is too long. / Could not create the form. | Ajoutez un titre. / Le titre est trop long. / Impossible de créer le formulaire. |

- Input: required, max 200 chars.
- Button: blue pill, plus icon, disabled while pending.
- No slug field, no description field, no template picker.

### Empty state

Dashed border card, inbox icon.

| Element | EN | FR |
| --- | --- | --- |
| Title | No forms yet. | Aucun formulaire pour le moment. |
| Text | Create your first form to start collecting responses. | Créez votre premier formulaire pour commencer à collecter des réponses. |

### Form card

Two-column grid on desktop, one column on mobile.

| Element | Details |
| --- | --- |
| Title link | File icon + title, truncates; links to builder. |
| Slug | `/{slug}` in small muted text. |
| Status badge | Uppercase pill: **Draft** / **Published** / **Archived**; grey, green, grey. |
| Response count | Pluralized, e.g. **12 responses**. |
| Updated line | **Updated** + localized medium date. |
| Primary action | **Edit** / **Modifier**, blue pill. |
| Destructive action | Trash icon + **Delete** / **Supprimer**, pink text. Native confirm: **Delete this form and all of its responses?** / **Supprimer ce formulaire et toutes ses réponses ?** |

No search, filter, sort control, pagination or bulk actions. Order is last updated first.

---

## 3. Builder header — `/{locale}/admin/forms/{id}`

| Element | Behavior / copy |
| --- | --- |
| Back link | **← All forms** / **← Tous les formulaires**. |
| Title | Form title, truncates, 2xl extra bold blue. |
| Status badge | Same three states as the list, driven by the saved form status. |
| Slug | `/{slug}` muted. |
| Unsaved indicator | Pink text **Unsaved changes** / **Modifications non enregistrées**, only when local schema differs from last save. |
| View form | Outlined pill with external-link icon, opens the public URL in a new tab. Drafts open a 404. |
| Save changes | Blue pill with save icon. Disabled while saving or when clean. Labels: **Save changes** / **Enregistrer**, **Saving…** / **Enregistrement…**. |
| Save feedback | Toast **Changes saved** / **Modifications enregistrées**, or a pink error toast. |

The Save button is visible on every tab, but it only saves the question schema, not Settings fields.

---

## 4. Tabs

Horizontal strip with a bottom border; active tab has a blue underline and blue text. Scrolls horizontally on narrow screens. Tabs are local state, not URL routes (except the initial `?tab=` value).

| EN | FR | Contents |
| --- | --- | --- |
| Editor | Éditeur | Description, questions, question inspector, live preview |
| Share | Partager | Public URL and embed code |
| Submissions | Réponses | Response table and CSV export |
| Integrations | Intégrations | Google Sheets connection |
| Settings | Paramètres | Title, slug, status, dates, copy, redirect, delete |

---

## 5. Editor tab

### 5.1 Description card

| Element | EN | FR |
| --- | --- | --- |
| Label | Form description | Description du formulaire |
| Placeholder | Add a short description shown under the title | Ajoutez une courte description affichée sous le titre |

Two-row textarea. Appears under the H1 on the public form. No rich text.

### 5.2 Questions card

| Element | EN | FR |
| --- | --- | --- |
| Heading | Questions | Questions |
| Count | Number of questions, right-aligned | — |
| Empty state | No questions yet. Add your first question. | Aucune question. Ajoutez votre première question. |
| Row untitled label | Untitled question | Question sans titre |
| Type select | Lists all 13 types | — |
| Add button | Add question | Ajouter une question |

### 5.3 Question row

Anatomy: type icon, label, required `*`, type name, then four icon buttons.

| Control | Tooltip EN | Tooltip FR | Disabled when |
| --- | --- | --- | --- |
| Move up | Move up | Monter | First row |
| Move down | Move down | Descendre | Last row |
| Duplicate | Duplicate | Dupliquer | Never |
| Remove | Remove | Supprimer | Never |

Selected row: blue border, light blue background, blue ring. Clicking the row body selects it.

No drag handle is shown even though a grip icon exists in the icon set.

### 5.4 Add-question types

| Type key | EN | FR |
| --- | --- | --- |
| `short_text` | Short answer | Réponse courte |
| `long_text` | Long answer | Réponse longue |
| `email` | Email | E-mail |
| `phone` | Phone | Téléphone |
| `number` | Number | Nombre |
| `url` | Link | Lien |
| `date` | Date | Date |
| `multiple_choice` | Multiple choice | Choix unique |
| `checkboxes` | Checkboxes | Cases à cocher |
| `dropdown` | Dropdown | Liste déroulante |
| `rating` | Rating | Note |
| `statement` | Text block | Bloc de texte |
| `file` | File upload | Fichier |

Default new-question labels: `Short answer`, `Long answer`, `Email`, `Phone`, `Number`, `Website`, `Date`, `Multiple choice`, `Checkboxes`, `Dropdown`, `Rating`, `Section title`, `File upload`.

### 5.5 Question inspector

| Field | EN | FR | Notes |
| --- | --- | --- | --- |
| Header | Question | Question | X button clears selection |
| Type | Question type | Type de question | Changing type keeps ID, label, help, required |
| Label | Question | Question | Placeholder: **Your question** / **Votre question** |
| Help | Help text | Texte d'aide | Placeholder: **Optional description** / **Description facultative** |
| Placeholder | Placeholder | Texte indicatif | Hidden for choice, rating, statement, file |
| Required | Required | Obligatoire | Checkbox |
| Options | Options | Options | Choice types only |
| Option row | `Option {n}` | `Option {n}` | Input + trash button |
| Add option | Add option | Ajouter une option | Appends the next number |
| Remove option | Remove option | Supprimer l'option | Disabled at two options |
| Rating max | Maximum rating | Note maximale | 2–10, default 5 |
| Number min | Minimum | Minimum | Optional |
| Number max | Maximum | Maximum | Optional |
| Text max length | Max length | Longueur maximale | 1–20 000, optional |
| Empty inspector | Select a question to edit it. | Sélectionnez une question pour la modifier. | — |

### 5.6 Live preview

Card titled **Live preview** / **Aperçu**.

- Form title, description, all questions.
- Uses the exact public question renderer.
- Inputs disabled, submit button disabled.
- Submit label: configured label or **Submit** / **Envoyer**.
- No viewport switch, no theme switch, no interaction.

---

## 6. Share tab

### Card 1 — link

| Element | EN | FR |
| --- | --- | --- |
| Heading | Share your form | Partagez votre formulaire |
| Hint | Anyone with the link can fill the form once it is published. | Toute personne disposant du lien peut remplir le formulaire une fois publié. |
| URL field | Read-only, muted background | — |
| Copy | Copy link → toast **Link copied** | Copier le lien → **Lien copié** |
| Copy failure | Could not copy | Impossible de copier |
| Open | Open form | Ouvrir le formulaire |
| Unpublished warning | This form is not published yet. Publish it in Settings to accept responses. | Ce formulaire n'est pas encore publié. Publiez-le dans Paramètres pour accepter des réponses. |

The word **Settings** in the warning is a button that switches tabs.

### Card 2 — embed

| Element | EN | FR |
| --- | --- | --- |
| Heading | Embed on a website | Intégrer sur un site |
| Hint | Paste this code where the form should appear. | Collez ce code à l'endroit où le formulaire doit apparaître. |
| Code | Read-only textarea, monospace, 3 rows | — |
| Copy | Same **Copy link** label | Same **Copier le lien** label |

Embed template:

```html
<iframe src="<public url>" width="100%" height="720" style="border:0" title="Life Savers form"></iframe>
```

No preview, no size controls, no responsive presets.

---

## 7. Submissions tab

| Element | EN | FR |
| --- | --- | --- |
| Heading | Submissions | Réponses |
| Count | No responses / 1 response / N responses | Aucune réponse / 1 réponse / N réponses |
| Export | Export CSV | Exporter en CSV |
| Empty title | No responses yet. | Aucune réponse pour le moment. |
| Empty hint | Share the form link to collect responses. | Partagez le lien du formulaire pour collecter des réponses. |
| Column 1 | Submitted | Envoyé |
| Column 2 | Respondent | Répondant |
| Delete confirm | Delete this response? | Supprimer cette réponse ? |
| File label | Attachment | Pièce jointe |
| Synced icon label | Synced to Google Sheets | Synchronisé avec Google Sheets |

Table behavior:
- Newest first, latest 500 loaded.
- Date format: medium date + short time, localized.
- Green badge-check icon when synced.
- Respondent name bold, email muted below, `—` when absent.
- One column per non-statement question, using its label.
- Checkbox answers joined with commas; choice IDs resolved to labels.
- File answers link to a signed URL valid for one hour.
- Empty cells show `—`.
- Delete icon in the last column.
- Horizontal scroll on narrow screens; no sticky first column.

CSV columns: `Submitted at`, `Name`, `Email`, one per non-statement question, `Synced to Google Sheets`.

---

## 8. Integrations tab

| Element | EN | FR |
| --- | --- | --- |
| Heading | Integrations | Intégrations |
| Card title | Google Sheets | Google Sheets |
| Description | Send every new response to a spreadsheet automatically. | Envoyez automatiquement chaque nouvelle réponse dans une feuille de calcul. |
| Not configured title | Google Sheets is not configured on this server. | Google Sheets n'est pas configuré sur ce serveur. |
| Env hint | Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_TOKEN_ENCRYPTION_KEY and SUPABASE_SERVICE_ROLE_KEY to your environment. | Ajoutez GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_TOKEN_ENCRYPTION_KEY et SUPABASE_SERVICE_ROLE_KEY à votre environnement. |
| Connect | Connect Google Sheets | Connecter Google Sheets |
| Connected pill | Connected | Connecté |
| Open sheet | Open spreadsheet | Ouvrir la feuille |
| Reconnect | Reconnect | Reconnecter |
| Disconnect | Disconnect | Déconnecter |
| Disconnect confirm | Disconnect Google Sheets? New responses will stop syncing. | Déconnecter Google Sheets ? Les nouvelles réponses ne seront plus synchronisées. |
| Success banner | Google Sheets connected. | Google Sheets est connecté. |
| Failure banner | Google Sheets connection failed. Please try again. | La connexion à Google Sheets a échoué. Veuillez réessayer. |
| How it works | How it works | Comment ça marche |
| Step 1 | Connect your Google account (spreadsheet access only). | Connectez votre compte Google (accès aux feuilles de calcul uniquement). |
| Step 2 | We create a spreadsheet and link it to this form. | Nous créons une feuille de calcul et la lions à ce formulaire. |
| Step 3 | Each new response is appended as a row automatically. | Chaque nouvelle réponse est ajoutée automatiquement sous forme de ligne. |
| Backfill note | Only new responses are synced; existing responses are not backfilled. | Seules les nouvelles réponses sont synchronisées ; les réponses existantes ne sont pas ajoutées. |

States: unavailable, available, connected. There is no per-response sync status or retry UI.

---

## 9. Settings tab

| Field | EN | FR | Rules |
| --- | --- | --- | --- |
| Heading | Form settings | Paramètres du formulaire | — |
| Title | Title | Titre | Required, max 200 |
| Slug | Public URL slug | Lien public | Required, `[a-z0-9-]`, unique, max 80 |
| Slug hint | Lowercase letters, numbers and dashes. | Lettres minuscules, chiffres et tirets. | — |
| Status | Status | Statut | Draft / Published / Archived |
| Opens at | Opens at | Ouvre le | Optional datetime-local |
| Closes at | Closes at | Ferme le | Optional datetime-local |
| Dates hint | Leave empty to accept responses indefinitely. | Laissez vide pour accepter les réponses sans limite. | — |
| Submit label | Submit button label | Libellé du bouton | Max 80 |
| Submit placeholder | Submit | Envoyer | — |
| Redirect | Redirect after submit | Redirection après envoi | Optional absolute URL |
| Redirect hint | Optional. Absolute URL, e.g. https://example.com/thanks | Facultatif. URL absolue, ex. https://example.com/merci | — |
| Success title | Confirmation title | Titre de confirmation | Max 200 |
| Success title placeholder | Thank you! | Merci ! | — |
| Success message | Confirmation message | Message de confirmation | Max 2000 |
| Success message placeholder | Your response has been received. | Votre réponse a bien été reçue. | — |
| Save | Save changes | Enregistrer | Disabled while pending |
| Success | Settings saved | Paramètres enregistrés | Inline green text |
| Danger heading | Danger zone | Zone sensible | — |
| Danger text | Deleting the form also deletes every response. | Supprimer le formulaire supprime aussi toutes les réponses. | — |
| Delete | Delete form | Supprimer le formulaire | Native confirm |

Validation messages: see section 11.

---

## 10. Public form — `/{locale}/f/{slug}`

### Page frame

| Element | Copy |
| --- | --- |
| Background | Light grey; blue→pink gradient band at the top |
| Header | White circular logo + uppercase **LIFE SAVERS**; right-side tagline on desktop |
| Tagline | Spread health, spread hope. / Partageons la santé, partageons l'espoir. |
| Card | White, rounded, soft shadow, max width 768 px |
| H1 | Form title |
| Description | Optional, multiline |
| Rule | Short blue→pink gradient bar |
| Footer | Powered by Life Savers / Propulsé par Life Savers |

### Question rendering

- Label bold grey, required `*` in pink.
- Help text muted, under the label.
- Short text: single-line input.
- Long text: 4-row textarea.
- Email/phone/number/date: native typed inputs; number supports min/max/step any.
- URL: native URL input.
- Multiple choice: bordered option rows with radio inputs.
- Checkboxes: bordered option rows with checkboxes.
- Dropdown: native select with disabled placeholder **Choose an option** (or custom placeholder).
- Rating: circular number buttons, selected button blue.
- Text block: dashed grey box with title and paragraph.
- File: dashed upload area with a blue native file button.
- Full-width blue pill submit at the end.

### Feedback states

| State | Presentation |
| --- | --- |
| Submitting | Button label **Sending…** / **Envoi…**, disabled |
| Validation error | Pink bordered banner above the button, translated message + question label |
| Success | Green card replaces the form: check icon, success title, success message |
| Redirect | Browser leaves the app; no in-app confirmation |
| Closed | Grey dashed card: **This form is closed** / **Ce formulaire est fermé** + explanation |
| No questions | Muted note **This form does not have any questions yet.** |
| Missing/draft/archived | 404 page |

### Submission error codes

| Code | EN | FR |
| --- | --- | --- |
| `required` | Please answer this question. | Veuillez répondre à cette question. |
| `invalid` | Please check your answer. | Vérifiez votre réponse. |
| `invalid_email` | Enter a valid email address. | Saisissez une adresse e-mail valide. |
| `invalid_phone` | Enter a valid phone number. | Saisissez un numéro de téléphone valide. |
| `invalid_url` | Enter a valid URL. | Saisissez une URL valide. |
| `invalid_number` | Enter a valid number. | Saisissez un nombre valide. |
| `invalid_date` | Enter a valid date. | Saisissez une date valide. |
| `invalid_choice` | Choose one of the options. | Choisissez l'une des options. |
| `too_long` | This answer is too long. | Cette réponse est trop longue. |
| `file_too_large` | The file is too large (max 10 MB). | Le fichier est trop volumineux (10 Mo max). |
| `upload_failed` | The file could not be uploaded. | Le fichier n'a pas pu être envoyé. |
| `closed` | This form is closed. | Ce formulaire est fermé. |
| `submit_failed` | Something went wrong. Please try again. | Une erreur est survenue. Veuillez réessayer. |

---

## 11. Admin validation and error copy

| Code | EN | FR |
| --- | --- | --- |
| `title_required` | Add a title. | Ajoutez un titre. |
| `title_too_long` | The title is too long. | Le titre est trop long. |
| `create_failed` | Could not create the form. | Impossible de créer le formulaire. |
| `unauthorized` | You are not allowed to do that. | Action non autorisée. |
| `invalid_schema` | Some questions are invalid. | Certaines questions sont invalides. |
| `invalid` | Check the highlighted question. | Vérifiez la question signalée. |
| `slug_taken` | This link is already used. | Ce lien est déjà utilisé. |
| `slug_invalid` | Use lowercase letters, numbers and dashes. | Utilisez des lettres minuscules, des chiffres et des tirets. |
| `date_order` | The closing date must be after the opening date. | La date de fermeture doit être après la date d'ouverture. |
| `update_failed` | Could not save the settings. | Impossible d'enregistrer les paramètres. |
| `save_failed` | Could not save the form. | Impossible d'enregistrer le formulaire. |
| `redirect_invalid` | The redirect URL must start with http:// or https://. | L'URL de redirection doit commencer par http:// ou https://. |

Error placement:
- Create form: pink text under the input.
- Save schema: pink toast.
- Settings: pink text above the save button.
- Public submit: pink banner above the submit button.

---

## 12. Responsive behavior

| Area | Behavior |
| --- | --- |
| Admin sidebar | Hidden below 768 px; no replacement navigation |
| Builder header | Stacks vertically below 1024 px |
| Builder columns | One column below 1280 px; questions first, inspector and preview after |
| Tabs | Horizontally scrollable |
| Lists | Form cards one per row on mobile |
| Submissions | Horizontal table scroll |
| Public form | Single card with 24 px page padding; header tagline hidden on mobile |

---

## 13. Accessibility notes

Present:
- Inputs are wrapped in labels or associated via `htmlFor`.
- Icon-only buttons have `aria-label` and `title`.
- Native required validation is enabled for most inputs.
- Color is not the only cue for selection (border + background + ring).

Missing or weak:
- Tab strip is not an ARIA `tablist`; tabs do not manage arrow-key focus.
- Error banners are not `aria-live` and focus does not move to the first invalid field.
- Required is signaled with `*` and no accessible text like “required”.
- Move/duplicate/delete controls are 28–30 px targets.
- Native `window.confirm` is used for destructive actions.
- No focus-visible styling is explicitly defined for icon buttons.
- The preview disables inputs rather than marking them read-only/aria-hidden.
- No skip link in the admin frame.

---

## 14. Visual tokens

| Token | Value |
| --- | --- |
| Pink | `#ef4a6c` |
| Blue | `#2d74ba` |
| Grey | `#414042` |
| Ink | `#231f20` |
| Green | `#6ebd45` |
| Background | `#ffffff` |
| Muted | `#f4f6f9` |
| Muted foreground | `#646469` |
| Border | `#e6e8ee` |
| Card radius | `1.25rem` (`rounded-card`) |
| Soft shadow | `0 10px 30px -12px rgb(45 116 186 / 0.25)` |
| Pink glow | `0 12px 40px -10px rgb(239 74 108 / 0.45)` |
| Font | Nunito via `next/font` |
| Gradient | blue → pink (`bg-brand-gradient`) |

Common patterns:
- Primary buttons: blue pill, white bold label.
- Secondary buttons: white/transparent with border, grey label.
- Destructive: pink text or pink pill.
- Cards: white background, `border-border`, `rounded-card`, 20 px padding.
- Section headings: bold grey; page titles: extra-bold blue.

---

## 15. Translation namespaces

| Namespace | Contents |
| --- | --- |
| `admin` | Dashboard cards, section labels, welcome, coming soon, forms description |
| `adminForms` | Entire admin form-builder UI, including errors, tabs, statuses, question type names |
| `formPublic` | Public form copy and submission errors |

Any redesign must add new keys to both `src/messages/en.json` and `src/messages/fr.json`. French is the default locale.
