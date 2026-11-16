import { describe, expect, it } from "vitest";
import {
  docMediaUrls,
  imagesMissingAlt,
  isAllowedEmbed,
  isEmptyDoc,
  isOwnMedia,
  parseVideoUrl,
  safeHref,
  sanitizeDoc,
  type EventNode,
} from "./content";

const BASE = "https://abc.supabase.co/storage/v1/object/public/event-media/";
const IMG = `${BASE}events/1b4e28ba-2fa1-11d2-883f-0016d3cca427/photo.webp`;
const doc = (...content: EventNode[]) => ({ type: "doc", content });
const doc_ = doc;
const p = (...content: EventNode[]) => ({ type: "paragraph", content });
const t = (text: string, marks?: EventNode["marks"]) => ({ type: "text", text, ...(marks ? { marks } : {}) });

describe("sanitizeDoc", () => {
  it("keeps allowed text, marks and alignment", () => {
    const input = doc({
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [t("Bonjour", [{ type: "bold" }, { type: "textStyle", attrs: { color: "#EF4A6C", fontSize: "xl" } }])],
    });
    expect(sanitizeDoc(input, BASE)).toEqual(
      doc({
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [t("Bonjour", [{ type: "bold" }, { type: "textStyle", attrs: { color: "#ef4a6c", fontSize: "xl" } }])],
      }),
    );
  });

  it("drops unknown nodes, unknown marks and bad attribute values", () => {
    const input = doc(
      { type: "script", content: [t("alert(1)")] } as EventNode,
      { type: "iframe", attrs: { src: "https://evil.example" } },
      p(t("x", [{ type: "onclick" }, { type: "textStyle", attrs: { color: "red; background:url(x)", fontSize: "999px" } }])),
    );
    expect(sanitizeDoc(input, BASE)).toEqual(doc(p(t("x"))));
  });

  it("removes dangerous links but keeps safe ones", () => {
    const link = (href: string) => p(t("l", [{ type: "link", attrs: { href } }]));
    const out = sanitizeDoc(
      doc(link("javascript:alert(1)"), link("//evil.com"), link("data:text/html,x"), link("https://ok.dz/a"), link("/fr/events")),
      BASE,
    );
    expect(out?.content.map((node) => node.content?.[0].marks?.[0]?.attrs?.href ?? null)).toEqual([
      null, null, null, "https://ok.dz/a", "/fr/events",
    ]);
  });

  it("only accepts images from our own bucket", () => {
    const img = (src: string) => ({ type: "image", attrs: { src, alt: "a" } });
    const out = sanitizeDoc(doc(img("https://evil.com/x.png"), img(`${BASE}../secret.png`), img(IMG)), BASE);
    expect(out?.content).toHaveLength(1);
    expect(out?.content[0].attrs).toMatchObject({ src: IMG, width: "100", align: "center", rounded: true });
  });

  it("validates image layout options", () => {
    const out = sanitizeDoc(doc({ type: "image", attrs: { src: IMG, width: "50", align: "left", shadow: true, rounded: false } }), BASE);
    expect(out?.content[0].attrs).toMatchObject({ width: "50", align: "left", shadow: true, rounded: false, border: false });
    const bad = sanitizeDoc(doc({ type: "image", attrs: { src: IMG, width: "300%", align: "float" } }), BASE);
    expect(bad?.content[0].attrs).toMatchObject({ width: "100", align: "center" });
  });

  it("keeps only whitelisted video embeds", () => {
    const video = (provider: string, src: string) => ({ type: "video", attrs: { provider, src } });
    const out = sanitizeDoc(
      doc(
        video("youtube", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"),
        video("youtube", "https://evil.com/embed/dQw4w9WgXcQ"),
        video("vimeo", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"),
        video("file", `${BASE}events/x/clip.mp4`),
        video("file", "https://evil.com/clip.mp4"),
      ),
      BASE,
    );
    expect(out?.content.map((node) => node.attrs?.src)).toEqual([
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      `${BASE}events/x/clip.mp4`,
    ]);
  });

  it("cleans galleries, columns, callouts and buttons", () => {
    const out = sanitizeDoc(
      doc(
        { type: "gallery", attrs: { images: [{ src: IMG, alt: "" }, { src: "https://evil.com/x.png" }], columns: 9 } },
        { type: "columns", content: [{ type: "column", content: [p(t("a"))] }, { type: "column", content: [{ type: "gallery" }] }] },
        { type: "callout", attrs: { tone: "boom", color: "#123456" }, content: [p(t("c"))] },
        { type: "button", attrs: { label: "S'inscrire", href: "javascript:x" } },
        { type: "button", attrs: { label: "S'inscrire", href: "/fr/f/adhesion", variant: "accent" } },
      ),
      BASE,
    );
    expect(out?.content.map((node) => node.type)).toEqual(["gallery", "columns", "callout", "button"]);
    expect(out?.content[0].attrs).toMatchObject({ columns: 3, layout: "grid" });
    expect((out?.content[0].attrs?.images as unknown[]).length).toBe(1);
    expect(out?.content[1].content?.[1]).toEqual({ type: "column", content: [{ type: "paragraph" }] });
    expect(out?.content[2].attrs).toEqual({ tone: "info", color: "#123456" });
  });

  it("rejects non-documents and caps nesting depth", () => {
    expect(sanitizeDoc(null, BASE)).toBeNull();
    expect(sanitizeDoc({ type: "paragraph" }, BASE)).toBeNull();
    let deep: EventNode = p(t("deep"));
    for (let i = 0; i < 30; i += 1) deep = { type: "blockquote", content: [deep] };
    expect(sanitizeDoc(doc(deep), BASE)).toBeNull();
  });
});

describe("helpers", () => {
  it("detects empty documents and missing alt texts", () => {
    expect(isEmptyDoc(sanitizeDoc(doc({ type: "paragraph" }), BASE))).toBe(true);
    expect(isEmptyDoc(sanitizeDoc(doc(p(t("x"))), BASE))).toBe(false);
    const withImages = sanitizeDoc(
      doc({ type: "image", attrs: { src: IMG, alt: " " } }, { type: "gallery", attrs: { images: [{ src: IMG, alt: "ok" }, { src: IMG }] } }),
      BASE,
    );
    expect(imagesMissingAlt(withImages)).toBe(2);
  });

  it("lists media used in the document, including nested galleries", () => {
    const other = IMG.replace("photo", "other");
    const doc = sanitizeDoc(
      doc_(
        { type: "columns", content: [{ type: "column", content: [{ type: "image", attrs: { src: IMG, alt: "a" } }] }, { type: "column", content: [p(t("x"))] }] },
        { type: "gallery", attrs: { images: [{ src: other, alt: "b" }] } },
      ),
      BASE,
    );
    expect([...docMediaUrls(doc)].sort()).toEqual([IMG, other].sort());
  });

  it("checks own media and hrefs", () => {
    expect(isOwnMedia(IMG, BASE)).toBe(true);
    expect(isOwnMedia(`${BASE}a b.png`, BASE)).toBe(false);
    expect(isOwnMedia(IMG, "http://insecure/")).toBe(false);
    expect(safeHref("mailto:club@x.dz")).toBe("mailto:club@x.dz");
    expect(safeHref(" JavaScript:alert(1)")).toBeNull();
  });
});

describe("parseVideoUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10", "youtube", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "youtube", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://youtube.com/shorts/dQw4w9WgXcQ", "youtube", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://vimeo.com/123456789", "vimeo", "https://player.vimeo.com/video/123456789"],
    ["https://www.instagram.com/reel/C1a2B3c4D5e/", "instagram", "https://www.instagram.com/reel/C1a2B3c4D5e/embed"],
    ["https://www.tiktok.com/@club/video/7301234567890123456", "tiktok", "https://www.tiktok.com/embed/v2/7301234567890123456"],
    ["https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view?usp=sharing", "drive", "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/preview"],
  ])("parses %s", (url, provider, embedUrl) => {
    expect(parseVideoUrl(url)).toEqual({ provider, embedUrl });
    expect(isAllowedEmbed(provider, embedUrl)).toBe(true);
  });

  it("parses Facebook videos into the plugin embed", () => {
    const parsed = parseVideoUrl("https://www.facebook.com/lifesavers/videos/1234567890/");
    expect(parsed?.provider).toBe("facebook");
    expect(parsed?.embedUrl).toBe(
      "https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Flifesavers%2Fvideos%2F1234567890%2F&show_text=false",
    );
    expect(isAllowedEmbed("facebook", parsed?.embedUrl)).toBe(true);
  });

  it.each(["https://evil.com/watch?v=dQw4w9WgXcQ", "javascript:alert(1)", "https://www.youtube.com/watch?v=short", "not a url", "https://www.facebook.com/lifesavers"])(
    "rejects %s",
    (url) => expect(parseVideoUrl(url)).toBeNull(),
  );
});
