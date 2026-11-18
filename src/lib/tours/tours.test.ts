import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import { isUnseen, presentSteps, stepsFor, worthShowing } from "./filter";
import { matchTour, TOURS } from "./registry";
import type { Tour } from "./types";

const ROOT = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

/** Every data-tour value written in the code, literal or in a ternary / template string. */
const anchors = (() => {
  const found = new Set<string>();
  for (const file of sourceFiles(ROOT)) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/(?:data-tour=|tour=)\{?[^>\n]*?"([a-zA-Z][\w.-]*)"/g)) found.add(match[1]);
    for (const match of text.matchAll(/data-tour=\{`([\w.-]*)\$\{[^}]+\}`\}/g)) {
      // `accounts.${g.key}`: accept any suffix with this prefix.
      found.add(`${match[1]}*`);
    }
  }
  return found;
})();

const anchored = (target: string) =>
  anchors.has(target) || [...anchors].some((anchor) => anchor.endsWith("*") && target.startsWith(anchor.slice(0, -1)));

function text(messages: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], messages);
}

describe("tour registry", () => {
  it("has unique ids", () => {
    const ids = TOURS.map((tour) => tour.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(TOURS.map((tour) => [tour.id, tour] as const))("%s: every step has French and English text", (_, tour) => {
    for (const step of tour.steps) {
      for (const messages of [en, fr]) {
        for (const field of ["title", "body"]) {
          const value = text(messages, `tours.${tour.id}.${step.id}.${field}`);
          expect(typeof value, `tours.${tour.id}.${step.id}.${field}`).toBe("string");
          expect((value as string).length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("anchor scan finds real anchors and rejects unknown ones", () => {
    expect(anchored("media.folder-menu")).toBe(true);
    expect(anchored("accounts.pending")).toBe(true);
    expect(anchored("not.a-real.anchor")).toBe(false);
  });

  it.each(TOURS.map((tour) => [tour.id, tour] as const))("%s: every target exists in the code", (_, tour) => {
    for (const step of tour.steps) if (step.target) expect(anchored(step.target), `data-tour="${step.target}"`).toBe(true);
  });

  it("has a guide for every admin page", () => {
    const pages = sourceFiles(join(ROOT, "app", "[locale]", "admin"))
      .filter((file) => file.endsWith("page.tsx"))
      .map((file) =>
        file
          .slice(join(ROOT, "app", "[locale]").length)
          .replaceAll("\\", "/")
          .replace(/\/page\.tsx$/, "")
          .replace(/\[[^\]]+\]/g, "x1"),
      )
      // These only redirect to their first tab.
      .filter((path) => !/^\/admin\/(events|forms|team)\/x1$/.test(path));
    const missing = pages.filter((path) => !matchTour(path));
    expect(missing).toEqual([]);
  });

  it("matches one tour per page", () => {
    for (const path of ["/admin", "/admin/media", "/admin/media/abc", "/admin/events/page-settings", "/admin/forms/abc/edit"]) {
      expect(TOURS.filter((tour) => tour.match.test(path)), path).toHaveLength(1);
    }
    expect(matchTour("/admin/media")?.id).toBe("media.library");
    expect(matchTour("/admin/media/123")?.id).toBe("media.folder");
    expect(matchTour("/admin/events/page-settings")?.id).toBe("events.pageSettings");
    expect(matchTour("/admin/unknown")).toBeNull();
  });
});

describe("step filtering", () => {
  const tour: Tour = {
    id: "t",
    version: 2,
    match: /^\/x$/,
    steps: [
      { id: "intro" },
      { id: "all", target: "a" },
      { id: "admin", target: "b", only: "admin" },
      { id: "member", target: "c", only: "member" },
      { id: "media", target: "d", section: "media" },
    ],
  };

  it("keeps admin-only steps for admins", () => {
    expect(stepsFor(tour, { admin: true, sections: [] }).map((s) => s.id)).toEqual(["intro", "all", "admin", "media"]);
  });

  it("keeps member steps and needed sections for members", () => {
    expect(stepsFor(tour, { admin: false, sections: [] }).map((s) => s.id)).toEqual(["intro", "all", "member"]);
    expect(stepsFor(tour, { admin: false, sections: ["media"] }).map((s) => s.id)).toEqual(["intro", "all", "member", "media"]);
  });

  it("drops steps whose element is not on the page", () => {
    const steps = presentSteps(tour.steps, (target) => target === "a");
    expect(steps.map((s) => s.id)).toEqual(["intro", "all"]);
    expect(worthShowing(steps)).toBe(true);
    expect(worthShowing(presentSteps(tour.steps, () => false))).toBe(false);
  });

  it("shows a tour again when its version goes up", () => {
    expect(isUnseen(tour, {})).toBe(true);
    expect(isUnseen(tour, { t: 1 })).toBe(true);
    expect(isUnseen(tour, { t: 2 })).toBe(false);
  });
});
