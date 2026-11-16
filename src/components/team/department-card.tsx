import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { localized } from "@/lib/events/utils";
import { departmentCardStyle } from "@/lib/team/theme";
import type { DepartmentCard as Card } from "@/lib/team/types";
import { PersonPhoto } from "./person-photo";

/**
 * A department on /team, in the department's own colours (band, ring, accent text).
 * The whole card links to the department page. `preview` renders it without a link (admin).
 */
export function DepartmentCard({ department, locale, cta, preview = false }: { department: Card; locale: string; cta: string; preview?: boolean }) {
  const name = localized(department.name_fr, department.name_en, locale);
  const tagline = localized(department.tagline_fr, department.tagline_en, locale);
  const body = (
    <>
      <span aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ background: "var(--dept-band)" }} />
      <PersonPhoto
        url={department.leader_photo_url}
        name={department.leader_name || name}
        focus={department.leader_photo_focus}
        ring="var(--dept-ring)"
      />
      <h3 className="mt-4 font-extrabold text-ink">{name}</h3>
      {department.leader_name && (
        <p className="text-sm font-bold" style={{ color: "var(--dept-text)" }}>
          {department.leader_name}
        </p>
      )}
      {tagline && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{tagline}</p>}
      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-extrabold" style={{ color: "var(--dept-text)" }}>
        {cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
      </span>
    </>
  );
  const className =
    "card-lift group relative flex h-full flex-col items-center overflow-hidden rounded-card border border-border bg-white p-5 pt-7 text-center";

  if (preview) {
    return (
      <div className={className} style={departmentCardStyle(department.theme)}>
        {body}
      </div>
    );
  }
  return (
    <Link
      href={`/team/${department.slug}`}
      className={`${className} focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue`}
      style={departmentCardStyle(department.theme)}
    >
      {body}
    </Link>
  );
}
