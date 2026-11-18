import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Folder, HardDrive, Image as ImageIcon, Video } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { can, isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { about } from "@/lib/google/drive";
import { isGoogleConfigured } from "@/lib/google/config";
import { DriveDisconnectedError, getDriveAccess } from "@/lib/media/drive-token";
import { getActiveAccount, listDeleteRequests, listFolders } from "@/lib/media/queries";
import { formatBytes } from "@/lib/media/schema";
import { ChangeAccountButton, FolderMenu, NewFolderButton } from "./library-client";
import { DeleteRequests } from "./delete-requests";

const KNOWN_ERRORS = new Set([
  "denied",
  "invalid_state",
  "not_configured",
  "forbidden",
  "no_refresh_token",
  "scope_missing",
  "google_failed",
  "connection_failed",
]);

export default async function MediaLibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const [t, { profile }] = await Promise.all([getTranslations({ locale, namespace: "adminMedia" }), getSessionProfile()]);
  if (!can(profile, "media")) return redirect({ href: "/admin", locale });

  const supabase = await createClient();
  const account = await getActiveAccount(supabase);
  const admin = isAdmin(profile);
  const [folders, requests] = account
    ? await Promise.all([listFolders(supabase, account.id), admin ? listDeleteRequests(supabase, account.id) : []])
    : [[], []];
  const connectUrl = `/api/integrations/google/drive/start?locale=${locale}`;
  const fileCount = folders.reduce((sum, folder) => sum + folder.images + folder.videos, 0);
  const error = typeof query.error === "string" && KNOWN_ERRORS.has(query.error) ? query.error : null;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-blue">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {account && <NewFolderButton />}
      </header>

      {query.connected === "1" && (
        <p role="status" className="mb-4 rounded-card border border-green/30 bg-green/5 px-4 py-3 text-sm font-semibold text-green">
          {t("connected")}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-card border border-pink/30 bg-pink/5 px-4 py-3 text-sm font-semibold text-pink">
          {t(`errors.${error}`)}
        </p>
      )}

      {!account ? (
        <section className="max-w-xl rounded-card border border-dashed border-border bg-white p-6">
          <HardDrive className="h-8 w-8 text-blue" aria-hidden />
          <h2 className="mt-3 font-extrabold text-grey">{t("connectTitle")}</h2>
          {admin ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">{t("connectText")}</p>
              {isGoogleConfigured() ? (
                <a href={connectUrl} className="mt-4 inline-flex rounded-full bg-blue px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
                  {t("connectButton")}
                </a>
              ) : (
                <p className="mt-3 text-sm font-semibold text-pink">{t("errors.not_configured")}</p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{t("askAdmin")}</p>
          )}
        </section>
      ) : (
        <>
          <section data-tour="media.account" className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-border bg-white px-4 py-3">
            <p className="min-w-0 text-sm text-grey">
              <HardDrive className="mr-1.5 inline h-4 w-4 align-text-bottom text-blue" aria-hidden />
              {t.rich("connectedTo", { email: account.google_email, b: (chunks) => <strong className="break-all">{chunks}</strong> })}
            </p>
            <div className="min-w-48 flex-1">
              <Suspense fallback={<div className="h-2 animate-pulse rounded-full bg-border/70" />}>
                <StorageBar locale={locale} admin={admin} />
              </Suspense>
            </div>
            {admin && <ChangeAccountButton email={account.google_email} fileCount={fileCount} connectUrl={connectUrl} />}
          </section>

          {requests.length > 0 && <DeleteRequests requests={requests} />}

          {folders.length === 0 ? (
            <p data-tour="media.folder" className="rounded-card border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">{t("noFolders")}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {folders.map((folder, index) => (
                <li key={folder.id} data-tour={index === 0 ? "media.folder" : undefined} className="group relative rounded-card border border-border bg-white transition hover:border-blue focus-within:z-30">
                  <Link href={`/admin/media/${folder.id}`} className="block">
                    <div className="grid aspect-square place-items-center overflow-hidden rounded-t-card bg-muted sm:aspect-[16/9]">
                      {folder.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed, private thumbnail
                        <img src={folder.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <Folder className="h-8 w-8 text-border sm:h-10 sm:w-10" aria-hidden />
                      )}
                    </div>
                    <div className="p-2.5 pr-9 sm:p-4 sm:pr-12">
                      <h2 className="truncate text-sm font-bold text-grey sm:text-base">{folder.name}</h2>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-muted-foreground sm:text-xs">
                        {folder.images + folder.videos === 0 ? (
                          t("emptyFolder")
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1">
                              <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                              {t("photos", { count: folder.images })}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Video className="h-3.5 w-3.5" aria-hidden />
                              {t("videos", { count: folder.videos })}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </Link>
                  <div data-tour={index === 0 ? "media.folder-menu" : undefined} className="absolute bottom-2 right-1 sm:bottom-3 sm:right-2">
                    <FolderMenu admin={admin} folder={{ id: folder.id, name: folder.name, files: folder.images + folder.videos }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/** Drive space of the connected account. Streams in after the folders, so Google never slows the page. */
async function StorageBar({ locale, admin }: { locale: string; admin: boolean }) {
  const t = await getTranslations({ locale, namespace: "adminMedia" });
  let quota: { usage?: string; limit?: string } | undefined;
  try {
    const { token } = await getDriveAccess();
    quota = (await about(token)).storageQuota;
  } catch (error) {
    if (error instanceof DriveDisconnectedError) {
      return <p className="text-xs font-semibold text-pink">{admin ? t("errors.revokedAdmin") : t("errors.drive_disconnected")}</p>;
    }
    return null;
  }

  const used = Number(quota?.usage ?? 0);
  const limit = quota?.limit ? Number(quota.limit) : null;
  if (!limit) return <p className="text-xs font-semibold text-muted-foreground">{t("storageUnlimited", { used: formatBytes(used, locale) })}</p>;
  const share = Math.min(1, used / limit);
  const color = share >= 0.95 ? "bg-pink" : share >= 0.85 ? "bg-amber-500" : "bg-blue";
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, share * 100)}%` }} />
      </div>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">
        {t("storage", { used: formatBytes(used, locale), limit: formatBytes(limit, locale) })}
        {share >= 0.85 && <span className="ml-2 text-pink">{t("storageWarning")}</span>}
      </p>
    </div>
  );
}
