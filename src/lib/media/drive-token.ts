// Server only: reads the service-role client and the encrypted refresh token.
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/google/crypto";
import { isRevokedGrant, refreshAccessToken } from "@/lib/google/oauth";

export type DriveAccount = { id: string; google_email: string; root_folder_id: string };

/** Thrown when no Google account is connected, or Google revoked the saved one. */
export class DriveDisconnectedError extends Error {
  constructor() {
    super("drive_disconnected");
  }
}

// Access tokens live about an hour: keep them in memory instead of refreshing on every request.
const tokens = new Map<string, { token: string; expiresAt: number }>();

/**
 * The active library account and a valid access token for it. Uses the service role, so
 * callers must check the user's permission first (requireSection("media")).
 */
export async function getDriveAccess(): Promise<{ account: DriveAccount; token: string }> {
  const admin = createAdminClient();
  if (!admin) throw new DriveDisconnectedError();
  const { data } = await admin
    .from("drive_accounts")
    .select("id, google_email, root_folder_id, refresh_token_enc")
    .eq("is_active", true)
    .maybeSingle();
  if (!data) throw new DriveDisconnectedError();
  const account = { id: data.id as string, google_email: data.google_email as string, root_folder_id: data.root_folder_id as string };

  const cached = tokens.get(account.id);
  if (cached && cached.expiresAt > Date.now()) return { account, token: cached.token };

  try {
    const fresh = await refreshAccessToken(decryptSecret(data.refresh_token_enc as string));
    // Refresh 5 minutes early so a long download never starts with a token about to expire.
    const lifetime = Math.max(60, (fresh.expires_in ?? 3600) - 300) * 1000;
    tokens.set(account.id, { token: fresh.access_token, expiresAt: Date.now() + lifetime });
    return { account, token: fresh.access_token };
  } catch (error) {
    if (isRevokedGrant(error)) throw new DriveDisconnectedError();
    throw error;
  }
}

/** Forget a cached token (after reconnecting an account, or when Google rejects it). */
export function forgetDriveToken(accountId: string) {
  tokens.delete(accountId);
}
