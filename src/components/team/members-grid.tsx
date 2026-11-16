import type { DepartmentMember } from "@/lib/team/types";
import { PersonPhoto } from "./person-photo";

/** One card per member: photo and name only, in the department's colours. */
export function MembersGrid({ members }: { members: DepartmentMember[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
      {members.map((member) => (
        <li key={member.id} className="rounded-[var(--form-card-radius,1.25rem)] border border-current/10 p-4 text-center sm:p-5">
          <PersonPhoto
            url={member.photo_url}
            name={member.full_name}
            focus={member.photo_focus}
            ring="linear-gradient(135deg, var(--event-primary), var(--event-accent))"
            size="sm"
          />
          <p className="mt-3 font-extrabold leading-tight">{member.full_name}</p>
        </li>
      ))}
    </ul>
  );
}
