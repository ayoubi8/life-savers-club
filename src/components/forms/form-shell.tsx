import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { pageTextClass, themeStyle, type FormTheme } from "@/lib/forms/theme";

/** The page around a form: themed background, header band (cover or gradient), logo and card. */
export function FormShell({
  theme,
  coverUrl,
  logoUrl,
  title,
  description,
  banner,
  footer,
  compact = false,
  children,
}: {
  theme: FormTheme;
  coverUrl: string | null;
  logoUrl: string | null;
  title: string;
  description?: string;
  banner?: ReactNode;
  footer?: ReactNode;
  /** Smaller header, used by the design preview. */
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("form-theme relative overflow-hidden", compact ? "rounded-card" : "min-h-screen")}
      style={themeStyle(theme)}
    >
      <div
        className={cn("form-header relative", compact ? "h-28" : "h-44 sm:h-56")}
        style={
          coverUrl
            ? { backgroundImage: `url("${coverUrl}")`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        {coverUrl && <div className="absolute inset-0 bg-black/20" />}
      </div>

      <main className={cn("relative mx-auto max-w-3xl px-4", compact ? "-mt-10 pb-6" : "-mt-24 pb-16 sm:-mt-32")}>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- user-supplied logo, any host
          <img
            src={logoUrl}
            alt=""
            className={cn(
              "relative mb-3 rounded-2xl border-4 border-white bg-white object-contain shadow-soft",
              compact ? "h-14 w-14" : "h-20 w-20",
            )}
          />
        )}
        {banner}
        <div className={cn("form-card border border-border bg-white shadow-soft", compact ? "p-5" : "p-6 sm:p-10")}>
          <h1 className={cn("font-extrabold text-grey", compact ? "text-2xl" : "text-3xl sm:text-4xl")}>
            {title}
          </h1>
          {description && (
            <p className={cn("mt-3 whitespace-pre-line", pageTextClass({ ...theme, background: "#ffffff" }))}>
              {description}
            </p>
          )}
          <div className="form-header my-6 h-1.5 w-24 rounded-full" />
          {children}
        </div>
        {footer}
      </main>
    </div>
  );
}
