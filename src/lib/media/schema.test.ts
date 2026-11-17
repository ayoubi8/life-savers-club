import { describe, expect, it } from "vitest";
import {
  contentDisposition,
  decodeCursor,
  encodeCursor,
  finalizeSchema,
  formatDuration,
  kindOf,
  mimeOf,
  orientationOf,
  parseFilters,
  resolutionOf,
  uploadSessionSchema,
} from "./schema";

describe("orientationOf", () => {
  it("classifies by the longer side", () => {
    expect(orientationOf(1920, 1080)).toBe("horizontal");
    expect(orientationOf(1080, 1920)).toBe("vertical");
  });

  it("treats near-squares as square", () => {
    expect(orientationOf(1080, 1080)).toBe("square");
    expect(orientationOf(1080, 1040)).toBe("square");
    expect(orientationOf(1040, 1080)).toBe("square");
    expect(orientationOf(1200, 1080)).toBe("horizontal");
  });

  it("returns null when the size is unknown", () => {
    expect(orientationOf(null, 1080)).toBeNull();
    expect(orientationOf(0, 0)).toBeNull();
    expect(orientationOf(undefined, undefined)).toBeNull();
  });
});

describe("mimeOf / kindOf", () => {
  it("uses the browser type when it is known", () => {
    expect(mimeOf({ name: "a.bin", type: "video/mp4" })).toBe("video/mp4");
  });

  it("falls back to the extension for HEIC and MOV without a type", () => {
    expect(mimeOf({ name: "IMG_0001.HEIC", type: "" })).toBe("image/heic");
    expect(mimeOf({ name: "clip.mov", type: "" })).toBe("video/quicktime");
  });

  it("maps allowed types to their kind and refuses the rest", () => {
    expect(kindOf("image/png")).toBe("image");
    expect(kindOf("video/quicktime")).toBe("video");
    expect(kindOf("application/pdf")).toBeNull();
    expect(kindOf("image/svg+xml")).toBeNull();
  });
});

describe("uploadSessionSchema", () => {
  const base = { folderId: "6f1c1f9e-8c4b-4e57-9f6a-0d6f0c5b8a11", name: "gala.mp4", mimeType: "video/mp4", size: 1000 };

  it("accepts an allowed file", () => {
    expect(uploadSessionSchema.safeParse(base).success).toBe(true);
  });

  it("refuses other types, empty files and files over 10 GB", () => {
    expect(uploadSessionSchema.safeParse({ ...base, mimeType: "application/zip" }).success).toBe(false);
    expect(uploadSessionSchema.safeParse({ ...base, size: 0 }).success).toBe(false);
    expect(uploadSessionSchema.safeParse({ ...base, size: 11 * 1024 ** 3 }).success).toBe(false);
    expect(uploadSessionSchema.safeParse({ ...base, size: 9 * 1024 ** 3 }).success).toBe(true);
  });
});

describe("finalizeSchema", () => {
  it("refuses Drive ids with unexpected characters", () => {
    const folderId = "6f1c1f9e-8c4b-4e57-9f6a-0d6f0c5b8a11";
    expect(finalizeSchema.safeParse({ folderId, driveFileId: "1AbC-def_GHIjkl" }).success).toBe(true);
    expect(finalizeSchema.safeParse({ folderId, driveFileId: "../../etc?x=1" }).success).toBe(false);
  });
});

describe("resolutionOf", () => {
  it("classifies by the shorter side, so vertical and horizontal match", () => {
    expect(resolutionOf(1920, 1080)).toBe("fhd");
    expect(resolutionOf(1080, 1920)).toBe("fhd");
    expect(resolutionOf(3840, 2160)).toBe("uhd");
    expect(resolutionOf(2160, 3840)).toBe("uhd");
    expect(resolutionOf(2560, 1440)).toBe("qhd");
    expect(resolutionOf(1280, 720)).toBe("hd");
    expect(resolutionOf(854, 480)).toBe("sd");
  });

  it("tolerates odd sizes", () => {
    expect(resolutionOf(1920, 1072)).toBe("fhd");
    expect(resolutionOf(4096, 2048)).toBe("uhd");
    expect(resolutionOf(1080, 1080)).toBe("fhd");
  });

  it("returns null when the size is unknown", () => {
    expect(resolutionOf(null, 1080)).toBeNull();
  });
});

describe("parseFilters", () => {
  it("keeps only known values", () => {
    expect(parseFilters({ kind: "video", o: "vertical", r: "uhd" })).toEqual({ kind: "video", orientation: "vertical", resolution: "uhd" });
    expect(parseFilters({ kind: "pdf", o: ["vertical"], r: "8k" })).toEqual({ kind: null, orientation: null, resolution: null });
  });

  it("only filters by resolution when showing videos", () => {
    expect(parseFilters({ r: "fhd" }).resolution).toBeNull();
    expect(parseFilters({ kind: "image", r: "fhd" }).resolution).toBeNull();
    expect(parseFilters({ kind: "video", r: "fhd" }).resolution).toBe("fhd");
  });
});

describe("cursor", () => {
  it("round-trips and rejects junk", () => {
    const row = { created_at: "2026-11-17T10:00:00.123456+00:00", id: "6f1c1f9e-8c4b-4e57-9f6a-0d6f0c5b8a11" };
    expect(decodeCursor(encodeCursor(row))).toEqual({ createdAt: row.created_at, id: row.id });
    expect(decodeCursor("nope")).toBeNull();
    expect(decodeCursor("2026-11-17|not-a-uuid")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(null)).toBe("");
  });
});

describe("contentDisposition", () => {
  it("keeps the real name and an ASCII fallback", () => {
    const header = contentDisposition("Soirée gala.mp4", true);
    expect(header.startsWith("attachment;")).toBe(true);
    expect(header).toContain('filename="Soiree gala.mp4"');
    expect(header).toContain("filename*=UTF-8''Soir%C3%A9e%20gala.mp4");
  });
});
