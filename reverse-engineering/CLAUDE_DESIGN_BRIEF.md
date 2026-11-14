# Life Savers Hub — Frontend Reverse-Engineering + Claude Design Brief

Captured from the live Lovable build (`lovable.dev/preview/2gb8FKZpnZQQv4KHuScD05RIl5X4RVou`)
on 2026-11-13. Everything below is extracted from the rendered DOM/CSS, not guessed.

- Artifacts: `output/` (screenshots, HTML, CSS, tokens, copy, assets)
- Token dump: `output/design-tokens.json`
- Per-route details: `output/pages/<route>/page.json`
- Screenshots: `output/screenshots/`

---

## 1. What the product is

**Life Savers Hub** — a scientific club site for medical/pharmacy students and
researchers. It presents the club, team, events, articles, sponsors, and a
membership funnel (Join Us) plus an article-submission flow with a rich-text
editor and PDF export.

Routes captured (8):

| Route | Purpose | Screenshot |
| --- | --- | --- |
| `/` | Marketing home | `root-desktop.png` / `root-mobile.png` |
| `/members` | Team + alumni | `01-members-*.png` |
| `/events` | Events + invitations tabs | `02-events-*.png` |
| `/articles` | Article grid + category filter | `03-articles-*.png` |
| `/sponsors` | Sponsor logos + CTA | `04-sponsors-*.png` |
| `/submit-article` | Article editor + live preview + PDF | `05-submit-article-*.png` |
| `/join-us` | Benefits + membership form | `06-join-us-*.png` |
| `/become-sponsor` | Sponsor contact channels | `10-become-sponsor-*.png` |

Broken today: `/articles/<slug>` detail links render the app's 404 (only list
cards link out). Redesign should either add real detail pages or drop the link.

---

## 2. Detected stack

- React SPA built with **Vite** (hashed `assets/index-*.js`), client-side routing.
- **Tailwind CSS** utility classes + **shadcn/ui** (Radix) primitives (`Card`, `Tabs`, `Dialog/Sheet`, `Button`, `Input`, `Textarea`).
- **Lucide** icons, **Sonner** toasts, **Framer Motion** (`animate-fade-in`), **CKEditor 5** in the article editor.
- **No custom webfont** — system UI sans stack (`ui-sans-serif, system-ui, …`).
- Single CSS bundle (~405 KB, includes CKEditor theme).
- Assets are minimal: one logo (`assets/logo-*.jpg`) and one placeholder SVG; the visual language is gradients + iconography + cards, not photography.

---

## 3. Design tokens (exact)

HSL variables are shadcn-style; hex is the resolved value.

### Color

| Token | HSL | Hex | Usage |
| --- | --- | --- | --- |
| `--background` | `0 0% 100%` | `#ffffff` | page |
| `--foreground` | `220 20% 20%` | `#29303d` | body text (17 uses/100 elems) |
| `--card` | `0 0% 100%` | `#ffffff` | cards, header, footer |
| `--primary` | `204 67% 43%` | `#247cb7` | brand blue, links, CTAs |
| `--secondary` | `210 15% 96%` | `#f3f5f6` | section bands, chips |
| `--muted` | `210 15% 96%` | `#f3f5f6` | muted surfaces |
| `--muted-foreground` | `220 10% 50%` | `#737b8c` | secondary text |
| `--accent` | `349 82% 59%` | `#ec4160` | brand pink/red, years, highlights |
| `--hover` | `204 85% 69%` | `#6dbdf3` | hover blue |
| `--destructive` | `0 84% 60%` | `#ef4343` | errors |
| `--border` / `--input` | `214 31% 91%` | `#e1e7ef` | hairlines, inputs |
| `--ring` | `204 67% 43%` | `#247cb7` | focus ring |

Supporting tokens:

```css
--gradient-hero: linear-gradient(135deg, hsl(204 67% 43%), hsl(349 82% 59%));
--gradient-card: linear-gradient(180deg, #fff, hsl(210 15% 98%));
--shadow-soft: 0 4px 20px -2px hsl(204 67% 43% / .1);
--shadow-card: 0 8px 30px -6px hsl(204 67% 43% / .15);
--radius: .75rem; /* 12px */
```

Observed palette frequency: blue + near-black text dominate; red/pink is a
deliberate accent (timeline years, highlighted words, accent-bordered cards).

### Typography

No webfont. Scale actually used on the home page:

| Role | Size / line-height | Weight |
| --- | --- | --- |
| Hero H1 | `60px / 60px` (md+), smaller on mobile | `700` |
| Section H2 | `36px / 40px` | `700` |
| Card H3 | `20–24px` | `600` |
| Body | `16px / 24px` | `400` |
| Small / meta | `12–14px / 18–20px` | `400–500` |

### Shape, spacing, motion

- Radius: `12px` cards/inputs, `10px` tabs, `6px` badges/inner controls, `9999px` pills/avatars.
- Section rhythm: `py-16` (64px) default, hero `py-20` (80px), gradients `py-16–20`.
- Container: `container mx-auto px-4`; grids `gap-6`/`gap-8`/`gap-12`.
- Borders: `1px` default, `2px` team cards, `4px` featured leader cards.
- Motion: `animate-fade-in` on timeline; subtle hover lifts on cards.

---

## 4. Global layout

**Header** — `sticky top-0 z-50 border-b bg-card/95 backdrop-blur-sm`
- Left: logo image + wordmark “Life Savers Hub”.
- Center/right desktop nav (`hidden md:flex gap-6`): Home, Members, Events, Articles, Sponsors.
- Actions: “Submit Article” (outline) + “Join Us” (primary).
- Mobile: icon button (`h-10 w-10 md:hidden`, `aria-haspopup="dialog"`) opening a Radix dialog/sheet.

**Footer** — `mt-20 border-t bg-card`, 3-column grid:
1. About blurb.
2. Contact Us — `contact@lifesavershub.org`, `+1 (555) 123-4567`, `123 Medical Plaza, Health City, HC 12345`.
3. Follow Us — social icons.
Bottom: `© 2026 Life Savers Hub. All rights reserved.` (the “Edit with Lovable” badge is platform chrome — drop it in the rebuild).

**Page shell** — every route = header → section(s) → footer.

---

## 5. Page-by-page inventory

### Home (`/`)
1. **Hero** — grid `md:grid-cols-2`: left heading “Advancing Science Together” + subcopy “Join our community of passionate researchers and healthcare professionals”, two feature blocks (“Pioneering Research”, “Inspiring Future Scientists”), CTA “Meet Our Team”. Right: `h-[400px]` rounded image placeholder.
2. **About Life Savers Hub** — image + copy + “Meet Our Team”.
3. **Our Journey** (`bg-secondary/20`) — vertical timeline 2018 Club Founded · 2019 First Publication · 2020 100 Members · 2022 National Recognition · 2024 International Collaboration; year in accent, node in primary.
4. **Featured Articles** — 3 cards (image, category badge, title, excerpt, “Read More”), “View All Articles”.
5. **What Our Members Say** — testimonial cards.
6. **Get in Touch** — CTA → “Contact Us”.

### Members (`/members`)
- “Our Team” heading; 2 featured cards with `border-4` (one primary, one accent) for Founder/President and VP.
- “Team Leaders” `md:grid-cols-3` cards (`border-2 border-primary/50`): role, bio, “Team Members” list.
- “Former Presidents & Alumni” list card.

### Events (`/events`)
- Gradient hero (`--gradient-hero`) centered title + subcopy.
- Tabs: “Life Savers Events” / “Invitations”.
- Event cards `md:grid-cols-2` (date, title, description, CTA).

### Articles (`/articles`)
- Filter tabs: All · Medicine · Dental · Pharmacy.
- Card grid `md:grid-cols-2 lg:grid-cols-3` with image, category, title, excerpt, “Read More”.

### Sponsors (`/sponsors`)
- Gradient hero “Our Sponsors” + thank-you line.
- Logo grid `md:grid-cols-2 lg:grid-cols-4`.
- Muted CTA band “Want to Support Our Mission?” → “Become a Sponsor”.

### Submit Article (`/submit-article`)
- Two-column `lg:grid-cols-2`.
- Card “Article Details”: title*, category*, cover image, full document upload, content* (CKEditor 5).
- Card “Author Information”: name*, email*, social.
- “Send for Review”.
- Card “Live Preview”, card “Tools & Export” → “Export as PDF” (gated after submission).

### Join Us (`/join-us`)
- Gradient hero.
- 3 value cards: Learn & Grow · Network · Make Impact.
- Membership form (`max-w-3xl`): Full Name*, Email*, Phone, University/Institution, Major/Field of Study, Year of Study, “Why do you want to join Life Savers?”*, Skills & Experience, Availability; Submit Application / Reset.

### Become a Sponsor (`/become-sponsor`)
- Centered `max-w-md` card with channels: Facebook, Instagram, Email (`sponsors@lifesavershub.com`), Phone (`+1 (234) 567-890`).

---

## 6. Component patterns to reproduce

- **Sticky translucent header** with blur and dual CTA.
- **Gradient hero band** (blue → pink, 135°) for interior pages.
- **Card** = white, `1px` border, `12px` radius, `shadow-sm/md`, hover lift.
- **Accent-bordered feature cards** (`border-4 primary/accent`) for leadership.
- **Vertical timeline** with accent year + primary node + connecting line.
- **Category badge** pill, **tabs** (`10px` radius, muted track).
- **Form card** with labeled inputs, required asterisks, two-column field grids.
- **Rich editor** (CKEditor) + live preview + PDF export.
- **Testimonial card** with quote + author.
- **Footer** 3-column with contact + social.

---

## 7. Content model (from captured copy)

- Nav: Home, Members, Events, Articles, Sponsors, Submit Article, Join Us.
- Tagline: “Advancing Science Together”.
- Mission: “Life Savers Hub is a premier scientific club dedicated to advancing healthcare knowledge and fostering a community of passionate researchers, students, and professionals in the medical and pharmaceutical fields.”
- Timeline: 2018–2024 milestones (above).
- Categories: Medicine, Dental, Pharmacy.
- Leadership: Dr. Alexandra Morgan (Founder & President), Dr. James Chen (VP), Dr. Sarah Williams (Research Lead), Dr. David Martinez (Community Lead), Dr. Rachel Kim (Events Lead).
- Contact: `contact@lifesavershub.org`, `+1 (555) 123-4567`, `123 Medical Plaza, Health City, HC 12345`.

---

## 8. Redesign opportunities (for Claude Design)

1. **Identity** — the blue+pink gradient is generic. Propose a distinctive medical/scientific system (e.g., deep clinical navy + vital-sign red, or editorial ivory + ink + one signal color) while keeping trust and readability.
2. **Hierarchy** — home is a long stack of similar `py-16` bands; introduce contrast (full-bleed hero, editorial article strip, asymmetric grid).
3. **Photography** — everything is a placeholder/gradient; define an image direction (lab, people, abstract molecular) and a duotone treatment.
4. **Nav/funnel** — two CTAs compete; clarify primary action (“Join Us”) and demote “Submit Article”.
5. **Article experience** — fix the 404 detail route; design a real reading page with typography scale, TOC, author, related posts.
6. **Forms** — add progress/validation states, success screens, and trust cues.
7. **Responsive** — verify the mobile sheet and dense cards at 390px; current mobile shots are captured for every route.
8. **Accessibility** — confirm focus rings (`--ring`), contrast of `#737b8c` on `#f3f5f6`, and 44px touch targets.
9. **Dark mode** — only light tokens exist; decide whether to keep light-only or add a dark theme.

---

## 9. Paste this into Claude Design

> Redesign the **Life Savers Hub** scientific-club website. It is a React + Tailwind + shadcn/ui app. Use the attached screenshots (`root`, `members`, `events`, `articles`, `sponsors`, `submit-article`, `join-us`, `become-sponsor`, desktop + mobile) and `design-tokens.json` as the source of truth for current content and structure.
>
> **Product:** a medical/pharmacy scientific club. Audiences: students, researchers, sponsors. Goals: credibility, membership sign-ups, article submissions, sponsor interest.
>
> **Current system to evolve (not copy):** primary blue `#247cb7`, accent pink `#ec4160`, foreground `#29303d`, muted `#737b8c`, surface `#f3f5f6`, border `#e1e7ef`, background `#fff`; system sans; 12px radii; blue→pink gradient hero; sticky blurred header; white cards with soft blue shadow; vertical timeline; pill badges; tab filters; form cards; CKEditor article submission with live preview and PDF export.
>
> **Keep:** all routes and content (home, members, events, articles, sponsors, submit-article, join-us, become-sponsor), the membership and submission flows, the timeline, team/alumni structure, sponsor CTA, and footer contact block.
>
> **Change:** give it a distinctive, ownable visual identity (propose 2 directions first), stronger hierarchy with at least one full-bleed/editorial moment, a defined photo/illustration direction and duotone treatment, one clear primary CTA, a proper article reading page (fix the 404), polished form states, and a verified 390px mobile layout.
>
> **Deliver:** design system (color, type scale, spacing, radii, shadows, motion), desktop + mobile screens for every route, component specs (header, hero, cards, timeline, tabs, forms, editor, footer), and a short rationale per direction.

---

## 10. File map for design handoff

```
output/
  SPEC.md                     # auto-generated token/component/copy spec
  design-tokens.json          # structured tokens (colors, type, spacing, css vars)
  screenshots/                # desktop + mobile per route
  pages/root/                 # post-JS DOM + CSS + copy for home
  pages/01-members/ …         # each route
  assets/                     # logo + placeholder svg
```
