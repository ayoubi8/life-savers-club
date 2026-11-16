import Image from "next/image";
import type { DepartmentFull } from "@/lib/team/types";

/**
 * Department page header, in the layout chosen in its Design tab (same three layouts
 * as event pages): full-bleed photo with overlay, split, or a minimal colour band.
 * Without a header image the minimal band is used.
 */
export function DepartmentHero({
  department,
  name,
  tagline,
  eyebrow,
}: {
  department: Pick<DepartmentFull, "cover_url" | "cover_alt" | "cover_focus" | "theme">;
  name: string;
  tagline: string;
  eyebrow: string;
}) {
  const layout = department.cover_url ? department.theme.headerLayout : "minimal";
  const cover = department.cover_url ? (
    <Image
      src={department.cover_url}
      alt={department.cover_alt || name}
      fill
      priority
      sizes={layout === "split" ? "(min-width: 768px) 50vw, 100vw" : "100vw"}
      quality={85}
      className="object-cover"
      style={{ objectPosition: `${department.cover_focus.x}% ${department.cover_focus.y}%` }}
    />
  ) : null;

  const text = (tone: "light" | "dark") => (
    <>
      <p className={tone === "light" ? "mb-3 text-sm font-extrabold uppercase tracking-widest text-white/85" : "mb-3 text-sm font-extrabold uppercase tracking-widest text-[var(--event-link)]"}>
        {eyebrow}
      </p>
      <h1 className={tone === "light" ? "max-w-4xl text-4xl font-extrabold leading-tight drop-shadow sm:text-5xl lg:text-6xl" : "text-4xl font-extrabold leading-tight text-[var(--event-heading)] sm:text-5xl"}>
        {name}
      </h1>
      {tagline && <p className={tone === "light" ? "mt-4 max-w-2xl text-lg text-white/90" : "mt-4 text-lg opacity-85"}>{tagline}</p>}
    </>
  );

  if (layout === "fullBleed") {
    return (
      <header className="relative isolate flex min-h-[24rem] items-end overflow-hidden text-white sm:min-h-[30rem] lg:min-h-[36rem]">
        {cover}
        <div aria-hidden className="absolute inset-0 bg-black" style={{ opacity: "var(--event-overlay)" }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="relative mx-auto w-full max-w-5xl px-4 pb-10 pt-24 sm:px-6 sm:pb-14">{text("light")}</div>
      </header>
    );
  }

  if (layout === "split") {
    return (
      <header className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-10 sm:px-6 md:grid-cols-2 md:pt-16">
        <div>{text("dark")}</div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--form-card-radius,1.25rem)] shadow-xl">{cover}</div>
      </header>
    );
  }

  return (
    <>
      <header className="event-band text-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">{text("light")}</div>
      </header>
      {cover && (
        <div className="mx-auto -mt-8 max-w-5xl px-4 sm:px-6">
          <div className="relative aspect-[21/9] overflow-hidden rounded-[var(--form-card-radius,1.25rem)] shadow-xl">{cover}</div>
        </div>
      )}
    </>
  );
}
