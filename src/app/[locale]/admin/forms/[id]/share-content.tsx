"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Copy, Download, ExternalLink, Mail, MessageCircle, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type EmbedMode = "full" | "fixed" | "button";

async function copyText(text: string, ok: string, fail: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(ok);
  } catch {
    toast.error(fail);
  }
}

/** Link, QR code, quick-share buttons and embed presets. Used by the Share tab and the post-publish dialog. */
export function ShareContent({
  publicUrl,
  title,
  slug,
  published,
  settingsHref,
}: {
  publicUrl: string;
  title: string;
  slug: string;
  published: boolean;
  settingsHref: string;
}) {
  const t = useTranslations("adminForms");
  const [qr, setQr] = useState<string | null>(null);
  const [mode, setMode] = useState<EmbedMode>("full");
  const [height, setHeight] = useState(720);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(publicUrl, {
      width: 320,
      margin: 1,
      color: { dark: "#231f20", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [publicUrl]);

  const embed =
    mode === "button"
      ? `<a href="${publicUrl}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#2d74ba;color:#fff;font-weight:700;font-family:sans-serif;text-decoration:none">${t("share.buttonText")}</a>`
      : `<iframe src="${publicUrl}" width="100%" height="${mode === "full" ? 720 : height}" style="border:0" title="${title.replace(/"/g, "&quot;")}"></iframe>`;

  const message = encodeURIComponent(`${title}\n${publicUrl}`);
  const input = "w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-grey";
  const pill =
    "inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-bold text-grey hover:border-blue hover:text-blue";

  return (
    <div className="space-y-4">
      {!published && (
        <div className="rounded-card border border-pink/30 bg-pink/5 p-4 text-sm text-grey">
          {t("share.notPublished")}{" "}
          <Link href={settingsHref} className="font-bold text-blue underline">
            {t("tabs.settings")}
          </Link>
        </div>
      )}

      <section data-tour="share.link" className="rounded-card border border-border bg-white p-5">
        <h2 className="font-bold text-grey">{t("share.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("share.hint")}</p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input readOnly value={publicUrl} onFocus={(e) => e.currentTarget.select()} className={input} aria-label={t("share.title")} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => copyText(publicUrl, t("share.copied"), t("share.copyFailed"))}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-blue px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              <Copy className="h-4 w-4" />
              {t("share.copy")}
            </button>
            <a href={publicUrl} target="_blank" rel="noreferrer" className={pill}>
              <ExternalLink className="h-4 w-4" />
              {t("share.open")}
            </a>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`https://wa.me/?text=${message}`} target="_blank" rel="noreferrer" className={pill}>
            <MessageCircle className="h-4 w-4 text-green" />
            {t("share.whatsapp")}
          </a>
          <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${message}`} className={pill}>
            <Mail className="h-4 w-4 text-blue" />
            {t("share.email")}
          </a>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("share.slugNote", { slug })}</p>
      </section>

      <section data-tour="share.qr" className="rounded-card border border-border bg-white p-5">
        <h2 className="font-bold text-grey">{t("share.qr")}</h2>
        <div className="mt-3 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="grid h-40 w-40 shrink-0 place-items-center rounded-xl border border-border bg-white">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt={t("share.qr")} width={152} height={152} />
            ) : (
              <span className="text-xs text-muted-foreground">…</span>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("share.qrHint")}</p>
            {qr && (
              <a href={qr} download={`qr-${slug}.png`} className={cn(pill, "mt-3")}>
                <Download className="h-4 w-4" />
                {t("share.downloadQr")}
              </a>
            )}
          </div>
        </div>
      </section>

      <section data-tour="share.embed" className="rounded-card border border-border bg-white p-5">
        <h2 className="font-bold text-grey">{t("share.embed")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("share.embedHint")}</p>

        <div role="tablist" aria-label={t("share.embed")} className="mt-3 inline-flex rounded-full border border-border bg-muted p-1">
          {(["full", "fixed", "button"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-bold transition",
                mode === m ? "bg-white text-blue shadow-sm" : "text-muted-foreground hover:text-grey",
              )}
            >
              {t(`share.embedMode.${m}`)}
            </button>
          ))}
        </div>

        {mode === "fixed" && (
          <label className="mt-3 block text-xs font-bold text-grey">
            {t("share.height")}
            <input
              type="number"
              min={200}
              max={3000}
              value={height}
              onChange={(e) => setHeight(Math.min(3000, Math.max(200, Number(e.target.value) || 600)))}
              className="mt-1 w-32 rounded-lg border border-border px-3 py-2 text-sm font-normal outline-none focus:border-blue"
            />
          </label>
        )}

        <textarea
          readOnly
          value={embed}
          rows={4}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={t("share.embed")}
          className="mt-3 w-full rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs text-grey"
        />
        <button
          type="button"
          onClick={() => copyText(embed, t("share.copied"), t("share.copyFailed"))}
          className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-grey hover:border-blue hover:text-blue"
        >
          <Copy className="h-3.5 w-3.5" />
          {t("share.copyCode")}
        </button>

        <div className="mt-4">
          <p className="text-xs font-bold text-grey">{t("share.embedPreview")}</p>
          <div className="mt-2 overflow-hidden rounded-xl border border-border">
            {mode === "button" ? (
              <div className="grid place-items-center bg-muted p-8">
                <span className="inline-block rounded-full bg-blue px-6 py-3 text-sm font-bold text-white">
                  {t("share.buttonText")}
                </span>
              </div>
            ) : (
              <iframe
                src={publicUrl}
                title={t("share.embedPreview")}
                className="w-full bg-white"
                style={{ height: Math.min(mode === "full" ? 720 : height, 520), border: 0 }}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/** Opens right after a successful publish. */
export function ShareDialog({
  open,
  onClose,
  ...content
}: {
  open: boolean;
  onClose: () => void;
  publicUrl: string;
  title: string;
  slug: string;
  published: boolean;
  settingsHref: string;
}) {
  const t = useTranslations("adminForms");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="share-dialog-title"
      className="m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto rounded-card border border-border bg-muted p-0 shadow-soft backdrop:bg-black/40"
    >
      {open && (
        <div className="p-4 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id="share-dialog-title" className="text-xl font-extrabold text-blue">
                {t("shareDialog.title")}
              </h2>
              <p className="text-sm text-muted-foreground">{t("shareDialog.subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("shareDialog.close")}
              className="rounded-full p-2 text-muted-foreground hover:bg-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <ShareContent {...content} />
        </div>
      )}
    </dialog>
  );
}
