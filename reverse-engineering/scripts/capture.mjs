#!/usr/bin/env node
/**
 * Authenticated frontend capture over the Chrome DevTools Protocol (CDP).
 *
 * Connects to a Chrome/Edge you already started with --remote-debugging-port,
 * reuses its logged-in Lovable session, then captures:
 *   - rendered HTML + all CSS
 *   - screenshots (desktop + mobile)
 *   - every image/font/video asset
 *   - computed design tokens (colors, type, spacing, radii, shadows)
 *   - component inventory + copy deck + route list
 *   - a SPEC.md ready to paste into Claude Design
 *
 * Usage:
 *   node scripts/capture.mjs --url "https://preview--club-vibe-nexus.lovable.app/" --crawl
 */

import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------- args
function parseArgs(argv) {
  const out = {
    url: '',
    out: 'output',
    cdp: 'http://127.0.0.1:9222',
    settle: 3000,
    crawl: false,
    maxPages: 30,
    mobile: true,
    maxAssets: 400,
    maxAssetBytes: 25 * 1024 * 1024,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') out.url = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--cdp') out.cdp = argv[++i];
    else if (a === '--settle') out.settle = Number(argv[++i]);
    else if (a === '--crawl') out.crawl = true;
    else if (a === '--max-pages') out.maxPages = Number(argv[++i]);
    else if (a === '--no-mobile') out.mobile = false;
    else if (a === '--max-assets') out.maxAssets = Number(argv[++i]);
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

/**
 * Lovable share links are not the app itself. `lovable.dev/preview/<id>` and
 * `lovable.dev/share-preview/<uuid>` redirect to a tokenized
 * `id-preview--<uuid>.lovable.app?__lovable_token=<JWT>` URL. Resolve it so the
 * caller can pass the friendly link and we always use a fresh token.
 */
async function resolveTargetUrl(input) {
  // Already includes a resolved token in the hash.
  const hashMatch = input.match(/[#&]preview_url=([^&]+)/);
  if (hashMatch) {
    const decoded = decodeURIComponent(hashMatch[1]);
    if (decoded.startsWith('http')) return decoded;
  }

  let u;
  try {
    u = new URL(input);
  } catch {
    return input;
  }
  if (!/^(www\.)?lovable\.dev$/i.test(u.hostname)) return input;
  if (!/^\/(preview|share-preview)\//.test(u.pathname)) return input;

  const res = await fetch(input, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0' } });
  const location = res.headers.get('location');
  if (!location) return input;

  const loc = new URL(location, input);
  const m = loc.hash.match(/[#&]preview_url=([^&]+)/);
  if (m) {
    const decoded = decodeURIComponent(m[1]);
    if (decoded.startsWith('http')) return decoded;
  }
  // Follow a share-preview page once and look for the preview URL in the body.
  const page = await fetch(loc.toString(), { headers: { 'user-agent': 'Mozilla/5.0' } });
  const html = await page.text();
  const found = html.match(/preview_url=([^"'&\\]+)/);
  if (found) {
    const decoded = decodeURIComponent(found[1]);
    if (decoded.startsWith('http')) return decoded;
  }
  return input;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.url) {
  console.log(`Frontend capture over CDP

  --url <url>            target URL (required)
  --cdp <endpoint>       CDP endpoint (default http://127.0.0.1:9222)
  --out <dir>            output dir (default ./output)
  --settle <ms>          wait after load for animations/lazy content (default 3000)
  --crawl                also capture same-origin linked routes
  --max-pages <n>        max pages when crawling (default 30)
  --no-mobile            skip mobile screenshots
  --max-assets <n>       max assets to download (default 400)

Start Chrome first:
  chrome.exe --remote-debugging-port=9222 --user-data-dir=<profile> about:blank
`);
  process.exit(args.url ? 0 : 1);
}

const OUT = path.resolve(ROOT, args.out);
const PAGES_DIR = path.join(OUT, 'pages');
const ASSETS_DIR = path.join(OUT, 'assets');
const SHOTS_DIR = path.join(OUT, 'screenshots');

// ---------------------------------------------------------------- utils
function slugify(s) {
  return (
    s
      .replace(/^https?:\/\//, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120) || 'page'
  );
}

function routeLabel(u) {
  try {
    const p = new URL(u).pathname.replace(/\/$/, '');
    if (!p) return 'home';
    return p.replace(/^\//, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80) || 'home';
  } catch {
    return 'page';
  }
}

function extFromUrl(u, fallback = 'bin') {
  try {
    const p = new URL(u).pathname;
    const m = p.match(/\.([a-z0-9]{1,8})$/i);
    return m ? m[1].toLowerCase() : fallback;
  } catch {
    return fallback;
  }
}

function isHttp(u) {
  return /^https?:\/\//i.test(u);
}

function normalizeUrl(u, base) {
  try {
    const url = new URL(u, base);
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

async function ensureDirs() {
  for (const d of [OUT, PAGES_DIR, ASSETS_DIR, SHOTS_DIR]) {
    await fs.mkdir(d, { recursive: true });
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const step = Math.max(300, window.innerHeight * 0.8);
    let y = 0;
    const max = Math.min(document.body.scrollHeight, 30000);
    while (y < max) {
      window.scrollTo(0, y);
      await sleep(120);
      y += step;
    }
    window.scrollTo(0, 0);
    await sleep(300);
  }).catch(() => {});
}

// ---------------------------------------------------------------- in-page extraction
/* Runs inside the browser. Must be self-contained. */
function collectPageData() {
  const abs = (u) => {
    try {
      return new URL(u, document.baseURI).toString();
    } catch {
      return null;
    }
  };
  const srcsetUrls = (value) =>
    !value
      ? []
      : value
          .split(',')
          .map((part) => part.trim().split(/\s+/)[0])
          .map(abs)
          .filter(Boolean);

  // ---- stylesheets
  const inlineStyles = [];
  const externalCss = [];
  const cssRuleTexts = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules = null;
    try {
      rules = sheet.cssRules;
    } catch {
      rules = null;
    }
    if (rules) {
      let text = '';
      for (const r of Array.from(rules)) text += r.cssText + '\n';
      cssRuleTexts.push(text);
    } else if (sheet.href) {
      externalCss.push(sheet.href);
    }
  }
  for (const el of Array.from(document.querySelectorAll('style'))) {
    inlineStyles.push(el.textContent || '');
  }

  // ---- fonts
  const fonts = [];
  try {
    for (const f of Array.from(document.fonts)) {
      fonts.push({ family: f.family, weight: f.weight, style: f.style, status: f.status });
    }
  } catch {}

  // ---- assets
  const assetUrls = new Set();
  const add = (u) => {
    if (u && !u.startsWith('data:') && !u.startsWith('blob:')) assetUrls.add(u);
  };
  document.querySelectorAll('img').forEach((el) => {
    if (el.currentSrc) add(abs(el.currentSrc));
    if (el.src) add(abs(el.src));
    srcsetUrls(el.getAttribute('srcset')).forEach(add);
  });
  document.querySelectorAll('source').forEach((el) => {
    if (el.src) add(abs(el.src));
    srcsetUrls(el.getAttribute('srcset')).forEach(add);
  });
  document.querySelectorAll('video').forEach((el) => {
    if (el.src) add(abs(el.src));
    if (el.poster) add(abs(el.poster));
  });
  document.querySelectorAll('audio').forEach((el) => el.src && add(abs(el.src)));
  document.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"],link[rel="manifest"]').forEach((el) => {
    if (el.href) add(abs(el.href));
  });
  document.querySelectorAll('object,embed,iframe').forEach((el) => {
    const u = el.src || el.data;
    if (u) add(abs(u));
  });
  // inline svg kept as markup, note count
  const inlineSvgCount = document.querySelectorAll('svg').length;

  // CSS url() refs
  const cssUrlRe = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
  const cssTextAll = cssRuleTexts.join('\n') + '\n' + inlineStyles.join('\n');
  for (const m of cssTextAll.matchAll(cssUrlRe)) add(abs(m[2]));

  // background images from computed styles + author CSS custom props
  const cssVars = {};
  const computed = new Map();
  const tokenSamples = [];
  const elements = Array.from(document.querySelectorAll('body *'));
  const limit = Math.min(elements.length, 6000);
  const props = [
    'color',
    'background-color',
    'border-color',
    'border-width',
    'border-radius',
    'box-shadow',
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'letter-spacing',
    'text-transform',
    'padding',
    'margin',
    'gap',
    'transition',
    'z-index',
    'display',
    'position',
  ];
  for (let i = 0; i < limit; i++) {
    const el = elements[i];
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    for (let j = 0; j < cs.length; j++) {
      const name = cs[j];
      if (name.startsWith('--')) {
        const val = cs.getPropertyValue(name).trim();
        if (val) (cssVars[name] ||= new Set()).add(val);
      }
    }
    const bg = cs.backgroundImage;
    if (bg && bg !== 'none') {
      for (const m of bg.matchAll(cssUrlRe)) add(abs(m[2]));
    }
    const sample = { tag: el.tagName.toLowerCase() };
    for (const p of props) sample[p] = cs.getPropertyValue(p);
    tokenSamples.push(sample);
  }
  const rootCs = getComputedStyle(document.documentElement);
  for (let j = 0; j < rootCs.length; j++) {
    const name = rootCs[j];
    if (name.startsWith('--')) {
      const val = rootCs.getPropertyValue(name).trim();
      if (val) (cssVars[name] ||= new Set()).add(val);
    }
  }

  // ---- copy
  const text = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  const take = (sel, max = 200) =>
    Array.from(document.querySelectorAll(sel))
      .map((el) => text(el))
      .filter(Boolean)
      .slice(0, max);
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
    .map((el) => ({ level: el.tagName.toLowerCase(), text: text(el) }))
    .filter((h) => h.text);
  const buttons = Array.from(document.querySelectorAll('button,[role="button"],a.button,.btn,[class*="button"]'))
    .map((el) => ({ text: text(el), tag: el.tagName.toLowerCase(), href: el.getAttribute('href') || null }))
    .filter((b) => b.text)
    .slice(0, 300);
  const links = Array.from(document.querySelectorAll('a[href]'))
    .map((el) => ({ text: text(el), href: abs(el.getAttribute('href')) }))
    .filter((l) => l.href && /^https?:\/\//i.test(l.href));
  const paragraphs = take('p', 300);
  const labels = take('label', 200);
  const placeholders = Array.from(document.querySelectorAll('[placeholder]'))
    .map((el) => el.getAttribute('placeholder'))
    .filter(Boolean);

  // ---- structure outline
  const outline = Array.from(
    document.querySelectorAll('header,nav,main,section,article,aside,footer,[class*="hero"],[class*="card"],[class*="grid"],[class*="container"]')
  )
    .slice(0, 400)
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classes: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 200),
      role: el.getAttribute('role'),
      heading: text(el.querySelector('h1,h2,h3') || { innerText: '' }).slice(0, 120),
      text: text(el).slice(0, 200),
    }));

  // ---- component inventory
  const tagCounts = {};
  const classCounts = {};
  for (const el of document.querySelectorAll('body *')) {
    tagCounts[el.tagName.toLowerCase()] = (tagCounts[el.tagName.toLowerCase()] || 0) + 1;
    const cls = typeof el.className === 'string' ? el.className : '';
    for (const c of cls.split(/\s+/)) if (c) classCounts[c] = (classCounts[c] || 0) + 1;
  }

  // ---- meta
  const metaTag = (name) =>
    document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ||
    document.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ||
    null;
  const meta = {
    title: document.title,
    description: metaTag('description'),
    ogTitle: metaTag('og:title'),
    ogDescription: metaTag('og:description'),
    ogImage: metaTag('og:image'),
    themeColor: metaTag('theme-color'),
    canonical: document.querySelector('link[rel="canonical"]')?.href || null,
    lang: document.documentElement.lang || null,
    url: location.href,
  };

  // ---- storage (keys only)
  const storageKeys = { localStorage: [], sessionStorage: [] };
  try {
    storageKeys.localStorage = Object.keys(localStorage);
    storageKeys.sessionStorage = Object.keys(sessionStorage);
  } catch {}

  return {
    url: location.href,
    html: document.documentElement.outerHTML,
    bodyHtml: document.body ? document.body.innerHTML : '',
    innerText: document.body ? document.body.innerText : '',
    meta,
    css: { ruleTexts: cssRuleTexts, inlineStyles, externalCss },
    fonts,
    assets: Array.from(assetUrls),
    inlineSvgCount,
    cssVars: Object.fromEntries(Object.entries(cssVars).map(([k, v]) => [k, Array.from(v)])),
    tokenSamples,
    copy: { headings, buttons, links, paragraphs, labels, placeholders },
    outline,
    componentCounts: { tags: tagCounts, classes: classCounts },
    storageKeys,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
  };
}

// ---------------------------------------------------------------- network recorder
function attachNetworkRecorder(page) {
  const rows = [];
  const onResponse = async (res) => {
    try {
      const req = res.request();
      const headers = res.headers();
      rows.push({
        url: res.url(),
        status: res.status(),
        method: req.method(),
        resourceType: req.resourceType(),
        mime: headers['content-type'] || '',
        cache: headers['cache-control'] || '',
      });
    } catch {}
  };
  page.on('response', onResponse);
  return { rows, detach: () => page.off('response', onResponse) };
}

// ---------------------------------------------------------------- capture one page
async function capturePage(page, url, label, opts = {}) {
  const network = attachNetworkRecorder(page);
  const consoleRows = [];
  const onConsole = (msg) => consoleRows.push({ type: msg.type(), text: msg.text().slice(0, 500) });
  page.on('console', onConsole);

  let navigation = null;
  try {
    navigation = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  } catch (err) {
    console.warn(`  ! navigation issue: ${err.message}`);
  }
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(args.settle);
  await autoScroll(page);
  await page.waitForTimeout(400);

  const data = await page.evaluate(collectPageData);

  const shotDesktop = path.join(SHOTS_DIR, `${label}-desktop.png`);
  await page.screenshot({ path: shotDesktop, fullPage: true }).catch(async () => {
    await page.screenshot({ path: shotDesktop, fullPage: false }).catch(() => {});
  });

  let shotMobile = null;
  if (opts.mobile) {
    try {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(1200);
      await autoScroll(page);
      await page.waitForTimeout(400);
      shotMobile = path.join(SHOTS_DIR, `${label}-mobile.png`);
      await page.screenshot({ path: shotMobile, fullPage: true }).catch(async () => {
        await page.screenshot({ path: shotMobile, fullPage: false }).catch(() => {});
      });
      await page.setViewportSize({ width: opts.viewport.width, height: opts.viewport.height });
    } catch {}
  }

  network.detach();
  page.off('console', onConsole);

  const pageDir = path.join(PAGES_DIR, label);
  await fs.mkdir(pageDir, { recursive: true });
  await fs.writeFile(path.join(pageDir, 'page.json'), JSON.stringify({
    ...data,
    html: undefined,
    bodyHtml: undefined,
    screenshots: { desktop: shotDesktop, mobile: shotMobile },
    navigation: navigation ? { status: navigation.status(), url: navigation.url() } : null,
    console: consoleRows.slice(0, 200),
    network: network.rows,
  }, null, 2));
  await fs.writeFile(path.join(pageDir, 'rendered.html'), data.html);
  await fs.writeFile(path.join(pageDir, 'body.html'), data.bodyHtml);
  await fs.writeFile(path.join(pageDir, 'text.txt'), data.innerText);
  const combinedCss = [
    '/* ==== external stylesheets ==== */',
    ...data.css.externalCss.map((u) => `/* ${u} */`),
    '/* ==== inline <style> ==== */',
    ...data.css.inlineStyles,
    '/* ==== document.styleSheets rules ==== */',
    ...data.css.ruleTexts,
  ].join('\n\n');
  await fs.writeFile(path.join(pageDir, 'styles.css'), combinedCss);

  return { data, pageDir, navStatus: navigation ? navigation.status() : null };
}

// ---------------------------------------------------------------- token aggregation
function bump(map, key, weight = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + weight);
}
function sorted(map, limit = 60) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function aggregateTokens(pages) {
  const colors = new Map();
  const bgs = new Map();
  const borders = new Map();
  const fontFamilies = new Map();
  const fontSizes = new Map();
  const fontWeights = new Map();
  const lineHeights = new Map();
  const letterSpacing = new Map();
  const radii = new Map();
  const shadows = new Map();
  const paddings = new Map();
  const margins = new Map();
  const gaps = new Map();
  const transitions = new Map();
  const zIndexes = new Map();
  const cssVars = {};

  for (const { data } of pages) {
    for (const s of data.tokenSamples) {
      bump(colors, s.color);
      bump(bgs, s['background-color']);
      bump(borders, s['border-color']);
      bump(fontFamilies, s['font-family']);
      bump(fontSizes, s['font-size']);
      bump(fontWeights, s['font-weight']);
      bump(lineHeights, s['line-height']);
      bump(letterSpacing, s['letter-spacing']);
      bump(radii, s['border-radius']);
      bump(shadows, s['box-shadow']);
      bump(paddings, s.padding);
      bump(margins, s.margin);
      bump(gaps, s.gap);
      bump(transitions, s.transition);
      bump(zIndexes, s['z-index']);
    }
    for (const [name, values] of Object.entries(data.cssVars)) {
      (cssVars[name] ||= new Set());
      values.forEach((v) => cssVars[name].add(v));
    }
  }

  const transparent = (v) => !v || v === 'rgba(0, 0, 0, 0)' || v === 'transparent';
  const clean = (m, limit, filter = () => true) =>
    sorted(new Map(Array.from(m).filter(([k]) => filter(k))), limit);

  return {
    colors: clean(colors, 60, (v) => !transparent(v)),
    backgrounds: clean(bgs, 60, (v) => !transparent(v)),
    borderColors: clean(borders, 40, (v) => !transparent(v)),
    typography: {
      fontFamilies: clean(fontFamilies, 20),
      fontSizes: clean(fontSizes, 30),
      fontWeights: clean(fontWeights, 15),
      lineHeights: clean(lineHeights, 20),
      letterSpacing: clean(letterSpacing, 20),
    },
    radii: clean(radii, 20, (v) => v !== '0px'),
    shadows: clean(shadows, 20, (v) => v !== 'none'),
    spacing: {
      paddings: clean(paddings, 30, (v) => v !== '0px'),
      margins: clean(margins, 30, (v) => v !== '0px'),
      gaps: clean(gaps, 20, (v) => v !== 'normal' && v !== '0px'),
    },
    transitions: clean(transitions, 20, (v) => v !== 'none' && v !== 'all 0s ease 0s'),
    zIndexes: clean(zIndexes, 20, (v) => v !== 'auto'),
    cssVariables: Object.fromEntries(
      Object.entries(cssVars).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, Array.from(v).sort()])
    ),
  };
}

// ---------------------------------------------------------------- asset download
async function downloadAssets(context, assetUrls, manifest) {
  let downloaded = 0;
  for (const url of assetUrls) {
    if (downloaded >= args.maxAssets) break;
    if (!isHttp(url)) continue;
    if (manifest[url]) continue;
    try {
      const res = await context.request.get(url, { timeout: 30000 });
      if (!res.ok()) {
        manifest[url] = { ok: false, status: res.status() };
        continue;
      }
      const buf = await res.body();
      if (!buf || buf.length === 0) {
        manifest[url] = { ok: false, reason: 'empty' };
        continue;
      }
      if (buf.length > args.maxAssetBytes) {
        manifest[url] = { ok: false, reason: 'too-large', bytes: buf.length };
        continue;
      }
      const name = `${slugify(url)}.${extFromUrl(url)}`;
      const dest = path.join(ASSETS_DIR, name);
      await fs.writeFile(dest, buf);
      manifest[url] = { ok: true, file: `assets/${name}`, bytes: buf.length, contentType: res.headers()['content-type'] || '' };
      downloaded++;
    } catch (err) {
      manifest[url] = { ok: false, reason: err.message.slice(0, 160) };
    }
  }
  return downloaded;
}

// ---------------------------------------------------------------- SPEC.md
function buildSpec(pages, tokens, manifest) {
  const primary = pages[0].data;
  const lines = [];
  const H = (t) => lines.push(`\n## ${t}\n`);
  const bullets = (arr, fmt = (x) => `- ${x}`) => arr.forEach((x) => lines.push(fmt(x)));

  lines.push(`# Frontend Spec — ${primary.meta.title || 'Untitled'}`);
  lines.push('');
  lines.push(`Source: ${primary.meta.url}`);
  lines.push(`Captured: ${new Date().toISOString()}`);
  lines.push(`Pages captured: ${pages.length}`);
  lines.push('');
  lines.push('Paste this file + the screenshots in `screenshots/` into Claude Design.');

  H('Meta');
  bullets([
    `Title: ${primary.meta.title || '—'}`,
    `Description: ${primary.meta.description || '—'}`,
    `Theme color: ${primary.meta.themeColor || '—'}`,
    `Language: ${primary.meta.lang || '—'}`,
    `OG image: ${primary.meta.ogImage || '—'}`,
  ]);

  H('Color system');
  lines.push('| Color | Uses |');
  lines.push('| --- | --- |');
  bullets(tokens.colors.slice(0, 30), (c) => `| \`${c.value}\` | ${c.count} |`);
  lines.push('\nBackgrounds:\n');
  bullets(tokens.backgrounds.slice(0, 20), (c) => `- \`${c.value}\` (${c.count})`);

  H('Typography');
  bullets(tokens.typography.fontFamilies.slice(0, 10), (x) => `- Family: \`${x.value}\` (${x.count})`);
  bullets(tokens.typography.fontSizes.slice(0, 16), (x) => `- Size: \`${x.value}\` (${x.count})`);
  bullets(tokens.typography.fontWeights.slice(0, 10), (x) => `- Weight: \`${x.value}\` (${x.count})`);
  bullets(tokens.typography.lineHeights.slice(0, 10), (x) => `- Line-height: \`${x.value}\` (${x.count})`);
  if (primary.fonts.length) {
    lines.push('\nLoaded fonts:\n');
    bullets(primary.fonts.slice(0, 30), (f) => `- ${f.family} ${f.weight} ${f.style} (${f.status})`);
  }

  H('Spacing, radius, shadow');
  bullets(tokens.spacing.paddings.slice(0, 15), (x) => `- Padding: \`${x.value}\` (${x.count})`);
  bullets(tokens.spacing.gaps.slice(0, 10), (x) => `- Gap: \`${x.value}\` (${x.count})`);
  bullets(tokens.radii.slice(0, 12), (x) => `- Radius: \`${x.value}\` (${x.count})`);
  bullets(tokens.shadows.slice(0, 12), (x) => `- Shadow: \`${x.value}\` (${x.count})`);

  if (Object.keys(tokens.cssVariables).length) {
    H('CSS custom properties');
    bullets(
      Object.entries(tokens.cssVariables).slice(0, 120),
      ([k, v]) => `- \`${k}: ${v.slice(0, 3).join(' | ')}\``
    );
  }

  H('Page structure');
  bullets(primary.outline.slice(0, 60), (s) =>
    `- <${s.tag}${s.id ? ` id="${s.id}"` : ''}> ${s.classes ? `class="${s.classes}"` : ''}${s.heading ? ` — “${s.heading}”` : ''}`
  );

  H('Component inventory (top classes)');
  bullets(
    sorted(new Map(Object.entries(primary.componentCounts.classes)), 40),
    (x) => `- \`.${x.value}\` (${x.count})`
  );

  H('Copy deck');
  lines.push('### Headings');
  bullets(primary.copy.headings.slice(0, 60), (h) => `- **${h.level.toUpperCase()}**: ${h.text}`);
  lines.push('\n### CTAs / buttons');
  bullets(primary.copy.buttons.slice(0, 60), (b) => `- ${b.text}`);
  if (primary.copy.placeholders.length) {
    lines.push('\n### Form placeholders');
    bullets(primary.copy.placeholders.slice(0, 40), (p) => `- ${p}`);
  }
  lines.push('\n### Navigation links');
  bullets(primary.copy.links.slice(0, 60), (l) => `- ${l.text || '(no text)'} → ${l.href}`);

  H('Routes');
  bullets(pages.map((p) => `- ${p.data.meta.url}`));

  H('Assets');
  const assetRows = Object.entries(manifest);
  lines.push(`${assetRows.filter(([, v]) => v.ok).length} downloaded / ${assetRows.length} discovered.`);
  bullets(
    assetRows.slice(0, 60),
    ([url, v]) => `- ${v.ok ? `\`${v.file}\`` : 'skip'} ← ${url}`
  );

  return lines.join('\n');
}

// ---------------------------------------------------------------- main
async function main() {
  console.log(`Connecting to ${args.cdp} ...`);
  const browser = await chromium.connectOverCDP(args.cdp);
  const context = browser.contexts()[0] || (await browser.newContext());
  const pages = context.pages();
  const page = pages[0] || (await context.newPage());

  const viewport = { width: 1440, height: 900 };
  await page.setViewportSize(viewport).catch(() => {});
  await ensureDirs();

  let targetUrl = args.url;
  try {
    targetUrl = await resolveTargetUrl(args.url);
  } catch (err) {
    console.warn(`  ! could not resolve share link: ${err.message}`);
  }
  const displayUrl = targetUrl.replace(/(__lovable_token=)[^&]+/, '$1<redacted>');
  const origin = new URL(targetUrl).origin;
  const manifestPath = path.join(OUT, 'assets-manifest.json');
  let manifest = {};
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch {}

  console.log(`Capturing ${displayUrl}`);
  const first = await capturePage(page, targetUrl, 'root', { mobile: args.mobile, viewport });
  const captured = [first];
  const seen = new Set([normalizeUrl(targetUrl, targetUrl)]);
  const allAssetUrls = new Set(first.data.assets);

  if (args.crawl) {
    const seenPaths = new Set([new URL(targetUrl).pathname.replace(/\/$/, '') || '/']);
    const queue = first.data.copy.links
      .map((l) => normalizeUrl(l.href, targetUrl))
      .filter((u) => u && u.startsWith(origin))
      .filter((u) => {
        const p = new URL(u).pathname.replace(/\/$/, '') || '/';
        if (seenPaths.has(p)) return false;
        seenPaths.add(p);
        return true;
      });
    let index = 1;
    while (queue.length && captured.length < args.maxPages) {
      const next = queue.shift();
      if (!next || seen.has(next)) continue;
      seen.add(next);
      console.log(`  [${captured.length + 1}/${args.maxPages}] ${next}`);
      try {
        const label = `${String(index++).padStart(2, '0')}-${routeLabel(next)}`;
        const result = await capturePage(page, next, label, { mobile: args.mobile, viewport });
        const is404 = result.data.copy.headings.some((h) => h.text.trim() === '404');
        if (is404) {
          console.warn(`  ! 404 route, skipping: ${next}`);
          await fs.rm(result.pageDir, { recursive: true, force: true }).catch(() => {});
          continue;
        }
        captured.push(result);
        result.data.assets.forEach((a) => allAssetUrls.add(a));
        for (const l of result.data.copy.links) {
          const u = normalizeUrl(l.href, targetUrl);
          if (!u || !u.startsWith(origin)) continue;
          const p = new URL(u).pathname.replace(/\/$/, '') || '/';
          if (!seenPaths.has(p)) {
            seenPaths.add(p);
            queue.push(u);
          }
        }
      } catch (err) {
        console.warn(`  ! failed ${next}: ${err.message}`);
      }
    }
  }

  const tokens = aggregateTokens(captured);
  const downloaded = await downloadAssets(context, allAssetUrls, manifest);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  const spec = buildSpec(captured, tokens, manifest);
  await fs.writeFile(path.join(OUT, 'SPEC.md'), spec);
  await fs.writeFile(path.join(OUT, 'design-tokens.json'), JSON.stringify(tokens, null, 2));
  await fs.writeFile(path.join(OUT, 'capture-meta.json'), JSON.stringify({
    source: displayUrl,
    origin,
    capturedAt: new Date().toISOString(),
    pages: captured.map((p) => p.data.meta.url),
    viewport,
    assetsDiscovered: allAssetUrls.size,
    assetsDownloaded: downloaded,
    node: process.version,
  }, null, 2));

  console.log('');
  console.log('Done.');
  console.log(`  pages     : ${captured.length}`);
  console.log(`  assets    : ${downloaded} downloaded / ${allAssetUrls.size} discovered`);
  console.log(`  output    : ${OUT}`);
  console.log(`  spec      : ${path.join(OUT, 'SPEC.md')}`);
  console.log(`  tokens    : ${path.join(OUT, 'design-tokens.json')}`);
  console.log(`  shots     : ${SHOTS_DIR}`);

  // Deliberately do not browser.close(): it would close the user's Chrome.
  process.exit(0);
}

main().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
