import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { can, isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getActiveAccount, getFolder, listAssets } from "@/lib/media/queries";
import { cleanFilters, parseFilters, RESOLUTION_LABELS, RESOLUTIONS, type AssetFilters } from "@/lib/media/schema";
import { cn } from "@/lib/utils";
import { FolderView } from "./folder-view";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MediaFolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; folderId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, folderId } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const [t, { profile }] = await Promise.all([getTranslations({ locale, namespace: "adminMedia" }), getSessionProfile()]);
  if (!can(profile, "media")) return redirect({ href: "/admin", locale });
  if (!UUID.test(folderId)) notFound();

  const supabase = await createClient();
  const account = await getActiveAccount(supabase);
  if (!account) return redirect({ href: "/admin/media", locale });

  const filters = parseFilters(query);
  const [folder, page, { data: others }] = await Promise.all([
    getFolder(supabase, folderId, account.id),
    listAssets(supabase, folderId, filters),
    supabase
      .from("media_folders")
      .select("id, name")
      .eq("account_id", account.id)
      .is("deleted_at", null)
      .neq("id", folderId)
      .order("name"),
  ]);
  if (!folder) notFound();

  const href = (change: Partial<AssetFilters>) => {
    // cleanFilters drops the resolution as soon as the type is no longer "videos".
    const next = cleanFilters({ ...filters, ...change });
    return {
      pathname: `/admin/media/${folderId}`,
      query: {
        ...(next.kind ? { kind: next.kind } : {}),
        ...(next.orientation ? { o: next.orientation } : {}),
        ...(next.resolution ? { r: next.resolution } : {}),
      },
    };
  };
  const chip = (active: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm font-bold transition",
      active ? "bg-blue text-white" : "border border-border bg-white text-grey hover:bg-muted",
    );

  const kinds = [
    { value: null, label: t("filters.all") },
    { value: "image" as const, label: t("filters.images") },
    { value: "video" as const, label: t("filters.videos") },
  ];
  const shapes = [
    { value: null, label: t("filters.allShapes") },
    { value: "horizontal" as const, label: t("filters.horizontal") },
    { value: "vertical" as const, label: t("filters.vertical") },
    { value: "square" as const, label: t("filters.square") },
  ];

  const resolutions = [
    { value: null, label: t("filters.allResolutions") },
    ...RESOLUTIONS.map((value) => ({ value, label: value === "sd" ? t("filters.sd") : RESOLUTION_LABELS[value] })),
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/media" className="inline-flex items-center gap-1 text-sm font-bold text-blue hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("back")}
      </Link>
      <h1 className="mt-2 break-words text-2xl font-extrabold text-blue">{folder.name}</h1>

      <nav data-tour="media.filters" aria-label={t("filters.label")} className="mb-5 mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("filters.kindLabel")}>
          {kinds.map((kind) => (
            <Link key={kind.label} href={href({ kind: kind.value })} className={chip(filters.kind === kind.value)} aria-current={filters.kind === kind.value ? "page" : undefined}>
              {kind.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("filters.shapeLabel")}>
          {shapes.map((shape) => (
            <Link
              key={shape.label}
              href={href({ orientation: shape.value })}
              className={chip(filters.orientation === shape.value)}
              aria-current={filters.orientation === shape.value ? "page" : undefined}
            >
              {shape.label}
            </Link>
          ))}
        </div>
        {filters.kind === "video" && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("filters.resolutionLabel")}>
            {resolutions.map((resolution) => (
              <Link
                key={resolution.label}
                href={href({ resolution: resolution.value })}
                className={chip(filters.resolution === resolution.value)}
                aria-current={filters.resolution === resolution.value ? "page" : undefined}
              >
                {resolution.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <FolderView
        folderId={folder.id}
        admin={isAdmin(profile)}
        filters={filters}
        initial={page}
        folders={(others ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
