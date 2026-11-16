import Image from "next/image";
import type { CoverFocus } from "@/lib/events/types";
import { initials } from "@/lib/team/utils";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "h-20 w-20 sm:h-24 sm:w-24", text: "text-2xl", px: "96px" },
  md: { box: "h-24 w-24 sm:h-28 sm:w-28", text: "text-3xl", px: "112px" },
  lg: { box: "h-36 w-36 sm:h-44 sm:w-44", text: "text-5xl", px: "176px" },
  xl: { box: "h-48 w-48 sm:h-60 sm:w-60", text: "text-6xl", px: "240px" },
} as const;

/**
 * Round portrait inside a coloured ring (`ring` is any CSS background: gradient or colour).
 * Without a photo, the person's initials are shown on white, as before.
 */
export function PersonPhoto({
  url,
  name,
  focus,
  ring,
  size = "md",
  className,
}: {
  url: string | null;
  name: string;
  focus?: CoverFocus;
  ring: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div className={cn("mx-auto grid shrink-0 place-items-center rounded-full p-1", s.box, className)} style={{ background: ring }}>
      <span className="relative grid h-full w-full place-items-center overflow-hidden rounded-full bg-white">
        {url ? (
          <Image
            src={url}
            alt={name}
            fill
            sizes={s.px}
            className="object-cover"
            style={focus ? { objectPosition: `${focus.x}% ${focus.y}%` } : undefined}
          />
        ) : (
          <span aria-hidden className={cn("font-extrabold text-grey", s.text)}>
            {initials(name)}
          </span>
        )}
      </span>
    </div>
  );
}
