import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GENERAL,
  DEFAULT_HOME,
  DEFAULT_SPONSORS,
  cleanUrl,
  isAllowedImageUrl,
  parseHomePage,
  parseSiteGeneral,
  parseSponsorsPage,
  tx,
} from "./schema";

const SUPABASE = "https://abc.supabase.co";

afterEach(() => vi.unstubAllEnvs());

describe("parsers fall back to defaults", () => {
  it("returns the defaults for empty or garbage input", () => {
    for (const input of [undefined, null, 42, "x", []]) {
      expect(parseSiteGeneral(input)).toEqual(DEFAULT_GENERAL);
      expect(parseHomePage(input)).toEqual(DEFAULT_HOME);
      expect(parseSponsorsPage(input)).toEqual(DEFAULT_SPONSORS);
    }
  });

  it("round-trips its own output", () => {
    expect(parseHomePage(JSON.parse(JSON.stringify(DEFAULT_HOME)))).toEqual(DEFAULT_HOME);
    expect(parseSiteGeneral(DEFAULT_GENERAL)).toEqual(DEFAULT_GENERAL);
    expect(parseSponsorsPage(DEFAULT_SPONSORS)).toEqual(DEFAULT_SPONSORS);
  });

  it("keeps edited fields and fills missing ones", () => {
    const page = parseHomePage({ hero: { title1: { fr: "Bonjour", en: "" } } });
    expect(page.hero.title1).toEqual({ fr: "Bonjour", en: "" });
    expect(page.hero.subtitle).toEqual(DEFAULT_HOME.hero.subtitle);
    expect(page.stats).toEqual(DEFAULT_HOME.stats);
  });
});

describe("lists", () => {
  it("an empty stored list stays empty (section hidden)", () => {
    expect(parseHomePage({ stats: [] }).stats).toEqual([]);
  });

  it("caps length, repairs ids and rejects unknown icons/colours", () => {
    const values = parseHomePage({
      values: Array.from({ length: 10 }, () => ({ id: "same", icon: "skull", color: "red", title: { fr: "A" } })),
    }).values;
    expect(values).toHaveLength(6);
    expect(new Set(values.map((v) => v.id)).size).toBe(6);
    expect(values[0]).toMatchObject({ icon: "heart", color: "blue", title: { fr: "A", en: "" } });
  });

  it("truncates long text", () => {
    const [stat] = parseHomePage({ stats: [{ id: "a", value: "x".repeat(50), label: { fr: "y".repeat(500), en: "" } }] }).stats;
    expect(stat.value).toHaveLength(20);
    expect(stat.label.fr).toHaveLength(60);
  });
});

describe("urls and images", () => {
  it("only keeps http(s) links", () => {
    expect(cleanUrl("https://example.org/a")).toBe("https://example.org/a");
    expect(cleanUrl("javascript:alert(1)")).toBe("");
    expect(cleanUrl("not a url")).toBe("");
  });

  it("accepts local and site-bucket images only", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE);
    expect(isAllowedImageUrl("/brand/logo.png")).toBe(true);
    expect(isAllowedImageUrl("//evil.com/x.png")).toBe(false);
    expect(isAllowedImageUrl(`${SUPABASE}/storage/v1/object/public/event-media/site/a.webp`)).toBe(true);
    expect(isAllowedImageUrl(`${SUPABASE}/storage/v1/object/public/form-uploads/a.pdf`)).toBe(false);
    expect(isAllowedImageUrl("https://evil.com/x.png")).toBe(false);
  });

  it("drops a sponsor logo with a foreign url and keeps the default hero image", () => {
    const page = parseSponsorsPage({ sponsors: [{ id: "a", name: "X", url: "ftp://x", logo: { url: "https://evil.com/x.png" } }] });
    expect(page.sponsors[0]).toEqual({ id: "a", name: "X", url: "", logo: null });
    expect(parseHomePage({ hero: { image: { url: "https://evil.com/x.png" } } }).hero.image).toEqual(DEFAULT_HOME.hero.image);
  });
});

describe("tx", () => {
  it("falls back to the other language when empty", () => {
    expect(tx({ fr: "Bonjour", en: "" }, "en")).toBe("Bonjour");
    expect(tx({ fr: "", en: "Hello" }, "fr")).toBe("Hello");
    expect(tx({ fr: "Bonjour", en: "Hello" }, "en")).toBe("Hello");
  });
});
