"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronDown, ChevronUp, RotateCcw, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { uploadToLibrary, type UploadedAsset, type UploadState } from "@/lib/media/upload";
import { cn } from "@/lib/utils";
import { useMediaError } from "./library-client";

const CONCURRENCY = 3;

type Status = "queued" | "reading" | "sending" | "waiting" | "saving" | "done" | "failed" | "canceled";
type Job = {
  id: string;
  folderId: string;
  file: File;
  status: Status;
  progress: number;
  error?: string;
  /** Google upload already opened for this file: Retry continues it instead of restarting. */
  state?: UploadState;
};
type Listener = (folderId: string, asset: UploadedAsset, thumb: Blob | null) => void;

const ACTIVE: Status[] = ["queued", "reading", "sending", "waiting", "saving"];

type UploadContext = {
  add: (folderId: string, files: File[]) => void;
  /** Called for every finished file; returns the unsubscribe function. */
  subscribe: (listener: Listener) => () => void;
};

const Context = createContext<UploadContext | null>(null);

export function useUploads() {
  const value = useContext(Context);
  if (!value) throw new Error("useUploads must be used inside <UploadProvider>");
  return value;
}

/**
 * Lives in the media layout, so uploads keep running while people move between folders or
 * change filters. Runs three files at a time and refreshes the page once everything is done.
 */
export function UploadProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("adminMedia");
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const listeners = useRef(new Set<Listener>());
  const succeeded = useRef(0);

  const patch = useCallback((id: string, change: Partial<Job>) => {
    setJobs((list) => list.map((job) => (job.id === id ? { ...job, ...change } : job)));
  }, []);

  const run = useCallback(
    async (job: Job) => {
      const controller = new AbortController();
      controllers.current.set(job.id, controller);
      const result = await uploadToLibrary(job.folderId, job.file, {
        signal: controller.signal,
        onStage: (stage) => patch(job.id, { status: stage }),
        onProgress: (progress) => patch(job.id, { progress }),
        state: job.state,
        onState: (state) => patch(job.id, { state }),
      });
      controllers.current.delete(job.id);
      if (result.ok) {
        succeeded.current += 1;
        patch(job.id, { status: "done", progress: 1, state: undefined });
        listeners.current.forEach((listener) => listener(job.folderId, result.asset, result.thumb));
      } else if (result.error === "canceled") {
        patch(job.id, { status: "canceled", error: result.error, state: undefined });
      } else {
        // Keep `state`: Retry continues the same Google upload from where it stopped.
        patch(job.id, { status: "failed", error: result.error });
      }
    },
    [patch],
  );

  // Scheduler: start queued jobs while there are free slots; refresh once everything is done.
  useEffect(() => {
    const queued = jobs.filter((job) => job.status === "queued" && !controllers.current.has(job.id));
    const free = Math.max(0, CONCURRENCY - controllers.current.size);
    queued.slice(0, free).forEach((job) => void run(job));
    if (controllers.current.size === 0 && queued.length === 0 && succeeded.current > 0) {
      succeeded.current = 0;
      toast.success(t("uploadsDone"));
      router.refresh();
    }
  }, [jobs, run, router, t]);

  const active = jobs.some((job) => ACTIVE.includes(job.status));

  // Closing or reloading the tab would cut the uploads: ask first.
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);

  // Leaving the media section entirely stops what is still running.
  useEffect(() => {
    const running = controllers.current;
    return () => running.forEach((controller) => controller.abort());
  }, []);

  const add = useCallback((folderId: string, files: File[]) => {
    setJobs((list) => [
      ...list,
      ...files.map((file) => ({ id: crypto.randomUUID(), folderId, file, status: "queued" as const, progress: 0 })),
    ]);
  }, []);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const [context] = useState<UploadContext>(() => ({ add, subscribe }));

  return (
    <Context.Provider value={context}>
      {children}
      <UploadPanel
        jobs={jobs}
        active={active}
        onRetry={(id) => patch(id, { status: "queued", error: undefined })}
        onCancel={(id) => {
          const controller = controllers.current.get(id);
          if (controller) controller.abort();
          else patch(id, { status: "canceled" });
        }}
        onClear={() => setJobs((list) => list.filter((job) => ACTIVE.includes(job.status) || job.status === "failed"))}
      />
    </Context.Provider>
  );
}

function UploadPanel({
  jobs,
  active,
  onRetry,
  onCancel,
  onClear,
}: {
  jobs: Job[];
  active: boolean;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onClear: () => void;
}) {
  const t = useTranslations("adminMedia.queue");
  const errorText = useMediaError();
  const [collapsed, setCollapsed] = useState(false);
  if (jobs.length === 0) return null;

  const done = jobs.filter((job) => job.status === "done").length;
  const finished = jobs.some((job) => job.status === "done" || job.status === "canceled");

  return (
    <section
      aria-label={t("title")}
      className="fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-card border border-border bg-white shadow-soft"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-extrabold text-grey">
          {t("title")} · {done}/{jobs.length}
        </h2>
        <div className="flex items-center gap-1">
          {finished && !active && (
            <button type="button" onClick={onClear} className="rounded-full px-2 py-1 text-xs font-bold text-blue hover:bg-muted">
              {t("clear")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? t("expand") : t("collapse")}
            className="rounded-full p-1 text-grey hover:bg-muted"
          >
            {collapsed ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </header>
      {!collapsed && (
        <ul className="max-h-72 divide-y divide-border overflow-y-auto">
          {jobs.map((job) => {
            const running = ACTIVE.includes(job.status) && job.status !== "queued";
            return (
              <li key={job.id} className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {job.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green" aria-hidden />
                  ) : job.status === "failed" ? (
                    <XCircle className="h-4 w-4 shrink-0 text-pink" aria-hidden />
                  ) : null}
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink" title={job.file.name}>
                    {job.file.name}
                  </p>
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                    {job.status === "sending"
                      ? t("sending", { percent: Math.round(job.progress * 100) })
                      : job.status === "waiting" || (job.status === "failed" && job.state)
                        ? `${t(job.status)} · ${Math.round(job.progress * 100)}%`
                        : t(job.status)}
                  </span>
                  {job.status === "failed" && (
                    <button type="button" onClick={() => onRetry(job.id)} aria-label={t("retry")} className="rounded-full p-1 text-blue hover:bg-muted">
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                  {ACTIVE.includes(job.status) && (
                    <button type="button" onClick={() => onCancel(job.id)} aria-label={t("cancel")} className="rounded-full p-1 text-grey hover:bg-muted">
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                </div>
                {running && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full bg-blue transition-[width]", job.status !== "sending" && "animate-pulse")}
                      style={{ width: `${Math.max(3, job.progress * 100)}%` }}
                    />
                  </div>
                )}
                {job.status === "failed" && job.error && <p className="mt-1 text-xs font-semibold text-pink">{errorText(job.error)}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
