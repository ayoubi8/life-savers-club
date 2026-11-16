// Pure helpers (no server imports): safe in server code, client components and tests.
// Postgres enforces the same rules through RLS (public.can_access); these drive the UI and
// give server actions an early, clear "unauthorized".

export const ROLES = ["admin", "member"] as const;
export type Role = (typeof ROLES)[number];

export const SECTIONS = ["events", "forms"] as const;
export type Section = (typeof SECTIONS)[number];

export const DEPARTMENTS = ["hr", "er", "mrkt", "fl", "org"] as const;
export type Department = (typeof DEPARTMENTS)[number];

/** Sections pre-ticked when an admin puts a member in a department. */
export const DEPARTMENT_SECTIONS: Record<Department, Section[]> = {
  hr: ["forms"],
  mrkt: ["events"],
  er: [],
  fl: [],
  org: [],
};

export type AccessProfile = {
  role: Role;
  status: "pending" | "active" | "disabled";
  sections: string[] | null;
};

export function isAdmin(profile: AccessProfile | null | undefined) {
  return !!profile && profile.status === "active" && profile.role === "admin";
}

/** Whether the account may open an admin section ("accounts" is admin-only). */
export function can(profile: AccessProfile | null | undefined, section: Section | "accounts") {
  if (!profile || profile.status !== "active") return false;
  if (profile.role === "admin") return true;
  if (section === "accounts") return false;
  return (profile.sections ?? []).includes(section);
}

export function isSection(value: unknown): value is Section {
  return SECTIONS.includes(value as Section);
}

export function isDepartment(value: unknown): value is Department {
  return DEPARTMENTS.includes(value as Department);
}
