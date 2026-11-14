import {
  DEFAULT_SETTINGS,
  uid,
  type FieldType,
  type FormField,
  type FormPage,
  type FormSchema,
  type FormSettings,
} from "./schema";

export const TEMPLATE_KEYS = ["blank", "contact", "membership", "event", "feedback"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export function isTemplateKey(value: string): value is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(value);
}

export type BuiltTemplate = {
  title: string;
  kind: "generic" | "membership" | "event_registration" | "feedback";
  schema: FormSchema;
  settings: FormSettings;
};

type Extra = Partial<Omit<FormField, "id" | "type" | "label">>;

function field(type: FieldType, label: string, extra: Extra = {}): FormField {
  return { id: uid("q"), type, label, ...extra };
}

function options(...labels: string[]) {
  return labels.map((label) => ({ id: uid("o"), label }));
}

function page(title: string, fields: FormField[]): FormPage {
  return { id: uid("p"), title, description: "", fields };
}

/** Ready-made forms. Questions are created in the leader's language (fr/en). */
export function buildTemplate(key: TemplateKey, locale: string): BuiltTemplate {
  const en = locale === "en";
  const year = new Date().getFullYear();

  // Reused identity questions, so the respondent name/email mapping can point at them.
  const name = field("short_text", en ? "Full name" : "Nom complet", { required: true });
  const email = field("email", en ? "Email address" : "Adresse e-mail", { required: true });
  const phone = field("phone", en ? "Phone number" : "Téléphone");

  const withMapping = (settings: Partial<FormSettings>): FormSettings => ({
    ...DEFAULT_SETTINGS,
    respondentNameField: name.id,
    respondentEmailField: email.id,
    ...settings,
  });

  switch (key) {
    case "contact":
      return {
        title: en ? "Contact us" : "Contactez-nous",
        kind: "generic",
        schema: { version: 1, pages: [page("", [name, email, field("long_text", en ? "Your message" : "Votre message", { required: true })])] },
        settings: withMapping({}),
      };

    case "membership":
      return {
        title: en ? `Membership ${year}` : `Adhésion ${year}`,
        kind: "membership",
        schema: {
          version: 1,
          pages: [
            page(en ? "About you" : "Vous", [
              name,
              email,
              phone,
              field("short_text", en ? "University / institution" : "Université / établissement"),
              field("dropdown", en ? "Year of study" : "Année d'étude", {
                options: options(
                  en ? "1st year" : "1ère année",
                  en ? "2nd year" : "2ème année",
                  en ? "3rd year" : "3ème année",
                  en ? "4th year" : "4ème année",
                  en ? "5th year" : "5ème année",
                  en ? "6th year" : "6ème année",
                  en ? "Intern / resident" : "Interne / résident",
                  en ? "Other" : "Autre",
                ),
              }),
            ]),
            page(en ? "Your motivation" : "Votre motivation", [
              field("long_text", en ? "Why do you want to join Life Savers?" : "Pourquoi voulez-vous rejoindre Life Savers ?", { required: true }),
              field("long_text", en ? "Skills and experience" : "Compétences et expériences"),
              field("checkboxes", en ? "Availability" : "Disponibilités", {
                options: options(
                  en ? "Weekdays" : "En semaine",
                  en ? "Weekends" : "Week-ends",
                  en ? "Evenings" : "Soirées",
                  en ? "Holidays" : "Vacances",
                ),
              }),
              field("consent", en ? "I agree that the club may use my data to contact me" : "J'accepte que le club utilise mes données pour me contacter", { required: true }),
            ]),
          ],
        },
        settings: withMapping({ onePerEmail: true }),
      };

    case "event":
      return {
        title: en ? "Event registration" : "Inscription à l'événement",
        kind: "event_registration",
        schema: {
          version: 1,
          pages: [
            page("", [
              field("heading", en ? "Register for the event" : "Inscrivez-vous à l'événement"),
              name,
              email,
              phone,
              field("yes_no", en ? "Will you attend?" : "Serez-vous présent(e) ?", { required: true }),
              field("number", en ? "Number of guests" : "Nombre d'accompagnants", { min: 0, max: 5 }),
              field("short_text", en ? "Allergies / dietary needs" : "Allergies / régime alimentaire"),
              field("long_text", en ? "Question or comment" : "Question ou remarque"),
            ]),
          ],
        },
        settings: withMapping({ onePerEmail: true }),
      };

    case "feedback": {
      const feedbackEmail = field("email", en ? "Your email (optional)" : "Votre e-mail (facultatif)");
      return {
        title: en ? "Your feedback" : "Votre avis",
        kind: "feedback",
        schema: {
          version: 1,
          pages: [
            page("", [
              field("nps", en ? "How likely are you to recommend our events?" : "Recommanderiez-vous nos événements ?", { required: true }),
              field("rating", en ? "Overall satisfaction" : "Satisfaction globale", { required: true, max: 5 }),
              field("long_text", en ? "What did you enjoy?" : "Ce que vous avez aimé"),
              field("long_text", en ? "What can we improve?" : "Ce que nous pouvons améliorer"),
              field("yes_no", en ? "May we contact you about your feedback?" : "Pouvons-nous vous recontacter ?"),
              feedbackEmail,
            ]),
          ],
        },
        settings: { ...DEFAULT_SETTINGS, respondentEmailField: feedbackEmail.id },
      };
    }

    default:
      return {
        title: "",
        kind: "generic",
        schema: { version: 1, pages: [page("", [])] },
        settings: { ...DEFAULT_SETTINGS },
      };
  }
}
