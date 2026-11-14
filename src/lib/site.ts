// Placeholder club details. Replace with real values (later editable from the admin settings).
export const site = {
  name: "Life Savers",
  email: "contact@lifesavers.club",
  phone: "+213 000 00 00 00",
  address: "Faculté de Médecine",
  socials: {
    facebook: "https://facebook.com/",
    instagram: "https://instagram.com/",
    linkedin: "https://linkedin.com/",
  },
};

export type Locale = "fr" | "en";
export type L10n = { fr: string; en: string };
export const pick = (v: L10n, locale: string) => (locale === "en" ? v.en : v.fr);
