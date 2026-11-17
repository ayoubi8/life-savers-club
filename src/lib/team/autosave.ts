"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Saves still waiting in an editor tab. Tab links and "Publish" flush them first,
 * so switching between Détails / Contenu / Design / Médias never loses work.
 */
const flushers = new Set<() => Promise<void>>();

export function hasPendingSaves() {
  return flushers.size > 0;
}

export async function flushPendingSaves() {
  await Promise.all([...flushers].map((flush) => flush().catch(() => {})));
}

/** Register a flush function while `active` (used by editors with their own save loop). */
export function usePendingSave(active: boolean, flush: () => Promise<void>) {
  const ref = useRef(flush);
  useLayoutEffect(() => {
    ref.current = flush;
  });
  useEffect(() => {
    if (!active) return;
    const run = () => ref.current();
    flushers.add(run);
    return () => {
      flushers.delete(run);
    };
  }, [active]);
}

export type AutosaveStatus = "saved" | "pending" | "saving" | "error" | "invalid";

/**
 * Debounced autosave of a JSON-serialisable draft. `persist` returns true when saved.
 * Saves `delay` ms after the last change, on tab switch (flushPendingSaves) and on unmount.
 * While `valid` is false nothing is sent (e.g. a required field is empty).
 */
export function useAutosave<T>(
  value: T,
  persist: (value: T) => Promise<boolean>,
  { delay = 1000, valid = true }: { delay?: number; valid?: boolean } = {},
) {
  const json = JSON.stringify(value);
  const [savedJson, setSavedJson] = useState(json);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const latest = useRef({ value, json, persist, valid });
  const savedRef = useRef(json);
  const inflight = useRef<Promise<void> | null>(null);

  useLayoutEffect(() => {
    latest.current = { value, json, persist, valid };
  });

  const flush = useCallback(async (): Promise<void> => {
    // One save at a time; changes made meanwhile are sent right after.
    while (inflight.current) await inflight.current;
    const { value: current, json: currentJson, persist: send, valid: ok } = latest.current;
    if (!ok || currentJson === savedRef.current) return;
    setSaving(true);
    const run = (async () => {
      try {
        if (await send(current)) {
          savedRef.current = currentJson;
          setSavedJson(currentJson);
          setError(false);
        } else setError(true);
      } catch {
        setError(true);
      } finally {
        setSaving(false);
      }
    })();
    inflight.current = run;
    try {
      await run;
    } finally {
      inflight.current = null;
    }
  }, []);

  const dirty = json !== savedJson;

  // Debounce: save after the last change. After a failure, retry more slowly.
  useEffect(() => {
    if (!dirty || !valid) return;
    const timer = setTimeout(() => void flush(), error ? Math.max(delay, 5000) : delay);
    return () => clearTimeout(timer);
  }, [json, dirty, valid, error, delay, flush]);

  usePendingSave(dirty || saving, flush);

  // Leaving the tab: send whatever is left.
  useEffect(() => () => void flush(), [flush]);

  // Closing the browser tab with unsent work: ask first.
  useEffect(() => {
    if (!dirty && !saving) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  const status: AutosaveStatus = saving ? "saving" : !dirty ? "saved" : !valid ? "invalid" : error ? "error" : "pending";
  return { status, flush };
}
