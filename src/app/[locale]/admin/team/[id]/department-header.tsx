"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Eye, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LinkPending } from "@/components/ui/link-pending";
import { publishDepartment, unpublishDepartment } from "@/lib/team/actions";
import { flushPendingSaves, hasPendingSaves } from "@/lib/team/autosave";
import { cn } from "@/lib/utils";

const TABS = ["details", "content", "design", "media"] as const;

/** Name, status, view / publish buttons and the four editor tabs (same as the event editor). */
export function DepartmentHeader({
  locale,
  department,
}: {
  locale: string;
  department: { id: string; slug: string; name: string; status: "draft" | "published" };
}) {
  const t = useTranslations("adminTeam.editor");
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const base = `/admin/team/${department.id}`;
  const published = department.status === "published";

  // Tabs and "Back" send any waiting autosave before leaving the page.
  async function leave(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!hasPendingSaves() || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    await flushPendingSaves();
    router.push(href);
  }

  function publish() {
    startTransition(async () => {
      // Publish checks what is stored: save the last edits first.
      await flushPendingSaves();
      const result = await publishDepartment(department.id);
      if (result.ok) {
        toast.success(t("published"));
        router.refresh();
        return;
      }
      if (result.error === "incomplete" && "problems" in result) {
        toast.error(t("incomplete"), {
          description: result.problems.map((problem) => `• ${t(`problems.${problem}`)}`).join("\n"),
          duration: 8000,
        });
        return;
      }
      toast.error(t("failed"));
    });
  }

  function unpublish() {
    startTransition(async () => {
      const result = await unpublishDepartment(department.id);
      if (!result.ok) return void toast.error(t("failed"));
      toast.success(t("unpublished"));
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link href="/admin/team" onClick={(e) => void leave(e, "/admin/team")} className="text-xs font-bold text-blue hover:underline">
            ← {t("back")}
          </Link>
          <h1 className="mt-1 truncate text-2xl font-extrabold text-blue">{department.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className={cn("rounded-full px-2.5 py-1 font-bold uppercase tracking-wide", published ? "bg-green/10 text-green" : "bg-muted text-muted-foreground")}>
              {t(published ? "statusPublished" : "statusDraft")}
            </span>
            <span className="truncate">/team/{department.slug}</span>
          </div>
        </div>

        <div data-tour="editor.publish" className="flex flex-wrap items-center gap-2">
          <a
            href={`/${locale}/team/${department.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-grey hover:border-blue hover:text-blue"
          >
            {published ? <ExternalLink className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {t(published ? "view" : "preview")}
          </a>
          {published ? (
            <button
              type="button"
              onClick={unpublish}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-grey hover:border-pink hover:text-pink disabled:opacity-60"
            >
              <Undo2 className="h-3.5 w-3.5" />
              {t("unpublish")}
            </button>
          ) : (
            <button
              type="button"
              onClick={publish}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-pink px-5 py-2 text-xs font-extrabold text-white shadow-glow hover:opacity-90 disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              {pending ? t("publishing") : t("publish")}
            </button>
          )}
        </div>
      </div>

      <nav data-tour="editor.tabs" aria-label={t("tabsLabel")} className="mt-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((tab) => {
          const href = `${base}/${tab}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={tab}
              href={href}
              onClick={(e) => void leave(e, href)}
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
