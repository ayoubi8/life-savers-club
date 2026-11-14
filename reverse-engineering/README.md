# club-vibe-nexus frontend reverse-engineering

The Lovable preview is **private** (401). No unauthenticated scraper can reach it.
This pipeline attaches to a Chrome you are already logged into, so it can capture
the authenticated frontend, then produce a rebuild/redesign spec for Claude Design.

- `scripts/capture.mjs` — full-fidelity capture over CDP: rendered HTML, all CSS,
  screenshots (desktop + mobile), every image/font/video, computed design tokens,
  component inventory, copy deck, routes, network log, `SPEC.md`.
- `scripts/start-browser.ps1` — launches a dedicated Chrome profile with the
  DevTools port open.
- `scripts/run-rea.ps1` — passive evidence via [REA](https://github.com/morluto/rea)
  (DOM tree, scripts, routes, network metadata, screenshot).

## 1. Install

```powershell
cd "C:\Users\ayoub\OneDrive\Documents\life savers club\reverse-engineering"
npm install
```

## 2. Open an authenticated Chrome

> If you have a **public Lovable share link** (`lovable.dev/preview/<id>`), you can
> skip this and run step 3 directly — the script resolves the tokenized preview URL.
> The last capture used `https://lovable.dev/preview/2gb8FKZpnZQQv4KHuScD05RIl5X4RVou`.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-browser.ps1
```

In the window that opens:

1. Log into Lovable.
2. Open `https://preview--club-vibe-nexus.lovable.app/`.
3. Confirm the app renders (not the "Internal Lovable project" gate).
4. Leave Chrome running.

The login is stored in `.chrome-profile/`, so later runs skip this step.

## 3. Capture

Single page:

```powershell
npm run capture -- --url "https://preview--club-vibe-nexus.lovable.app/"
```

Whole app (follows same-origin links, up to 30 routes):

```powershell
npm run capture -- --url "https://preview--club-vibe-nexus.lovable.app/" --crawl --max-pages 40
```

Useful flags:

| Flag | Meaning |
| --- | --- |
| `--cdp <url>` | CDP endpoint (default `http://127.0.0.1:9222`) |
| `--out <dir>` | output directory (default `output`) |
| `--settle <ms>` | wait after load for animations/lazy content (default 3000) |
| `--crawl` | also capture linked same-origin routes |
| `--max-pages <n>` | crawl cap (default 30) |
| `--no-mobile` | skip 390×844 screenshots |
| `--max-assets <n>` | asset download cap (default 400) |

## 4. Optional: REA evidence

REA needs **Node ≥ 24.22.1** (yours: 24.16.0 → run `nvm install 24` or update Node).
With the authenticated Chrome still open:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run-rea.ps1
```

Writes `output/rea/targets.json`, `inspect-web-page.json`, `web-bundle.json`,
`screenshot.json`, `session.json`.

## 5. Output

```
output/
  SPEC.md                  # paste into Claude Design (+ screenshots)
  design-tokens.json       # colors, type, spacing, radii, shadows, CSS vars
  capture-meta.json
  assets-manifest.json
  assets/                  # every image / font / video
  screenshots/             # root-desktop.png, root-mobile.png, per-route shots
  pages/<slug>/
    page.json              # meta, copy, outline, components, css vars, network
    rendered.html          # post-JS DOM
    body.html
    text.txt               # full visible copy
    styles.css             # bundled CSS (inline + same-origin sheets)
```

`CLAUDE_DESIGN_BRIEF.md` (repo root) is a paste-ready brief: product summary,
exact design tokens, page-by-page inventory, component patterns, redesign
opportunities, and the final Claude Design prompt.

## 6. Feed Claude Design

Give it:

1. `output/SPEC.md`
2. `output/screenshots/*.png`
3. `output/design-tokens.json`
4. A few `output/pages/<slug>/rendered.html` files

Then ask for the rebuild + redesign. Once captured, the next step is scaffolding
the rebuilt app (Next.js or Vite + React + Tailwind) from these artifacts.

## Notes

- Capture connects to your existing browser; it never closes Chrome.
- Cookies are used only in-process to fetch assets from the same session.
- Everything is written locally under `output/` (git-ignored).
