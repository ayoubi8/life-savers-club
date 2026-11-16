"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Eye, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LinkPending } from "@/components/ui/link-pending";
import { publishEvent, unpublishEvent } from "@/lib/events/actions";
import { cn } from "@/lib/utils";

const TABS = ["details", "content", "design", "media"] as const;
const statusClass = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-green/10 text-green",
  archived: "bg-border text-muted-foreground",
} as const;

export function EventHeader({
  locale,
  event,
}: {
  locale: string;
  event: { id: string; slug: string; title: string; status: "draft" | "published" | "archived"; startsAt: string };
}) {
  const t = useTranslations("adminEvents");
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const base = `/admin/events/${event.id}`;
  const published = event.status === "published";

  function publish() {
    startTransition(async () => {
      const result = await publishEvent(event.id);
      if (result.ok) {
        toast.success(t("publish.published"));
        router.refresh();
        return;
      }
      if (result.error === "incomplete" && "problems" in result) {
        toast.error(t("publish.incomplete"), {
          description: result.problems.map((problem) => `• ${t(`publish.problems.${problem}`)}`).join("\n"),
          duration: 8000,
        });
        return;
      }
      toast.error(t("failed"));
    });
  }

  function unpublish() {
    startTransition(async () => {
      const result = await unpublishEvent(event.id);
      if (!result.ok) return void toast.error(t("failed"));
      toast.success(t("publish.unpublished"));
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link href="/admin/events" className="text-xs font-bold text-blue hover:underline">
            ← {t("back")}
          </Link>
          <h1 className="mt-1 truncate text-2xl font-extrabold text-blue">{event.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className={cn("rounded-full px-2.5 py-1 font-bold uppercase tracking-wide", statusClass[event.status])}>
              {t(`status.${event.status}`)}
            </span>
            <span className="truncate">/events/{event.slug}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/${locale}/events/${event.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-grey hover:border-blue hover:text-blue"
          >
            {published ? <ExternalLink className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {t("view")}
          </a>
          {published ? (
            <button
              type="button"
              onClick={unpublish}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-grey hover:border-pink hover:text-pink disabled:opacity-60"
            >
              <Undo2 className="h-3.5 w-3.5" />
              {t("publish.unpublish")}
            </button>
          ) : (
            <button
              type="button"
              onClick={publish}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-pink px-5 py-2 text-xs font-extrabold text-white shadow-glow hover:opacity-90 disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              {pending ? t("publish.publishing") : t("publish.publish")}
            </button>
          )}
        </div>
      </div>

      <nav aria-label={t("tabs.label")} className="mt-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((tab) => {
          const href = `${base}/${tab}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={tab}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition",
                active ? "border-blue text-blue" : "border-transparent text-muted-foreground hover:text-grey",
              )}
            >
              {t(`tabs.${tab}`)}
              <LinkPending />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
