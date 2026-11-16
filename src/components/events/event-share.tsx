"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Link2, Share2 } from "lucide-react";

type Labels = {
  title: string;
  copy: string;
  copied: string;
  copyFailed: string;
  /** "Partager sur %s": %s is replaced by the network name. */
  via: string;
  more: string;
};

// Brand marks are not in lucide, so they are drawn inline (single-path glyphs).
const NETWORKS = [
  {
    name: "WhatsApp",
    color: "#25d366",
    href: (url: string, text: string) => `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
    path: "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z",
  },
  {
    name: "Facebook",
    color: "#1877f2",
    href: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    path: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.5 2.9h-2.3v7A10 10 0 0 0 22 12Z",
  },
  {
    name: "X",
    color: "currentColor",
    href: (url: string, text: string) => `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    path: "M17.8 3h3.1l-6.7 7.6L22 21h-6.2l-4.8-6.3L5.5 21H2.4l7.2-8.1L2 3h6.3l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z",
  },
];

const subscribe = () => () => {};
const canShareNatively = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

/** Copy link, WhatsApp / Facebook / X, and the phone's native share sheet when available. */
export function EventShare({ url, text, labels }: { url: string; text: string; labels: Labels }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  // Server render and first paint: false; then the real value (no effect + setState needed).
  const native = useSyncExternalStore(subscribe, canShareNatively, () => false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2500);
  }

  const button =
    "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-current/15 px-3.5 text-sm font-bold transition hover:border-[var(--event-link)] hover:text-[var(--event-link)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--event-link)]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-bold opacity-75">{labels.title}</span>
      <button type="button" onClick={copy} className={button}>
        {state === "copied" ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
        {state === "copied" ? labels.copied : labels.copy}
      </button>
      {NETWORKS.map((network) => {
        const label = labels.via.replace("%s", network.name);
        return (
          <a
            key={network.name}
            href={network.href(url, text)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className={`${button} w-10 px-0`}
          >
            <svg viewBox="0 0 24 24" width={18} height={18} className="size-[18px] shrink-0" fill={network.color} aria-hidden>
              <path d={network.path} />
            </svg>
          </a>
        );
      })}
      {native && (
        <button
          type="button"
          onClick={() => navigator.share({ title: text, url }).catch(() => {})}
          aria-label={labels.more}
          title={labels.more}
          className={`${button} w-10 px-0`}
        >
          <Share2 className="h-4 w-4" aria-hidden />
        </button>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" ? labels.copied : ""}
      </span>
      {state === "failed" && (
        <span role="alert" className="text-sm font-semibold text-[#c62828]">
          {labels.copyFailed}
        </span>
      )}
    </div>
  );
}
