import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendChunks } from "./upload";

const MiB = 1024 * 1024;

/** A fake Google resumable-upload session: remembers how many bytes it has. */
class FakeGoogle {
  received = 0;
  /** Number of next requests that fail as if the connection dropped. */
  drops = 0;
  /** Bytes Google keeps from a chunk that was cut mid-way. */
  keepOnDrop = 0;
  expired = false;
  starts: number[] = [];
  constructor(readonly total: number) {}
}

let google: FakeGoogle;

class FakeXHR {
  status = 0;
  responseText = "";
  upload: { onprogress: ((event: { loaded: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  private headers: Record<string, string> = {};
  private range: string | null = null;

  open() {}
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  getResponseHeader(name: string) {
    return name === "Range" ? this.range : null;
  }
  abort() {
    this.onabort?.();
  }
  send() {
    setTimeout(() => this.answer(), 0);
  }

  private reply(status: number) {
    this.status = status;
    if (status === 308 && google.received > 0) this.range = `bytes=0-${google.received - 1}`;
    if (status === 200) this.responseText = JSON.stringify({ id: "drive-file-1" });
    this.onload?.();
  }

  private answer() {
    const contentRange = this.headers["Content-Range"];
    if (google.drops > 0) {
      google.drops -= 1;
      if (!contentRange.startsWith("bytes */")) google.received += google.keepOnDrop;
      return this.onerror?.();
    }
    if (google.expired) return this.reply(404);
    if (contentRange.startsWith("bytes */")) return this.reply(google.received >= google.total ? 200 : 308);

    const [, start, end] = contentRange.match(/bytes (\d+)-(\d+)\//)!.map(Number);
    google.starts.push(start);
    if (start !== google.received) throw new Error(`client sent from ${start}, Google has ${google.received}`);
    google.received = end + 1;
    this.reply(google.received >= google.total ? 200 : 308);
  }
}

const onlineState = { onLine: true };

function run(file: File, resume = false) {
  const progress: number[] = [];
  const waiting: boolean[] = [];
  const promise = sendChunks("https://upload.example/session", file, {
    signal: new AbortController().signal,
    onProgress: (sent) => progress.push(sent),
    onWaiting: (value) => waiting.push(value),
    resume,
  });
  return { promise, progress, waiting };
}

/** Drives fake timers until the upload settles. */
async function settle<T>(promise: Promise<T>) {
  let outcome: { value?: T; error?: unknown } | null = null;
  promise.then(
    (value) => (outcome = { value }),
    (error) => (outcome = { error }),
  );
  for (let i = 0; i < 500 && !outcome; i += 1) await vi.advanceTimersByTimeAsync(1_000);
  if (!outcome) throw new Error("upload never settled");
  const result = outcome as { value?: T; error?: unknown };
  if ("error" in result && result.error !== undefined) throw result.error;
  return result.value as T;
}

const fileOf = (size: number) => new File([new Uint8Array(size)], "clip.mp4", { type: "video/mp4" });

beforeEach(() => {
  vi.useFakeTimers();
  onlineState.onLine = true;
  vi.stubGlobal("XMLHttpRequest", FakeXHR);
  vi.stubGlobal("navigator", onlineState);
  vi.stubGlobal("window", new EventTarget());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("sendChunks", () => {
  it("uploads in 8 MiB chunks", async () => {
    google = new FakeGoogle(20 * MiB);
    const id = await settle(run(fileOf(20 * MiB)).promise);
    expect(id).toBe("drive-file-1");
    expect(google.starts).toEqual([0, 8 * MiB, 16 * MiB]);
  });

  it("continues from what Google kept after a short drop, never from 0", async () => {
    google = new FakeGoogle(24 * MiB);
    const file = fileOf(24 * MiB);
    // Second chunk is cut: Google kept 3 MiB of it.
    const upload = run(file);
    await vi.advanceTimersByTimeAsync(0);
    google.drops = 1;
    google.keepOnDrop = 3 * MiB;
    const id = await settle(upload.promise);
    expect(id).toBe("drive-file-1");
    expect(google.starts).toEqual([0, 11 * MiB, 19 * MiB]);
    expect(upload.waiting).toContain(true);
    expect(upload.waiting.at(-1)).toBe(false);
  });

  it("waits while offline for as long as it takes, then resumes", async () => {
    google = new FakeGoogle(16 * MiB);
    const upload = run(fileOf(16 * MiB));
    await vi.advanceTimersByTimeAsync(0); // first chunk sent
    onlineState.onLine = false;
    google.drops = 1;

    // An hour offline: the upload must still be waiting, not failed.
    let failed = false;
    upload.promise.catch(() => (failed = true));
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(failed).toBe(false);
    expect(google.received).toBe(8 * MiB);

    onlineState.onLine = true;
    window.dispatchEvent(new Event("online"));
    expect(await settle(upload.promise)).toBe("drive-file-1");
    expect(google.starts).toEqual([0, 8 * MiB]);
  });

  it("gives up with 'network' after about 5 minutes of failures while online", async () => {
    google = new FakeGoogle(16 * MiB);
    google.drops = 1_000;
    await expect(settle(run(fileOf(16 * MiB)).promise)).rejects.toThrow("network");
  });

  it("resumes a saved session from where Google stopped (Retry)", async () => {
    google = new FakeGoogle(24 * MiB);
    google.received = 12 * MiB; // a previous attempt got halfway
    const upload = run(fileOf(24 * MiB), true);
    expect(await settle(upload.promise)).toBe("drive-file-1");
    expect(google.starts).toEqual([12 * MiB, 20 * MiB]);
    expect(upload.progress[0]).toBe(12 * MiB);
  });

  it("returns at once when a saved session had already finished", async () => {
    google = new FakeGoogle(8 * MiB);
    google.received = 8 * MiB;
    expect(await settle(run(fileOf(8 * MiB), true).promise)).toBe("drive-file-1");
    expect(google.starts).toEqual([]);
  });

  it("reports an expired session so the caller can start over", async () => {
    google = new FakeGoogle(8 * MiB);
    google.expired = true;
    await expect(settle(run(fileOf(8 * MiB), true).promise)).rejects.toThrow("session_expired");
  });
});
