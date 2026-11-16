import { describe, expect, it } from "vitest";
import { can, DEPARTMENT_SECTIONS, isAdmin, type AccessProfile } from "./permissions";

const p = (role: AccessProfile["role"], sections: string[] = [], status: AccessProfile["status"] = "active"): AccessProfile => ({
  role,
  status,
  sections,
});

describe("can", () => {
  it("lets an active admin into every section", () => {
    for (const s of ["events", "forms", "accounts"] as const) expect(can(p("admin"), s)).toBe(true);
    expect(isAdmin(p("admin"))).toBe(true);
  });

  it("limits an HR member to forms", () => {
    const hr = p("member", ["forms"]);
    expect(can(hr, "forms")).toBe(true);
    expect(can(hr, "events")).toBe(false);
    expect(can(hr, "accounts")).toBe(false);
  });

  it("limits a marketing member to events", () => {
    const mrkt = p("member", ["events"]);
    expect(can(mrkt, "events")).toBe(true);
    expect(can(mrkt, "forms")).toBe(false);
  });

  it("never lets a member manage accounts, even with every section", () => {
    expect(can(p("member", ["events", "forms"]), "accounts")).toBe(false);
  });

  it("gives a member without sections nothing", () => {
    expect(can(p("member"), "events")).toBe(false);
    expect(can(p("member"), "forms")).toBe(false);
  });

  it("blocks pending, disabled and missing profiles", () => {
    expect(can(p("admin", [], "pending"), "events")).toBe(false);
    expect(can(p("admin", [], "disabled"), "accounts")).toBe(false);
    expect(can(null, "forms")).toBe(false);
    expect(isAdmin(p("admin", [], "disabled"))).toBe(false);
  });
});

describe("DEPARTMENT_SECTIONS", () => {
  it("defaults HR to forms, MRKT to events, the rest to nothing", () => {
    expect(DEPARTMENT_SECTIONS.hr).toEqual(["forms"]);
    expect(DEPARTMENT_SECTIONS.mrkt).toEqual(["events"]);
    expect([...DEPARTMENT_SECTIONS.er, ...DEPARTMENT_SECTIONS.fl, ...DEPARTMENT_SECTIONS.org]).toEqual([]);
  });
});
