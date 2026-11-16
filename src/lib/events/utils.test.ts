import { describe, expect, it } from "vitest";
import { DEFAULT_EVENT_THEME, eventThemeWarnings, parseEventTheme, readableOn } from "./theme";
import {
  cleanSocialLink,
  groupByYear,
  invalidSocialLinks,
  localized,
  parseEventsPageSettings,
  parseFocus,
  parseSocialLinks,
  parseStats,
  parseTags,
} from "./utils";

describe("groupByYear", () => {
  it("groups newest year first and sorts inside a year", () => {
    const groups = groupByYear([
      { id: "a", starts_at: "2025-03-01T10:00:00Z" },
      { id: "b", starts_at: "2026-02-07T10:00:00Z" },
      { id: "c", starts_at: "2025-11-20T10:00:00Z" },
    ]);
    expect(groups.map((g) => [g.year, g.events.map((e) => e.id)])).toEqual([
      [2026, ["b"]],
      [2025, ["c", "a"]],
    ]);
  });

  it("uses the Algiers timezone at year boundaries", () => {
    // 31 Dec 23:30 UTC is already 1 Jan 00:30 in Algiers.
    expect(groupByYear([{ starts_at: "2025-12-31T23:30:00Z" }])[0].year).toBe(2026);
  });
});

describe("parsers", () => {
  it("falls back to French", () => {
    expect(localized("Caravane", null, "en")).toBe("Caravane");
    expect(localized("Caravane", "Caravan", "en")).toBe("Caravan");
    expect(localized("Caravane", "Caravan", "fr")).toBe("Caravane");
  });

  it("clamps focus and filters stats and tags", () => {
    expect(parseFocus({ x: -5, y: 140 })).toEqual({ x: 0, y: 100 });
    expect(parseFocus("bad")).toEqual({ x: 50, y: 50 });
    expect(parseStats([{ value: "350", label_fr: "dépistés", icon: "rocket" }, { value: "", label_fr: "x" }])).toEqual([
      { value: "350", label_fr: "dépistés", label_en: "", icon: "users" },
    ]);
    expect(parseTags([" Santé ", "Santé", 3, "", "x".repeat(50)])).toEqual(["Santé", "x".repeat(30)]);
  });

  it("parses page settings safely", () => {
    const settings = parseEventsPageSettings({
      layout: "grid3",
      divider: "neon",
      dividerColor: "#2D74BA",
      yearNotes: { "2025": { fr: "Saison 4" }, hack: { fr: "x" } },
    });
    expect(settings).toMatchObject({ layout: "grid3", divider: "line", dividerColor: "#2d74ba" });
    expect(settings.yearNotes).toEqual({ "2025": { fr: "Saison 4", en: "" } });
  });

  it("parses event themes with readable defaults", () => {
    expect(parseEventTheme(null)).toEqual(DEFAULT_EVENT_THEME);
    const night = parseEventTheme({ background: "#1c1a24", headerLayout: "split", overlay: 200 });
    expect(night).toMatchObject({ text: "#f4f4f6", headerLayout: "split", overlay: 80 });
    expect(eventThemeWarnings({ ...DEFAULT_EVENT_THEME, text: "#eeeeee" })).toContain("textContrast");
  });

  it("picks a readable title / link colour on dark pages", () => {
    // Night preset: purple primary is too dark on #1c1a24, pink accent passes 3:1 for titles.
    expect(readableOn("#1c1a24", ["#6240e8", "#ef4a6c"], 3, "#f4f4f6")).toBe("#ef4a6c");
    // Nothing passes 4.5:1 for links → the page text colour is used.
    expect(readableOn("#1c1a24", ["#6240e8", "#2d74ba"], 4.5, "#f4f4f6")).toBe("#f4f4f6");
    // Club theme on white keeps its blue.
    expect(readableOn("#ffffff", ["#2d74ba", "#ef4a6c"], 4.5, "#231f20")).toBe("#2d74ba");
  });
});

describe("social links", () => {
  it("keeps real post links and drops tracking parameters", () => {
    expect(cleanSocialLink("instagram", "https://www.instagram.com/p/DXbSwa4iJHg/?igsh=abc&img_index=2")).toBe(
      "https://www.instagram.com/p/DXbSwa4iJHg/",
    );
    expect(cleanSocialLink("tiktok", "https://www.tiktok.com/@club/video/7301234567890123456?is_from_webapp=1#x")).toBe(
      "https://www.tiktok.com/@club/video/7301234567890123456",
    );
    expect(cleanSocialLink("tiktok", "vm.tiktok.com/ZMabc123/")).toBe("https://vm.tiktok.com/ZMabc123/");
  });

  it("keeps the Facebook query (some post URLs need it) and upgrades to https", () => {
    expect(cleanSocialLink("facebook", "http://m.facebook.com/permalink.php?story_fbid=1&id=2")).toBe(
      "https://m.facebook.com/permalink.php?story_fbid=1&id=2",
    );
    expect(cleanSocialLink("facebook", "https://fb.watch/abc/")).toBe("https://fb.watch/abc/");
  });

  it("rejects other hosts, look-alike domains and unsafe schemes", () => {
    expect(cleanSocialLink("instagram", "https://evil.com/instagram.com")).toBeNull();
    expect(cleanSocialLink("instagram", "https://instagram.com.evil.com/p/x")).toBeNull();
    expect(cleanSocialLink("facebook", "https://notfacebook.com/x")).toBeNull();
    expect(cleanSocialLink("tiktok", "javascript:alert(1)")).toBeNull();
    expect(cleanSocialLink("instagram", "https://user:pw@instagram.com/p/x")).toBeNull();
    expect(cleanSocialLink("instagram", "https://www.facebook.com/x")).toBeNull();
  });

  it("parses stored JSON and lists invalid filled-in fields", () => {
    expect(parseSocialLinks({ instagram: "https://www.instagram.com/p/A/", facebook: "", tiktok: "https://x.com" })).toEqual({
      instagram: "https://www.instagram.com/p/A/",
    });
    expect(parseSocialLinks(null)).toEqual({});
    expect(invalidSocialLinks({ instagram: "https://www.instagram.com/p/A/", facebook: "nope", tiktok: " " })).toEqual(["facebook"]);
  });
});
