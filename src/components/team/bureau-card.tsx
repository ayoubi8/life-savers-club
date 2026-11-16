import type { BureauMember } from "@/lib/team/types";
import { PersonPhoto } from "./person-photo";

const RINGS = {
  president: "linear-gradient(135deg, var(--brand-pink), #ff9db1)",
  vice_president: "linear-gradient(135deg, var(--brand-blue), #7db4e6)",
} as const;

/** President / vice-president: a person card (no link), larger than department cards. */
export function BureauCard({ member, locale }: { member: BureauMember; locale: string }) {
  const role = locale === "en" ? member.role_en : member.role_fr;
  const bio = (locale === "en" && member.bio_en.trim() ? member.bio_en : member.bio_fr).trim();
  return (
    <article className="card-lift flex h-full flex-col items-center rounded-card border border-border bg-white p-6 text-center sm:p-8">
      <PersonPhoto url={member.photo_url} name={member.full_name} focus={member.photo_focus} ring={RINGS[member.position]} size="lg" />
      <p className="mt-5 text-xs font-extrabold uppercase tracking-widest text-pink">{role}</p>
      <h3 className="mt-1 text-xl font-extrabold text-ink sm:text-2xl">{member.full_name}</h3>
      {bio && <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{bio}</p>}
    </article>
  );
}
