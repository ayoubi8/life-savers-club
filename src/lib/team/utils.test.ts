import { describe, expect, it } from "vitest";
import { docFromText } from "@/lib/events/content";
import { departmentCardStyle, parseDepartmentTheme } from "./theme";
import {
  departmentPublishProblems,
  initials,
  parseGalleryMode,
  sortBureau,
  teamStoragePath,
  toBureauMember,
  toDepartmentCard,
} from "./utils";

const SUPABASE = "https://abc.supabase.co";
const publicUrl = (path: string) => `${SUPABASE}/storage/v1/object/public/event-media/${path}`;

describe("teamStoragePath", () => {
  it("returns the path of our own team uploads", () => {
    expect(teamStoragePath(publicUrl("team/bureau/president/a.webp"), SUPABASE)).toBe("team/bureau/president/a.webp");
    expect(teamStoragePath(publicUrl("team/departments/x/leader/b.jpg?v=1"), `${SUPABASE}/`)).toBe("team/departments/x/leader/b.jpg");
  });

  it("refuses other folders, other hosts and traversal", () => {
    expect(teamStoragePath(publicUrl("events/1/a.webp"), SUPABASE)).toBeNull();
    expect(teamStoragePath(publicUrl("site/a.webp"), SUPABASE)).toBeNull();
    expect(teamStoragePath("https://evil.example/storage/v1/object/public/event-media/team/a.webp", SUPABASE)).toBeNull();
    expect(teamStoragePath(publicUrl("team/../events/a.webp"), SUPABASE)).toBeNull();
    expect(teamStoragePath(null, SUPABASE)).toBeNull();
  });
});

describe("initials", () => {
  it("uses first and last name", () => {
    expect(initials("Amina Benali")).toBe("AB");
    expect(initials("  yacine  ")).toBe("Y");
    expect(initials("Nour El Houda Saidi")).toBe("NS");
    expect(initials("")).toBe("?");
    expect(initials(null)).toBe("?");
  });
});

describe("parseGalleryMode", () => {
  it("falls back to the group photo", () => {
    expect(parseGalleryMode("members")).toBe("members");
    expect(parseGalleryMode("both")).toBe("both");
    expect(parseGalleryMode("nope")).toBe("group");
    expect(parseGalleryMode(undefined)).toBe("group");
  });
});

describe("bureau", () => {
  it("keeps only the two bureau seats, president first, with default role labels", () => {
    const vp = toBureauMember({ id: "2", position: "vice_president", full_name: "B", role_title_fr: null, photo_focus: { x: 10, y: 200 } });
    const president = toBureauMember({ id: "1", position: "president", full_name: "A", role_title_fr: "Présidente", is_visible: false });
    expect(toBureauMember({ id: "3", position: "treasurer", full_name: "C" })).toBeNull();
    expect(toBureauMember({ id: "4", position: null, full_name: "D" })).toBeNull();
    expect(vp?.role_fr).toBe("Vice-président(e)");
    expect(vp?.role_en).toBe("Vice president");
    expect(vp?.photo_focus).toEqual({ x: 10, y: 100 });
    expect(president?.role_fr).toBe("Présidente");
    expect(president?.is_visible).toBe(false);
    expect(sortBureau([vp!, president!]).map((m) => m.position)).toEqual(["president", "vice_president"]);
  });
});

describe("toDepartmentCard", () => {
  it("never trusts stored JSON", () => {
    const card = toDepartmentCard({ id: "d", slug: "rh", status: "weird", name_fr: "RH", theme: { primary: "red" }, leader_photo_focus: null });
    expect(card.status).toBe("draft");
    expect(card.theme).toEqual(parseDepartmentTheme({}));
    expect(card.leader_photo_focus).toEqual({ x: 50, y: 50 });
    expect(card.name_en).toBeNull();
  });
});

describe("departmentPublishProblems", () => {
  const ok = { name_fr: "Marketing", leader_name: "Sara", content_fr: docFromText("Nous communiquons."), content_en: null, cover_url: null, cover_alt: null };

  it("accepts a complete department", () => {
    expect(departmentPublishProblems(ok)).toEqual([]);
  });

  it("lists what is missing", () => {
    expect(departmentPublishProblems({ ...ok, name_fr: " ", leader_name: null, content_fr: null })).toEqual(["name", "leader", "content"]);
    expect(departmentPublishProblems({ ...ok, cover_url: "https://x/y.webp", cover_alt: "" })).toEqual(["coverAlt"]);
    const image = { type: "doc" as const, content: [{ type: "image", attrs: { src: "https://x/y.webp", alt: "" } }] };
    expect(departmentPublishProblems({ ...ok, content_en: image })).toEqual(["imageAlt"]);
  });
});

describe("departmentCardStyle", () => {
  it("uses the theme colours, with readable text on the white card", () => {
    const style = departmentCardStyle(parseDepartmentTheme({ primary: "#2d74ba", accent: "#ef4a6c", header: "solid" })) as Record<string, string>;
    expect(style["--dept-band"]).toBe("#2d74ba");
    expect(style["--dept-ring"]).toContain("#ef4a6c");
    expect(style["--dept-text"]).toBe("#2d74ba");
    // A very light primary is unreadable on white: falls back to the club grey.
    const pale = departmentCardStyle(parseDepartmentTheme({ primary: "#fff3b0", accent: "#fde7ef" })) as Record<string, string>;
    expect(pale["--dept-text"]).toBe("#414042");
  });
});
