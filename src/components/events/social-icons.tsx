import type { SocialNetwork } from "@/lib/events/types";

/** Display names (brand names, not translated). */
export const SOCIAL_NAMES: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

/** Example URL shown as placeholder in the admin. */
export const SOCIAL_PLACEHOLDERS: Record<SocialNetwork, string> = {
  instagram: "https://www.instagram.com/p/…",
  facebook: "https://www.facebook.com/…/posts/…",
  tiktok: "https://www.tiktok.com/@…/video/…",
};

/** Brand marks (not in lucide), drawn inline in their brand colour. */
export function SocialIcon({ network, className = "size-[18px] shrink-0" }: { network: SocialNetwork; className?: string }) {
  if (network === "instagram") {
    return (
      <svg viewBox="0 0 24 24" width={18} height={18} className={className} aria-hidden>
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="#e1306c" strokeWidth="2.2" />
        <circle cx="12" cy="12" r="4.3" fill="none" stroke="#e1306c" strokeWidth="2.2" />
        <circle cx="17.4" cy="6.6" r="1.3" fill="#e1306c" />
      </svg>
    );
  }
  if (network === "facebook") {
    return (
      <svg viewBox="0 0 24 24" width={18} height={18} className={className} fill="#1877f2" aria-hidden>
        <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.5 2.9h-2.3v7A10 10 0 0 0 22 12Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} className={className} fill="currentColor" aria-hidden>
      <path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z" />
    </svg>
  );
}
