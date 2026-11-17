export function isGoogleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function googleRedirectUri(origin: string) {
  return process.env.GOOGLE_REDIRECT_URI || `${origin}/api/integrations/google/callback`;
}

/** OAuth callback of the media library (Google Drive). Must also be listed in Google Cloud Console. */
export function driveRedirectUri(origin: string) {
  return process.env.GOOGLE_DRIVE_REDIRECT_URI || `${origin}/api/integrations/google/drive/callback`;
}
