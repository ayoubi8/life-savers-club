"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Check, Folder, Image as ImageIcon, Video, X } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { useConfirm } from "@/components/ui/confirm";
import { approveDeleteRequest, rejectDeleteRequest } from "@/lib/media/actions";
import type { DeleteRequest } from "@/lib/media/queries";
import { useMediaError } from "./library-client";

/** Admins only: deletions asked by media members, waiting for approval. */
export function DeleteRequests({ requests }: { requests: DeleteRequest[] }) {
  const t = useTranslations("adminMedia.requests");
  const format = useFormatter();
  const errorText = useMediaError();
  const router = useRouter();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);

  async function approve(request: DeleteRequest) {
    const ok = await confirm({
      title: request.files ? t("approveFilesTitle", { count: request.files.length }) : t("approveFolderTitle", { name: request.folder.name }),
      message: request.files ? t("approveFilesText") : t("approveFolderText", { count: request.folderFiles }),
      confirmLabel: t("approve"),
      danger: true,
    });
    if (!ok) return;
    setBusy(request.id);
    const result = await approveDeleteRequest(request.id);
    setBusy(null);
    if (!result.ok) return void toast.error(errorText(result.error));
    toast.success(t("approved"));
    if (result.failed) toast.error(t("partlyFailed", { count: result.failed }));
    router.refresh();
  }

  async function reject(request: DeleteRequest) {
    setBusy(request.id);
    const result = await rejectDeleteRequest(request.id);
    setBusy(null);
    if (!result.ok) return void toast.error(errorText(result.error));
    toast.success(t("rejected"));
    router.refresh();
  }

  return (
    <section className="mb-6 rounded-card border border-pink/30 bg-white">
      <h2 className="border-b border-border px-4 py-3 text-sm font-extrabold text-grey">{t("title", { count: requests.length })}</h2>
      <ul className="divide-y divide-border">
        {requests.map((request) => (
          <li key={request.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-grey">
                {t.rich(request.files ? "askFiles" : "askFolder", {
                  name: request.requester,
                  count: request.files?.length ?? 0,
                  b: (chunks) => <strong>{chunks}</strong>,
                })}{" "}
                <Link href={`/admin/media/${request.folder.id}`} className="inline-flex items-center gap-1 font-bold text-blue hover:underline">
                  <Folder className="h-3.5 w-3.5" aria-hidden />
                  {request.folder.name}
                </Link>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {format.relativeTime(new Date(request.created_at))}
                {!request.files && ` · ${t("folderFiles", { count: request.folderFiles })}`}
              </p>
              {request.files && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {request.files.slice(0, 8).map((file) => (
                    <li key={file.id} title={file.name} className="grid h-12 w-12 place-items-center overflow-hidden rounded-md bg-muted">
                      {file.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed, private thumbnail
                        <img src={file.thumbUrl} alt={file.name} loading="lazy" className="h-full w-full object-cover" />
                      ) : file.kind === "video" ? (
                        <Video className="h-4 w-4 text-grey" aria-label={file.name} />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-grey" aria-label={file.name} />
                      )}
                    </li>
                  ))}
                  {request.files.length > 8 && (
                    <li className="grid h-12 w-12 place-items-center rounded-md bg-muted text-xs font-bold text-grey">+{request.files.length - 8}</li>
                  )}
                </ul>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy === request.id}
                onClick={() => void reject(request)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-bold text-grey hover:bg-muted disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                {t("reject")}
              </button>
              <button
                type="button"
                disabled={busy === request.id}
                onClick={() => void approve(request)}
                className="inline-flex items-center gap-1.5 rounded-full bg-pink px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                {t("approve")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
