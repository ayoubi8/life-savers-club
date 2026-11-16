// Club details (logo, contact, socials, page texts) are edited from /admin/pages
// and read through src/lib/site-content.

export type Locale = "fr" | "en";
export type L10n = { fr: string; en: string };
export const pick = (v: L10n, locale: string) => (locale === "en" ? v.en : v.fr);
