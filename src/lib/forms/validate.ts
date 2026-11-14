import { CHOICE_TYPES, DISPLAY_TYPES, type FormField } from "./schema";

export type RawValue = FormDataEntryValue | FormDataEntryValue[] | null | undefined;

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+()\d\s.-]{6,30}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Returns an error code (a key of `formPublic.errors`) or null when the answer is fine.
 * Used in the browser (per page, before "Next") and mirrors the server-side checks.
 */
export function validateAnswer(field: FormField, raw: RawValue): string | null {
  if (DISPLAY_TYPES.includes(field.type)) return null;
  const required = Boolean(field.required);

  if (field.type === "file") {
    const file = Array.isArray(raw) ? raw[0] : raw;
    if (!(file instanceof File) || file.size === 0) return required ? "required" : null;
    return file.size > MAX_FILE_BYTES ? "file_too_large" : null;
  }

  if (field.type === "checkboxes") {
    const picked = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    if (picked.length === 0) return required ? "required" : null;
    const valid = new Set((field.options ?? []).map((option) => option.id));
    return picked.every((value) => valid.has(value)) ? null : "invalid_choice";
  }

  if (field.type === "consent") {
    const first = Array.isArray(raw) ? raw[0] : raw;
    return first === "on" || !required ? null : "required";
  }

  const first = Array.isArray(raw) ? raw[0] : raw;
  const value = typeof first === "string" ? first.trim() : "";
  if (!value) return required ? "required" : null;

  if (CHOICE_TYPES.includes(field.type)) {
    return (field.options ?? []).some((option) => option.id === value) ? null : "invalid_choice";
  }

  switch (field.type) {
    case "email":
      return EMAIL.test(value) && value.length <= 320 ? null : "invalid_email";
    case "phone":
      return PHONE.test(value) ? null : "invalid_phone";
    case "url":
      try {
        return /^https?:$/.test(new URL(value).protocol) ? null : "invalid_url";
      } catch {
        return "invalid_url";
      }
    case "number": {
      const number = Number(value);
      if (!Number.isFinite(number)) return "invalid_number";
      if (field.min != null && number < field.min) return "invalid_number";
      if (field.max != null && number > field.max) return "invalid_number";
      return null;
    }
    case "rating": {
      const number = Number(value);
      return Number.isInteger(number) && number >= 1 && number <= (field.max ?? 5) ? null : "invalid";
    }
    case "nps": {
      const number = Number(value);
      return Number.isInteger(number) && number >= 0 && number <= 10 ? null : "invalid";
    }
    case "yes_no":
      return value === "yes" || value === "no" ? null : "invalid";
    case "time":
      return TIME.test(value) ? null : "invalid";
    case "date":
      return Number.isNaN(new Date(value).getTime()) ? "invalid_date" : null;
    case "short_text":
    case "long_text":
      return field.maxLength && value.length > field.maxLength ? "too_long" : null;
    default:
      return null;
  }
}
