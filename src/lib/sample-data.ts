import type { L10n } from "./site";

// SAMPLE CONTENT: replaced by Supabase data once the events/team managers exist.
export const timeline: { year: string; title: L10n; text: L10n }[] = [
  { year: "2018", title: { fr: "Naissance du club", en: "Club founded" }, text: { fr: "Life Savers voit le jour avec une poignée d'étudiants.", en: "Life Savers starts with a handful of students." } },
  { year: "2019", title: { fr: "Première campagne", en: "First campaign" }, text: { fr: "Première campagne de sensibilisation à la santé.", en: "Our first health-awareness campaign." } },
  { year: "2020", title: { fr: "100 membres", en: "100 members" }, text: { fr: "Le club dépasse les 100 membres actifs.", en: "The club passes 100 active members." } },
  { year: "2022", title: { fr: "Reconnaissance nationale", en: "National recognition" }, text: { fr: "Récompensé parmi les meilleurs clubs scientifiques.", en: "Awarded among the best scientific clubs." } },
  { year: "2024", title: { fr: "Collaborations", en: "Collaborations" }, text: { fr: "Partenariats avec des institutions de santé.", en: "Partnerships with health institutions." } },
];

export const stats: { value: string; label: L10n }[] = [
  { value: "100+", label: { fr: "Membres actifs", en: "Active members" } },
  { value: "40+", label: { fr: "Événements", en: "Events" } },
  { value: "6", label: { fr: "Années d'impact", en: "Years of impact" } },
  { value: "5k+", label: { fr: "Personnes sensibilisées", en: "People reached" } },
];

export const events: { slug: string; date: string; place: string; tag: L10n; title: L10n; text: L10n; past: boolean }[] = [
  { slug: "bls-workshop", date: "2026-12-12", place: "Amphi A", tag: { fr: "Formation", en: "Training" }, title: { fr: "Atelier premiers secours (BLS)", en: "First-aid workshop (BLS)" }, text: { fr: "Apprenez les gestes qui sauvent : massage cardiaque, PLS, défibrillateur.", en: "Learn life-saving skills: CPR, recovery position, defibrillator." }, past: false },
  { slug: "blood-drive", date: "2026-12-20", place: "Campus", tag: { fr: "Solidarité", en: "Community" }, title: { fr: "Journée de don de sang", en: "Blood donation day" }, text: { fr: "Une goutte de sang, une vie sauvée. Rejoignez-nous.", en: "One drop of blood, one life saved. Join us." }, past: false },
  { slug: "health-caravan", date: "2026-04-18", place: "Mostaganem", tag: { fr: "Sensibilisation", en: "Awareness" }, title: { fr: "Caravane de santé", en: "Health caravan" }, text: { fr: "Dépistage et conseils de prévention pour le grand public.", en: "Screening and prevention advice for the public." }, past: true },
  { slug: "scientific-day", date: "2026-02-07", place: "Faculté", tag: { fr: "Science", en: "Science" }, title: { fr: "Journée scientifique", en: "Scientific day" }, text: { fr: "Conférences, posters et échanges avec des professionnels.", en: "Talks, posters and exchanges with professionals." }, past: true },
];

export const team: { name: string; role: L10n; color: "pink" | "blue" | "green" }[] = [
  { name: "Nom Prénom", role: { fr: "Président(e)", en: "President" }, color: "pink" },
  { name: "Nom Prénom", role: { fr: "Vice-président(e)", en: "Vice president" }, color: "blue" },
  { name: "Nom Prénom", role: { fr: "Responsable événements", en: "Events lead" }, color: "green" },
  { name: "Nom Prénom", role: { fr: "Responsable communication", en: "Communication lead" }, color: "pink" },
  { name: "Nom Prénom", role: { fr: "Responsable scientifique", en: "Scientific lead" }, color: "blue" },
  { name: "Nom Prénom", role: { fr: "Trésorier(ère)", en: "Treasurer" }, color: "green" },
];

export const testimonials: { name: string; role: L10n; quote: L10n }[] = [
  { name: "Membre", role: { fr: "Étudiant(e) en médecine", en: "Medical student" }, quote: { fr: "Un environnement collaboratif où l'on apprend en aidant les autres.", en: "A collaborative place where you learn by helping others." } },
  { name: "Membre", role: { fr: "Étudiant(e) en pharmacie", en: "Pharmacy student" }, quote: { fr: "Life Savers m'a donné confiance et de vraies compétences de terrain.", en: "Life Savers gave me confidence and real field skills." } },
  { name: "Membre", role: { fr: "Étudiant(e) dentaire", en: "Dental student" }, quote: { fr: "Des événements utiles, une équipe soudée, beaucoup d'énergie.", en: "Useful events, a tight team, lots of energy." } },
];

export const sponsors = ["Sponsor 1", "Sponsor 2", "Sponsor 3", "Sponsor 4", "Sponsor 5", "Sponsor 6"];
