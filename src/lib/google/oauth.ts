// Google OAuth token calls shared by the Sheets and Drive integrations.

export type GoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

async function tokenRequest(body: Record<string, string>) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth is not configured");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...body }),
    cache: "no-store",
  });

  if (!response.ok) {
    // Keep Google's error code ("invalid_grant" = the account revoked access or the token expired).
    const detail = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(`Google token request failed (${response.status}${detail?.error ? ` ${detail.error}` : ""})`);
  }
  return (await response.json()) as GoogleTokens;
}

export function exchangeCode(code: string, redirectUri: string) {
  return tokenRequest({
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
}

export function refreshAccessToken(refreshToken: string) {
  return tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" });
}

/** True when Google refused a refresh token for good (revoked, expired, password change…). */
export function isRevokedGrant(error: unknown) {
  return error instanceof Error && error.message.includes("invalid_grant");
}
