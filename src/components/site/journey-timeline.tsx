
import { Reveal } from "@/components/site/reveal";
import { SITE_ICONS } from "@/lib/site-content/icons";
import { tx, type Milestone } from "@/lib/site-content/schema";

/** ECG baseline with a heartbeat spike between each pair of milestones (viewBox 1000×96). */
function ecgPath(n: number) {
  let d = "M0 48";
  for (let k = 1; k < n; k++) {
    const b = Math.round((k * 1000) / n);
    d += ` H${b - 30} L${b - 20} 38 L${b - 12} 58 L${b} 10 L${b + 12} 84 L${b + 22} 48`;
  }
  return `${d} H1000`;
}

/**
 * Homepage "Our journey": milestones on an animated heartbeat line.
 * Desktop: years sit on the line, cards alternate above/below. Mobile: vertical rail.
 */
export function JourneyTimeline({
  items,
  locale,
  title,
  subtitle,
  now,
}: {
  items: Milestone[];
  locale: string;
  title: string;
  subtitle: string;
  now: React.ReactNode;
}) {
  // Oldest first, whatever order the steps were added in (non-numeric years keep their place at the end).
  const yearOf = (m: Milestone) => parseInt(m.year) || 99999;
  items = [...items].sort((a, b) => yearOf(a) - yearOf(b));
  const d = ecgPath(items.length);

  return (
    <section className="bg-hero relative overflow-hidden py-20 text-white">
      <div className="dots absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-extrabold sm:text-4xl">{title}</h2>
        <p className="mt-2 text-center font-semibold text-white/70">{subtitle}</p>

        <ol
          className="journey mt-12 md:mt-16"
          style={{ "--n": items.length } as React.CSSProperties}
        >
          <li className="journey-line" aria-hidden="true">
            <svg viewBox="0 0 1000 96" preserveAspectRatio="none" fill="none">
              <defs>
                <linearGradient id="journey-g" x1="0" x2="1">
                  <stop offset="0" stopColor="#2d74ba" />
                  <stop offset="0.55" stopColor="#ef4a6c" />
                  <stop offset="1" stopColor="#6ebd45" />
                </linearGradient>
              </defs>
              <path d={d} stroke="rgb(255 255 255 / .16)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <path
                className="journey-pulse"
                d={d}
                pathLength={1000}
                stroke="url(#journey-g)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </li>

          {items.map((m, i) => {
            const Icon = SITE_ICONS[m.icon];
            const style = { "--c": `var(--brand-${m.color})`, "--col": i + 1 } as React.CSSProperties;
            return (
              <li key={m.id} className="contents">
                <span className="journey-year" style={style}>{m.year}</span>
                {/* The slot is the grid item, so it needs --col too, or cards drift away from their year. */}
                <Reveal delay={i * 100} className={`journey-slot ${i % 2 ? "is-down" : ""}`} style={style}>
                  <article className="journey-card" style={style}>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--c)]">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <h3 className="mt-3 font-extrabold">{tx(m.title, locale)}</h3>
                    <p className="mt-1 text-sm text-white/70">{tx(m.text, locale)}</p>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ol>

        <p className="glass mx-auto mt-12 flex w-fit items-center gap-2.5 rounded-full px-4 py-2 text-center text-sm font-extrabold">
          <span className="pulse-dot h-2 w-2 shrink-0 rounded-full bg-pink" /> {now}
        </p>
      </div>
    </section>
  );
}
