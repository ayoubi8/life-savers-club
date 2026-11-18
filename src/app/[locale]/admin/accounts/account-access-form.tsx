"use client";

import { useState } from "react";
import { DEPARTMENT_SECTIONS, DEPARTMENTS, SECTIONS, isDepartment, type Role, type Section } from "@/lib/permissions";
import { updateAccount } from "./actions";

type Labels = {
  role: string;
  admin: string;
  member: string;
  department: string;
  noDepartment: string;
  departments: Record<(typeof DEPARTMENTS)[number], string>;
  sections: string;
  sectionNames: Record<Section, string>;
  adminHint: string;
  memberHint: string;
  noSection: string;
  activate: string;
  enable: string;
  save: string;
  disable: string;
};

/** Role, department and section access for one account (admins only). */
export function AccountAccessForm({
  account,
  labels: l,
  tour = false,
}: {
  account: { id: string; role: Role; status: "pending" | "active" | "disabled"; department: string | null; sections: string[] };
  labels: Labels;
  /** Marks this account's controls for the guided tour. */
  tour?: boolean;
}) {
  const [role, setRole] = useState<Role>(account.role);
  const [department, setDepartment] = useState(account.department ?? "");
  const [sections, setSections] = useState<string[]>(account.sections);

  // Choosing a department pre-ticks its default sections (HR → forms, MRKT → events + media, FL → finance).
  function pickDepartment(value: string) {
    setDepartment(value);
    if (isDepartment(value)) setSections(DEPARTMENT_SECTIONS[value]);
  }

  function toggle(section: Section) {
    setSections((current) => (current.includes(section) ? current.filter((s) => s !== section) : [...current, section]));
  }

  const field = "rounded-lg border border-border bg-white px-2 py-2 text-sm";

  return (
    <form action={updateAccount} className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
      <input type="hidden" name="id" value={account.id} />
      <div data-tour={tour ? "accounts.role" : undefined} className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`role-${account.id}`}>{l.role}</label>
        <select id={`role-${account.id}`} name="role" value={role} onChange={(e) => setRole(e.target.value as Role)} className={field}>
          <option value="member">{l.member}</option>
          <option value="admin">{l.admin}</option>
        </select>
        <label className="sr-only" htmlFor={`dept-${account.id}`}>{l.department}</label>
        <select id={`dept-${account.id}`} name="department" value={department} onChange={(e) => pickDepartment(e.target.value)} className={field}>
          <option value="">{l.department} · {l.noDepartment}</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{l.departments[d]}</option>
          ))}
        </select>
      </div>

      {role === "admin" ? (
        <p data-tour={tour ? "accounts.sections" : undefined} className="text-xs font-semibold text-muted-foreground">{l.adminHint}</p>
      ) : (
        <fieldset data-tour={tour ? "accounts.sections" : undefined} className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <legend className="sr-only">{l.sections}</legend>
          {SECTIONS.map((s) => (
            <label key={s} className="flex items-center gap-1.5 text-sm font-semibold text-grey">
              <input type="checkbox" name="sections" value={s} checked={sections.includes(s)} onChange={() => toggle(s)} className="h-4 w-4 accent-blue" />
              {l.sectionNames[s]}
            </label>
          ))}
          <span className={`basis-full text-xs sm:text-right ${sections.length ? "text-muted-foreground" : "font-semibold text-pink"}`}>
            {sections.length ? l.memberHint : l.noSection}
          </span>
        </fieldset>
      )}

      <div data-tour={tour ? "accounts.status" : undefined} className="flex flex-wrap gap-2">
        {account.status !== "active" ? (
          <button name="status" value="active" className="rounded-full bg-green px-4 py-2 text-sm font-bold text-white">
            {account.status === "disabled" ? l.enable : l.activate}
          </button>
        ) : (
          <>
            <button name="status" value="active" className="rounded-full bg-blue px-4 py-2 text-sm font-bold text-white">{l.save}</button>
            <button name="status" value="disabled" className="rounded-full bg-pink px-4 py-2 text-sm font-bold text-white">{l.disable}</button>
          </>
        )}
      </div>
    </form>
  );
}
