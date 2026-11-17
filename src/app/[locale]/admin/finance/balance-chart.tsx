import { formatDzd } from "@/lib/finance/schema";

const WIDTH = 640;
const HEIGHT = 200;
const PAD = { top: 12, right: 12, bottom: 24, left: 12 };

/** Balance of the year after each day with operations (inline SVG, no chart library). */
export function BalanceChart({
  points,
  locale,
  label,
}: {
  points: { date: string; balance: number }[];
  locale: string;
  label: string;
}) {
  if (points.length < 2) return null;
  const times = points.map((point) => Date.parse(point.date));
  const values = points.map((point) => point.balance);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const minV = Math.min(0, ...values);
  const maxV = Math.max(...values, 1);
  const x = (time: number) => PAD.left + ((time - minT) / Math.max(1, maxT - minT)) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) => PAD.top + (1 - (value - minV) / Math.max(1, maxV - minV)) * (HEIGHT - PAD.top - PAD.bottom);

  // Step line: the balance holds until the next operation.
  let path = `M ${x(times[0])} ${y(values[0])}`;
  for (let index = 1; index < points.length; index += 1) {
    path += ` H ${x(times[index])} V ${y(values[index])}`;
  }
  const area = `${path} V ${y(minV)} H ${x(times[0])} Z`;
  const last = points[points.length - 1];
  const dateFormat = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "short" });

  return (
    <figure className="rounded-card border border-border bg-white p-4">
      <figcaption className="mb-2 flex items-baseline justify-between gap-3 text-sm">
        <span className="font-bold text-grey">{label}</span>
        <span className="font-extrabold text-blue">{formatDzd(last.balance, locale)}</span>
      </figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={label}>
        <title>{`${label}: ${points.map((point) => `${point.date} ${formatDzd(point.balance, locale)}`).join(", ")}`}</title>
        {minV < 0 && (
          <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(0)} y2={y(0)} stroke="currentColor" className="text-pink/40" strokeDasharray="4 4" />
        )}
        <path d={area} className="fill-blue/10" />
        <path d={path} fill="none" stroke="currentColor" strokeWidth={2} className="text-blue" vectorEffect="non-scaling-stroke" />
        <text x={PAD.left} y={HEIGHT - 6} className="fill-muted-foreground text-[11px]">
          {dateFormat.format(minT)}
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end" className="fill-muted-foreground text-[11px]">
          {dateFormat.format(maxT)}
        </text>
      </svg>
    </figure>
  );
}

/** Horizontal bars of totals by category. */
export function CategoryBars({ title, items, locale, color }: { title: string; items: { label: string; amount: number }[]; locale: string; color: string }) {
  if (!items.length) return null;
  const max = Math.max(...items.map((item) => item.amount), 1);
  return (
    <section className="rounded-card border border-border bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-grey">{title}</h3>
      <ul className="space-y-2">
        {items.slice(0, 8).map((item) => (
          <li key={item.label} className="text-sm">
            <div className="flex justify-between gap-3">
              <span className="truncate text-grey">{item.label}</span>
              <span className="shrink-0 font-semibold text-ink">{formatDzd(item.amount, locale)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, (item.amount / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
