import type { L10n } from "@/lib/site";
import { BRAND_COLORS, isSiteIcon, type BrandColor, type SiteIcon } from "./icons";

/*
 * Admin-editable content of the public site, stored in `site_settings`:
 *   site_general → header + footer (logo, name, nav labels, contact, socials)
 *   home_page    → every text and image of the home page
 *   sponsors_page → sponsors page texts and sponsor logos
 * Parsers never throw: anything missing or invalid falls back to the defaults below,
 * so a broken row can never blank the site.
 */

export const SITE_KEYS = { general: "site_general", home: "home_page", sponsors: "sponsors_page" } as const;

export type SiteImage = { url: string; alt: L10n };
export type Social = { id: string; label: string; url: string };
export type Stat = { id: string; value: string; label: L10n };
export type ValueCard = { id: string; icon: SiteIcon; color: BrandColor; title: L10n; text: L10n };
export type Milestone = { id: string; year: string; icon: SiteIcon; color: BrandColor; title: L10n; text: L10n };
export type Testimonial = { id: string; name: string; role: L10n; quote: L10n; photo: SiteImage | null };
export type Sponsor = { id: string; name: string; url: string; logo: SiteImage | null };

export type SiteGeneral = {
  logo: SiteImage;
  nameStart: string;
  nameEnd: string;
  nav: { home: L10n; events: L10n; team: L10n; sponsors: L10n; join: L10n };
  footer: { about: L10n; tagline: L10n; contactTitle: L10n; followTitle: L10n; login: L10n };
  email: string;
  phone: string;
  address: L10n;
  socials: Social[];
};

export type HomePage = {
  hero: { eyebrow: L10n; title1: L10n; title2: L10n; subtitle: L10n; ctaJoin: L10n; ctaEvents: L10n; image: SiteImage; badge1: L10n; badge2: L10n };
  stats: Stat[];
  about: { title: L10n; p1: L10n; p2: L10n; cta: L10n };
  values: ValueCard[];
  journey: { title: L10n; subtitle: L10n; now: L10n; milestones: Milestone[] };
  events: { nextTitle: L10n; featuredTitle: L10n; allLink: L10n };
  testimonials: { title: L10n; items: Testimonial[] };
  contact: { title: L10n; text: L10n; cta: L10n };
};

export type SponsorsPage = {
  hero: { title: L10n; subtitle: L10n };
  sponsors: Sponsor[];
  cta: { title: L10n; text: L10n; button: L10n };
};

export const LIMITS = { short: 120, long: 600, stats: 8, values: 6, milestones: 12, testimonials: 12, sponsors: 60, socials: 8 } as const;

const l = (fr: string, en: string): L10n => ({ fr, en });
const LOGO: SiteImage = { url: "/brand/logo.png", alt: l("Life Savers", "Life Savers") };

// ───────── Defaults (the content the site shipped with) ─────────

export const DEFAULT_GENERAL: SiteGeneral = {
  logo: LOGO,
  nameStart: "Life",
  nameEnd: "Savers",
  nav: {
    home: l("Accueil", "Home"),
    events: l("Événements", "Events"),
    team: l("Équipe", "Team"),
    sponsors: l("Sponsors", "Sponsors"),
    join: l("Rejoindre", "Join us"),
  },
  footer: {
    about: l(
      "Un club scientifique étudiant dédié à la santé, à la formation médicale et à l'entraide.",
      "A student scientific club dedicated to health, medical education and solidarity.",
    ),
    tagline: l("Spread health, spread hope", "Spread health, spread hope"),
    contactTitle: l("Contact", "Contact"),
    followTitle: l("Suivez-nous", "Follow us"),
    login: l("Espace leaders", "Leaders area"),
  },
  email: "contact@lifesavers.club",
  phone: "+213 000 00 00 00",
  address: l("Faculté de Médecine", "Faculty of Medicine"),
  socials: [
    { id: "facebook", label: "Facebook", url: "https://facebook.com/" },
    { id: "instagram", label: "Instagram", url: "https://instagram.com/" },
    { id: "linkedin", label: "LinkedIn", url: "https://linkedin.com/" },
  ],
};

export const DEFAULT_HOME: HomePage = {
  hero: {
    eyebrow: l("Club scientifique étudiant", "Student scientific club"),
    title1: l("Partageons la santé,", "Spread health,"),
    title2: l("partageons l'espoir.", "spread hope."),
    subtitle: l(
      "Formations aux premiers secours, campagnes de sensibilisation et événements scientifiques, portés par des étudiants engagés.",
      "First-aid training, awareness campaigns and scientific events, driven by committed students.",
    ),
    ctaJoin: l("Rejoindre le club", "Join the club"),
    ctaEvents: l("Voir les événements", "See events"),
    image: LOGO,
    badge1: l("❤️ 100+ Membres actifs", "❤️ 100+ Active members"),
    badge2: l("🩺 40+ Événements", "🩺 40+ Events"),
  },
  stats: [
    { id: "s1", value: "100+", label: l("Membres actifs", "Active members") },
    { id: "s2", value: "40+", label: l("Événements", "Events") },
    { id: "s3", value: "6", label: l("Années d'impact", "Years of impact") },
    { id: "s4", value: "5k+", label: l("Personnes sensibilisées", "People reached") },
  ],
  about: {
    title: l("À propos de Life Savers", "About Life Savers"),
    p1: l(
      "Life Savers est un club scientifique dédié à l'amélioration de la santé et à la formation des futurs professionnels de santé.",
      "Life Savers is a scientific club dedicated to improving health and training the next generation of healthcare professionals.",
    ),
    p2: l(
      "Notre mission : créer un espace collaboratif où le savoir se partage et où chaque membre peut avoir un impact réel sur la société.",
      "Our mission: build a collaborative space where knowledge is shared and every member can make a real impact on society.",
    ),
    cta: l("Rencontrer l'équipe", "Meet the team"),
  },
  values: [
    { id: "v1", icon: "book-open", color: "blue", title: l("Apprendre", "Learn"), text: l("Ateliers, conférences et formations pratiques.", "Workshops, talks and hands-on training.") },
    { id: "v2", icon: "heart-handshake", color: "pink", title: l("Servir", "Serve"), text: l("Campagnes de santé et actions solidaires.", "Health campaigns and community actions.") },
    { id: "v3", icon: "network", color: "green", title: l("Connecter", "Connect"), text: l("Un réseau d'étudiants et de professionnels.", "A network of students and professionals.") },
  ],
  journey: {
    title: l("Notre parcours", "Our journey"),
    subtitle: l("Six ans à former, sensibiliser et connecter.", "Six years of training, raising awareness and connecting."),
    now: l("Aujourd'hui : 100+ membres actifs · 40+ événements", "Today: 100+ active members · 40+ events"),
    milestones: [
      { id: "m1", year: "2018", icon: "sprout", color: "blue", title: l("Naissance du club", "Club founded"), text: l("Life Savers voit le jour avec une poignée d'étudiants.", "Life Savers starts with a handful of students.") },
      { id: "m2", year: "2019", icon: "megaphone", color: "pink", title: l("Première campagne", "First campaign"), text: l("Première campagne de sensibilisation à la santé.", "Our first health-awareness campaign.") },
      { id: "m3", year: "2020", icon: "users", color: "green", title: l("100 membres", "100 members"), text: l("Le club dépasse les 100 membres actifs.", "The club passes 100 active members.") },
      { id: "m4", year: "2022", icon: "award", color: "blue", title: l("Reconnaissance nationale", "National recognition"), text: l("Récompensé parmi les meilleurs clubs scientifiques.", "Awarded among the best scientific clubs.") },
      { id: "m5", year: "2024", icon: "handshake", color: "pink", title: l("Collaborations", "Collaborations"), text: l("Partenariats avec des institutions de santé.", "Partnerships with health institutions.") },
    ],
  },
  events: {
    nextTitle: l("Prochains événements", "Upcoming events"),
    featuredTitle: l("Nos événements à la une", "Featured events"),
    allLink: l("Tous les événements", "All events"),
  },
  testimonials: {
    title: l("Ce que disent nos membres", "What our members say"),
    items: [
      { id: "t1", name: "Membre", role: l("Étudiant(e) en médecine", "Medical student"), quote: l("Un environnement collaboratif où l'on apprend en aidant les autres.", "A collaborative place where you learn by helping others."), photo: null },
      { id: "t2", name: "Membre", role: l("Étudiant(e) en pharmacie", "Pharmacy student"), quote: l("Life Savers m'a donné confiance et de vraies compétences de terrain.", "Life Savers gave me confidence and real field skills."), photo: null },
      { id: "t3", name: "Membre", role: l("Étudiant(e) dentaire", "Dental student"), quote: l("Des événements utiles, une équipe soudée, beaucoup d'énergie.", "Useful events, a tight team, lots of energy."), photo: null },
    ],
  },
  contact: {
    title: l("Une question ? Parlons-en.", "Got a question? Let's talk."),
    text: l(
      "Envie de rejoindre le club, de devenir partenaire ou d'en savoir plus ? Écrivez-nous.",
      "Want to join, partner with us or learn more? Write to us.",
    ),
    cta: l("Nous contacter", "Contact us"),
  },
};

export const DEFAULT_SPONSORS: SponsorsPage = {
  hero: {
    title: l("Nos sponsors", "Our sponsors"),
    subtitle: l("Merci à celles et ceux qui soutiennent notre mission.", "Thank you to everyone who supports our mission."),
  },
  sponsors: [1, 2, 3, 4, 5, 6].map((n) => ({ id: `sp${n}`, name: `Sponsor ${n}`, url: "", logo: null })),
  cta: {
    title: l("Soutenez notre mission", "Support our mission"),
    text: l("Devenez partenaire et contribuez à sauver des vies.", "Become a partner and help save lives."),
    button: l("Devenir sponsor", "Become a sponsor"),
  },
};

// ───────── Parsers ─────────

type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj => (value && typeof value === "object" && !Array.isArray(value) ? (value as Obj) : {});

function str(value: unknown, fallback: string, max: number = LIMITS.long): string {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

function l10n(value: unknown, fallback: L10n, max: number = LIMITS.long): L10n {
  const v = obj(value);
  return { fr: str(v.fr, fallback.fr, max), en: str(v.en, fallback.en, max) };
}

const EMPTY: L10n = { fr: "", en: "" };

/** Public image URLs we can render with next/image: local files or our Supabase `event-media` bucket. */
export function isAllowedImageUrl(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("..")) return true;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (base && url.startsWith(`${base.replace(/\/$/, "")}/storage/v1/object/public/event-media/site/`)) return true;
  return false;
}

/** Links typed by editors: only http(s), or empty. */
export function cleanUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, 500);
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function image(value: unknown, fallback: SiteImage): SiteImage;
function image(value: unknown, fallback: null): SiteImage | null;
function image(value: unknown, fallback: SiteImage | null): SiteImage | null {
  if (value === null) return null;
  const v = obj(value);
  if (typeof v.url !== "string" || !isAllowedImageUrl(v.url)) return fallback;
  return { url: v.url, alt: l10n(v.alt, EMPTY, LIMITS.short) };
}

const icon = (value: unknown, fallback: SiteIcon): SiteIcon => (isSiteIcon(value) ? value : fallback);
const color = (value: unknown, fallback: BrandColor): BrandColor =>
  BRAND_COLORS.includes(value as BrandColor) ? (value as BrandColor) : fallback;

/** A stored list replaces the default list (it may be empty); each item gets a unique id. */
function list<T extends { id: string }>(value: unknown, fallback: T[], max: number, item: (raw: Obj, index: number) => T): T[] {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set<string>();
  return value.slice(0, max).map((raw, index) => {
    const parsed = item(obj(raw), index);
    let id = /^[\w-]{1,64}$/.test(parsed.id) ? parsed.id : `item-${index}`;
    while (seen.has(id)) id = `${id}-${index}`;
    seen.add(id);
    return { ...parsed, id };
  });
}

const id = (raw: Obj) => (typeof raw.id === "string" ? raw.id : "");

export function parseSiteGeneral(value: unknown): SiteGeneral {
  const v = obj(value);
  const d = DEFAULT_GENERAL;
  const nav = obj(v.nav);
  const footer = obj(v.footer);
  const s = LIMITS.short;
  return {
    logo: image(v.logo, d.logo),
    nameStart: str(v.nameStart, d.nameStart, 40),
    nameEnd: str(v.nameEnd, d.nameEnd, 40),
    nav: {
      home: l10n(nav.home, d.nav.home, 40),
      events: l10n(nav.events, d.nav.events, 40),
      team: l10n(nav.team, d.nav.team, 40),
      sponsors: l10n(nav.sponsors, d.nav.sponsors, 40),
      join: l10n(nav.join, d.nav.join, 40),
    },
    footer: {
      about: l10n(footer.about, d.footer.about),
      tagline: l10n(footer.tagline, d.footer.tagline, s),
      contactTitle: l10n(footer.contactTitle, d.footer.contactTitle, s),
      followTitle: l10n(footer.followTitle, d.footer.followTitle, s),
      login: l10n(footer.login, d.footer.login, s),
    },
    email: str(v.email, d.email, s).trim(),
    phone: str(v.phone, d.phone, s),
    address: l10n(v.address, d.address, 200),
    socials: list(v.socials, d.socials, LIMITS.socials, (raw) => ({
      id: id(raw),
      label: str(raw.label, "", 40),
      url: cleanUrl(raw.url),
    })),
  };
}

export function parseHomePage(value: unknown): HomePage {
  const v = obj(value);
  const d = DEFAULT_HOME;
  const s = LIMITS.short;
  const hero = obj(v.hero);
  const about = obj(v.about);
  const journey = obj(v.journey);
  const events = obj(v.events);
  const testimonials = obj(v.testimonials);
  const contact = obj(v.contact);
  return {
    hero: {
      eyebrow: l10n(hero.eyebrow, d.hero.eyebrow, s),
      title1: l10n(hero.title1, d.hero.title1, s),
      title2: l10n(hero.title2, d.hero.title2, s),
      subtitle: l10n(hero.subtitle, d.hero.subtitle),
      ctaJoin: l10n(hero.ctaJoin, d.hero.ctaJoin, 60),
      ctaEvents: l10n(hero.ctaEvents, d.hero.ctaEvents, 60),
      image: image(hero.image, d.hero.image),
      badge1: l10n(hero.badge1, d.hero.badge1, 60),
      badge2: l10n(hero.badge2, d.hero.badge2, 60),
    },
    stats: list(v.stats, d.stats, LIMITS.stats, (raw) => ({
      id: id(raw),
      value: str(raw.value, "", 20),
      label: l10n(raw.label, EMPTY, 60),
    })),
    about: {
      title: l10n(about.title, d.about.title, s),
      p1: l10n(about.p1, d.about.p1),
      p2: l10n(about.p2, d.about.p2),
      cta: l10n(about.cta, d.about.cta, 60),
    },
    values: list(v.values, d.values, LIMITS.values, (raw) => ({
      id: id(raw),
      icon: icon(raw.icon, "heart"),
      color: color(raw.color, "blue"),
      title: l10n(raw.title, EMPTY, 60),
      text: l10n(raw.text, EMPTY, 200),
    })),
    journey: {
      title: l10n(journey.title, d.journey.title, s),
      subtitle: l10n(journey.subtitle, d.journey.subtitle, 200),
      now: l10n(journey.now, d.journey.now, 200),
      milestones: list(journey.milestones, d.journey.milestones, LIMITS.milestones, (raw) => ({
        id: id(raw),
        year: str(raw.year, "", 12),
        icon: icon(raw.icon, "star"),
        color: color(raw.color, "blue"),
        title: l10n(raw.title, EMPTY, 80),
        text: l10n(raw.text, EMPTY, 240),
      })),
    },
    events: {
      nextTitle: l10n(events.nextTitle, d.events.nextTitle, s),
      featuredTitle: l10n(events.featuredTitle, d.events.featuredTitle, s),
      allLink: l10n(events.allLink, d.events.allLink, 60),
    },
    testimonials: {
      title: l10n(testimonials.title, d.testimonials.title, s),
      items: list(testimonials.items, d.testimonials.items, LIMITS.testimonials, (raw) => ({
        id: id(raw),
        name: str(raw.name, "", 80),
        role: l10n(raw.role, EMPTY, 80),
        quote: l10n(raw.quote, EMPTY, 400),
        photo: image(raw.photo ?? null, null),
      })),
    },
    contact: {
      title: l10n(contact.title, d.contact.title, s),
      text: l10n(contact.text, d.contact.text),
      cta: l10n(contact.cta, d.contact.cta, 60),
    },
  };
}

export function parseSponsorsPage(value: unknown): SponsorsPage {
  const v = obj(value);
  const d = DEFAULT_SPONSORS;
  const hero = obj(v.hero);
  const cta = obj(v.cta);
  return {
    hero: { title: l10n(hero.title, d.hero.title, LIMITS.short), subtitle: l10n(hero.subtitle, d.hero.subtitle) },
    sponsors: list(v.sponsors, d.sponsors, LIMITS.sponsors, (raw) => ({
      id: id(raw),
      name: str(raw.name, "", 80),
      url: cleanUrl(raw.url),
      logo: image(raw.logo ?? null, null),
    })),
    cta: {
      title: l10n(cta.title, d.cta.title, LIMITS.short),
      text: l10n(cta.text, d.cta.text),
      button: l10n(cta.button, d.cta.button, 60),
    },
  };
}

/** Text in the visitor's language; falls back to the other language when left empty. */
export function tx(value: L10n, locale: string): string {
  return locale === "en" ? value.en || value.fr : value.fr || value.en;
}
