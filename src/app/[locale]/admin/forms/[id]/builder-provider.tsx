"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { firstPage, parseSchema, type FormSchema } from "@/lib/forms/schema";
import { saveSchema } from "@/lib/forms/actions";

export type BuilderForm = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  schema: unknown;
  settings: unknown;
  sheetId: string | null;
  opensAt: string | null;
  closesAt: string | null;
};

/** What the save pill shows. */
export type SaveStatus = "saved" | "pending" | "saving" | "retrying" | "invalid" | "conflict";

type State = {
  schema: FormSchema;
  past: FormSchema[];
  future: FormSchema[];
  version: number; // bumps on every change, including undo/redo
  savedVersion: number; // last version confirmed by the server
  lastKey: string | null;
  lastAt: number;
};

type Action =
  | { type: "commit"; mutate: (draft: FormSchema) => void; key?: string; at: number }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "saved"; version: number }
  | { type: "replace"; schema: FormSchema };

const HISTORY_LIMIT = 50;
const COALESCE_MS = 1500;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "commit": {
      const next = structuredClone(state.schema);
      action.mutate(next);
      // Typing bursts on the same input collapse into a single undo step.
      const coalesce =
        action.key != null && action.key === state.lastKey && action.at - state.lastAt < COALESCE_MS;
      return {
        ...state,
        schema: next,
        past: coalesce ? state.past : [...state.past, state.schema].slice(-HISTORY_LIMIT),
        future: [],
        version: state.version + 1,
        lastKey: action.key ?? null,
        lastAt: action.at,
      };
    }
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        schema: previous,
        past: state.past.slice(0, -1),
        future: [state.schema, ...state.future],
        version: state.version + 1,
        lastKey: null,
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        ...state,
        schema: next,
        past: [...state.past, state.schema].slice(-HISTORY_LIMIT),
        future: rest,
        version: state.version + 1,
        lastKey: null,
      };
    }
    case "saved":
      return { ...state, savedVersion: Math.max(state.savedVersion, action.version) };
    case "replace":
      return {
        ...state,
        schema: action.schema,
        past: [...state.past, state.schema].slice(-HISTORY_LIMIT),
        future: [],
        version: state.version + 1,
        lastKey: null,
      };
  }
}

type BuilderContextValue = {
  form: BuilderForm;
  schema: FormSchema;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  commit: (mutate: (draft: FormSchema) => void, key?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveStatus: SaveStatus;
  savedAt: Date | null;
  retryNow: () => void;
  /** A local copy newer than the server was found (crash / closed tab). */
  backup: FormSchema | null;
  restoreBackup: () => void;
  discardBackup: () => void;
  /** Someone else changed the questions while this tab was open. */
  conflict: boolean;
  overwriteServer: () => void;
  reloadFromServer: () => void;
  /** The published form differs from the draft being edited. */
  unpublishedChanges: boolean;
  /** Select a question and ask the editor to scroll to it. */
  reveal: string | null;
  revealField: (id: string) => void;
  clearReveal: () => void;
};

const BuilderContext = createContext<BuilderContextValue | null>(null);

export function useBuilder() {
  const value = useContext(BuilderContext);
  if (!value) throw new Error("useBuilder must be used inside <BuilderProvider>");
  return value;
}

const backupKey = (id: string) => `lsc-form-backup:${id}`;

export function BuilderProvider({
  form,
  baseSchema,
  liveBase,
  children,
}: {
  form: BuilderForm;
  /** Canonical JSON of the stored schema, used for conflict detection. */
  baseSchema: string;
  /** Canonical JSON of the published snapshot (null if never published). */
  liveBase: string | null;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const schema = parseSchema(form.schema);
    return {
      schema,
      past: [],
      future: [],
      version: 0,
      savedVersion: 0,
      lastKey: null,
      lastAt: 0,
    } satisfies State;
  });
  const [selectedId, setSelectedId] = useState<string | null>(
    () => firstPage(parseSchema(form.schema)).fields[0]?.id ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [backup, setBackup] = useState<FormSchema | null>(null);
  const [backupChecked, setBackupChecked] = useState(false);
  const [reveal, setReveal] = useState<string | null>(null);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const baseRef = useRef(baseSchema);
  const savingRef = useRef(false);
  const retriesRef = useRef(0);

  const dirty = state.version !== state.savedVersion;

  const commit = useCallback((mutate: (draft: FormSchema) => void, key?: string) => {
    setSaveError((current) => (current === "network" ? current : null));
    dispatch({ type: "commit", mutate, key, at: Date.now() });
  }, []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  const doSave = useCallback(
    async (force = false) => {
      if (savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      const snapshot = stateRef.current;
      try {
        const result = await saveSchema(form.id, snapshot.schema, force ? null : baseRef.current);
        if (result.ok) {
          baseRef.current = result.base;
          retriesRef.current = 0;
          setSaveError(null);
          setConflict(false);
          setSavedAt(new Date(result.savedAt));
          dispatch({ type: "saved", version: snapshot.version });
        } else if (result.error === "conflict") {
          setConflict(true);
        } else {
          setSaveError(result.error);
        }
      } catch {
        retriesRef.current += 1;
        setSaveError("network");
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [form.id],
  );

  // Autosave: debounce 800 ms after the last change; back off when the network fails.
  useEffect(() => {
    if (!dirty || saving || conflict) return;
    if (saveError && saveError !== "network") return; // wait for the next edit
    const delay = saveError === "network" ? Math.min(30000, 2000 * 2 ** retriesRef.current) : 800;
    const timer = setTimeout(() => void doSave(), delay);
    return () => clearTimeout(timer);
  }, [dirty, state.version, saving, conflict, saveError, doSave]);

  // Warn before leaving with unsaved work.
  useEffect(() => {
    if (!dirty && !saving) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saving]);

  // Crash recovery: look for a local copy once, on mount.
  useEffect(() => {
    // Deferred so the browser-only read does not set state synchronously inside the effect.
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(backupKey(form.id));
        if (raw) {
          const saved = JSON.parse(raw) as { schema?: unknown };
          const candidate = parseSchema(saved.schema);
          if (JSON.stringify(candidate) !== baseRef.current) setBackup(candidate);
        }
      } catch {
        /* storage unavailable: recovery is a convenience only */
      }
      setBackupChecked(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [form.id]);

  // Keep the local copy fresh while there are unsaved changes; drop it once saved.
  useEffect(() => {
    if (!backupChecked || backup) return;
    const timer = setTimeout(() => {
      try {
        if (dirty) {
          localStorage.setItem(
            backupKey(form.id),
            JSON.stringify({ schema: state.schema, at: Date.now() }),
          );
        } else {
          localStorage.removeItem(backupKey(form.id));
        }
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [dirty, state.schema, state.version, backupChecked, backup, form.id]);

  const restoreBackup = useCallback(() => {
    if (!backup) return;
    dispatch({ type: "replace", schema: backup });
    setBackup(null);
  }, [backup]);
  const discardBackup = useCallback(() => {
    try {
      localStorage.removeItem(backupKey(form.id));
    } catch {
      /* ignore */
    }
    setBackup(null);
  }, [form.id]);

  const retryNow = useCallback(() => {
    setSaveError(null);
    void doSave();
  }, [doSave]);
  const overwriteServer = useCallback(() => void doSave(true), [doSave]);
  const reloadFromServer = useCallback(() => {
    try {
      localStorage.removeItem(backupKey(form.id));
    } catch {
      /* ignore */
    }
    window.location.reload();
  }, [form.id]);

  const canonical = useMemo(() => JSON.stringify(parseSchema(state.schema)), [state.schema]);
  const unpublishedChanges =
    form.status === "published" && liveBase !== null && canonical !== liveBase;

  const revealField = useCallback((id: string) => {
    setSelectedId(id);
    setReveal(id);
  }, []);
  const clearReveal = useCallback(() => setReveal(null), []);

  const saveStatus: SaveStatus = conflict
    ? "conflict"
    : saving
      ? "saving"
      : saveError === "network"
        ? "retrying"
        : saveError
          ? "invalid"
          : dirty
            ? "pending"
            : "saved";

  const value = useMemo<BuilderContextValue>(
    () => ({
      form,
      schema: state.schema,
      selectedId,
      setSelectedId,
      commit,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      saveStatus,
      savedAt,
      retryNow,
      backup,
      restoreBackup,
      discardBackup,
      conflict,
      overwriteServer,
      reloadFromServer,
      unpublishedChanges,
      reveal,
      revealField,
      clearReveal,
    }),
    [
      form,
      state.schema,
      state.past.length,
      state.future.length,
      selectedId,
      commit,
      undo,
      redo,
      saveStatus,
      savedAt,
      retryNow,
      backup,
      restoreBackup,
      discardBackup,
      conflict,
      overwriteServer,
      reloadFromServer,
      unpublishedChanges,
      reveal,
      revealField,
      clearReveal,
    ],
  );

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
}
