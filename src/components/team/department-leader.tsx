import type { CoverFocus } from "@/lib/events/types";
import { PersonPhoto } from "./person-photo";

/** "Responsable du département": big portrait, full name, role and a short bio, in the page theme. */
export function DepartmentLeader({
  name,
  role,
  bio,
  photoUrl,
  focus,
  label,
}: {
  name: string;
  role: string;
  bio: string;
  photoUrl: string | null;
  focus: CoverFocus;
  label: string;
}) {
  return (
    <section aria-labelledby="leader-title" className="mx-auto max-w-5xl px-4 sm:px-6">
      <div className="flex flex-col items-center gap-6 rounded-[var(--form-card-radius,1.25rem)] border border-current/10 p-6 text-center sm:p-10 md:flex-row md:gap-10 md:text-left">
        <PersonPhoto
          url={photoUrl}
          name={name}
          focus={focus}
          ring="linear-gradient(135deg, var(--event-primary), var(--event-accent))"
          size="xl"
          className="md:mx-0"
        />
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-widest text-[var(--event-link)]">{label}</p>
          <h2 id="leader-title" className="mt-1 text-3xl font-extrabold text-[var(--event-heading)] sm:text-4xl">
            {name}
          </h2>
          {role && <p className="mt-1 font-bold opacity-80">{role}</p>}
          {bio && <p className="mt-4 max-w-2xl text-lg leading-relaxed opacity-90">{bio}</p>}
        </div>
      </div>
    </section>
  );
}
