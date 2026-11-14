import { z } from "zod";

export const FIELD_TYPES = [
  "short_text",
  "long_text",
  "email",
  "phone",
  "number",
  "url",
  "date",
  "time",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "yes_no",
  "rating",
  "nps",
  "consent",
  "file",
  "statement",
  "heading",
  "divider",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const CHOICE_TYPES: FieldType[] = ["multiple_choice", "checkboxes", "dropdown"];

/** Blocks that show content but collect no answer. */
export const DISPLAY_TYPES: FieldType[] = ["statement", "heading", "divider"];

/** Types that accept a placeholder. */
export const TEXT_LIKE_TYPES: FieldType[] = ["short_text", "long_text", "email", "phone", "number", "url"];

export type FieldOption = { id: string; label: string };

export type FormField = {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
  min?: number;
  max?: number;
  maxLength?: number;
};

export type FormPage = {
  id: string;
  title?: string;
  description?: string;
  fields: FormField[];
};

export type FormSchema = {
  version: 1;
  pages: FormPage[];
};

export type FormSettings = {
  submitLabel: string;
  successTitle: string;
  successMessage: string;
  redirectUrl: string;
  /** Question whose answer becomes the respondent's name / email in lists and members. */
  respondentNameField: string;
  respondentEmailField: string;
  /** Enforced by a database trigger. */
  maxResponses: number | null;
  onePerEmail: boolean;
  /** "page": one screen per page. "question": one question per screen. */
  layout: "page" | "question";
};

export const DEFAULT_SETTINGS: FormSettings = {
  submitLabel: "",
  successTitle: "",
  successMessage: "",
  redirectUrl: "",
  respondentNameField: "",
  respondentEmailField: "",
  maxResponses: null,
  onePerEmail: false,
  layout: "page",
};

const optionSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().max(300),
});

const fieldSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(FIELD_TYPES),
  label: z.string().max(300).default(""),
  description: z.string().max(2000).optional(),
  placeholder: z.string().max(300).optional(),
  required: z.boolean().optional(),
  options: z.array(optionSchema).max(100).optional(),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  maxLength: z.number().int().positive().max(20000).optional(),
});

const pageSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().max(300).optional(),
  description: z.string().max(2000).optional(),
  fields: z.array(fieldSchema).max(200),
});

const schemaSchema = z.object({
  version: z.literal(1).default(1),
  pages: z.array(pageSchema).max(50),
});

export function uid(prefix = "f"): string {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${prefix}_${raw}`;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function defaultField(type: FieldType): FormField {
  const base: FormField = { id: uid("q"), type, label: "" };
  switch (type) {
    case "short_text":
      return { ...base, label: "Short answer" };
    case "long_text":
      return { ...base, label: "Long answer" };
    case "email":
      return { ...base, label: "Email" };
    case "phone":
      return { ...base, label: "Phone" };
    case "number":
      return { ...base, label: "Number" };
    case "url":
      return { ...base, label: "Website" };
    case "date":
      return { ...base, label: "Date" };
    case "time":
      return { ...base, label: "Time" };
    case "yes_no":
      return { ...base, label: "Yes or no?" };
    case "nps":
      return { ...base, label: "How likely are you to recommend us?" };
    case "consent":
      return { ...base, label: "I agree", required: true };
    case "heading":
      return { ...base, label: "Heading" };
    case "divider":
      return { ...base, label: "" };
    case "multiple_choice":
    case "checkboxes":
      return {
        ...base,
        label: type === "checkboxes" ? "Checkboxes" : "Multiple choice",
        options: [
          { id: uid("o"), label: "Option 1" },
          { id: uid("o"), label: "Option 2" },
        ],
      };
    case "dropdown":
      return {
        ...base,
        label: "Dropdown",
        options: [
          { id: uid("o"), label: "Option 1" },
          { id: uid("o"), label: "Option 2" },
        ],
      };
    case "rating":
      return { ...base, label: "Rating", max: 5 };
    case "statement":
      return { ...base, label: "Section title", description: "" };
    case "file":
      return { ...base, label: "File upload" };
    default:
      return base;
  }
}

export function emptySchema(): FormSchema {
  return {
    version: 1,
    pages: [{ id: uid("p"), title: "", description: "", fields: [] }],
  };
}

export function starterSchema(): FormSchema {
  return {
    version: 1,
    pages: [
      {
        id: uid("p"),
        title: "",
        description: "",
        fields: [
          { id: uid("q"), type: "short_text", label: "Full name", required: true },
          { id: uid("q"), type: "email", label: "Email", required: true },
          { id: uid("q"), type: "long_text", label: "Message" },
        ],
      },
    ],
  };
}

export function parseSchema(input: unknown): FormSchema {
  const result = schemaSchema.safeParse(input);
  if (!result.success) return emptySchema();

  const pages = result.data.pages.map((page) => ({
    ...page,
    fields: page.fields.map((field) => ({
      ...field,
      options: field.options?.map((option) => ({ ...option })),
    })),
  }));

  if (pages.length === 0) return emptySchema();
  return { version: 1, pages };
}

export function parseSettings(input: unknown): FormSettings {
  const raw = (input ?? {}) as Record<string, unknown>;
  const read = (key: keyof FormSettings) =>
    typeof raw[key] === "string" ? (raw[key] as string) : "";
  const max = Number(raw.maxResponses);
  return {
    submitLabel: read("submitLabel"),
    successTitle: read("successTitle"),
    successMessage: read("successMessage"),
    redirectUrl: read("redirectUrl"),
    respondentNameField: read("respondentNameField"),
    respondentEmailField: read("respondentEmailField"),
    maxResponses: Number.isInteger(max) && max > 0 ? max : null,
    onePerEmail: raw.onePerEmail === true,
    layout: raw.layout === "question" ? "question" : "page",
  };
}

export function schemaFields(schema: FormSchema): FormField[] {
  return schema.pages.flatMap((page) => page.fields);
}

export function firstPage(schema: FormSchema): FormPage {
  return schema.pages[0] ?? { id: uid("p"), title: "", description: "", fields: [] };
}

type ValidationResult =
  | { ok: true; schema: FormSchema }
  | { ok: false; error: string };

/** strict=false is used by autosave (drafts may be incomplete); strict=true when publishing. */
export function validateSchema(input: unknown, strict = true): ValidationResult {
  const parsed = schemaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_schema" };

  const ids = new Set<string>();
  const pages: FormPage[] = [];

  for (const page of parsed.data.pages) {
    if (ids.has(page.id)) return { ok: false, error: "invalid_schema" };
    ids.add(page.id);

    const fields: FormField[] = [];
    for (const field of page.fields) {
      if (ids.has(field.id)) return { ok: false, error: "invalid_schema" };
      ids.add(field.id);

      const label = field.label.trim();
      if (strict && field.type !== "statement" && field.type !== "divider" && !label) return { ok: false, error: "invalid_schema" };

      const options = field.options?.map((option) => ({
        id: option.id,
        label: option.label.trim(),
      }));

      if (strict && CHOICE_TYPES.includes(field.type)) {
        if (!options || options.length < 2 || options.some((option) => !option.label)) {
          return { ok: false, error: "invalid_schema" };
        }
      }

      if (strict && field.type === "rating") {
        const max = field.max ?? 5;
        if (max < 2 || max > 10) return { ok: false, error: "invalid_schema" };
      }

      fields.push({
        id: field.id,
        type: field.type,
        label,
        description: field.description?.trim() || undefined,
        placeholder: field.placeholder?.trim() || undefined,
        required: Boolean(field.required),
        options,
        min: field.min,
        max: field.max,
        maxLength: field.maxLength,
      });
    }

    pages.push({
      id: page.id,
      title: page.title?.trim() || undefined,
      description: page.description?.trim() || undefined,
      fields,
    });
  }

  if (pages.length === 0) return { ok: false, error: "invalid_schema" };
  return { ok: true, schema: { version: 1, pages } };
}

export type InvalidField = { id: string; reason: "label" | "options" | "rating"; label: string };

/** First question that would block publishing, so the UI can point at it. */
export function firstInvalidField(schema: FormSchema): InvalidField | null {
  for (const field of schemaFields(schema)) {
    const label = field.label.trim();
    if (field.type !== "statement" && field.type !== "divider" && !label) {
      return { id: field.id, reason: "label", label };
    }
    if (CHOICE_TYPES.includes(field.type)) {
      const options = field.options ?? [];
      if (options.length < 2 || options.some((option) => !option.label.trim())) {
        return { id: field.id, reason: "options", label };
      }
    }
    if (field.type === "rating") {
      const max = field.max ?? 5;
      if (max < 2 || max > 10) return { id: field.id, reason: "rating", label };
    }
  }
  return null;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function answerToText(
  value: unknown,
  field: FormField,
): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) {
    return value
      .map((entry) => answerToText(entry, field))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.name === "string") return record.name;
    return "";
  }
  const text = String(value);
  if (CHOICE_TYPES.includes(field.type) && field.options) {
    return field.options.find((option) => option.id === text)?.label ?? text;
  }
  return text;
}
