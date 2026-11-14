import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

function secretKey() {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is not set");
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptSecret(value: string) {
  const payload = Buffer.from(value, "base64url");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", secretKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function signState(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secretKey()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyState<T>(state: string): T | null {
  try {
    const [body, signature] = state.split(".");
    if (!body || !signature) return null;

    const expected = createHmac("sha256", secretKey()).update(body).digest("base64url");
    const given = Buffer.from(signature, "base64url");
    const wanted = Buffer.from(expected, "base64url");
    if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null;

    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & {
      exp?: number;
    };
    if (typeof parsed.exp === "number" && parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
