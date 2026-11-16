import type { L10n } from "./site";

// SAMPLE CONTENT: replaced by Supabase data once the team manager exists.
export const team: { name: string; role: L10n; color: "pink" | "blue" | "green" }[] = [
  { name: "Nom Prénom", role: { fr: "Président(e)", en: "President" }, color: "pink" },
  { name: "Nom Prénom", role: { fr: "Vice-président(e)", en: "Vice president" }, color: "blue" },
  { name: "Nom Prénom", role: { fr: "Responsable événements", en: "Events lead" }, color: "green" },
  { name: "Nom Prénom", role: { fr: "Responsable communication", en: "Communication lead" }, color: "pink" },
  { name: "Nom Prénom", role: { fr: "Responsable scientifique", en: "Scientific lead" }, color: "blue" },
  { name: "Nom Prénom", role: { fr: "Trésorier(ère)", en: "Treasurer" }, color: "green" },
];
