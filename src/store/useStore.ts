import { create } from "zustand";
import type { Rule } from "../lib/rules";
import type { Settings } from "../lib/engine";
import { todayLocal } from "../lib/dates";

const KEY = "pulse-v1";

const fallbackStorage: Pick<Storage, "getItem" | "setItem"> = {
  getItem: () => null,
  setItem: () => {},
};

function safeStorage(): Pick<Storage, "getItem" | "setItem"> {
  return typeof localStorage === "undefined" ? fallbackStorage : localStorage;
}

export interface PersistedState { rules: Rule[]; settings: Settings; }

/** What an import actually did, so the UI can say so instead of guessing. */
export interface ImportResult { added: number; skipped: number; tookSettings: boolean; }

interface StoreState extends PersistedState {
  corrupt: boolean;
  /** Ids from the most recent batch add, so it can be taken back in one go. */
  lastBatch: string[];
  addRule: (r: Rule) => void;
  addRules: (r: Rule[]) => void;
  undoLastBatch: () => number;
  clearLastBatch: () => void;
  updateRule: (r: Rule) => void;
  deleteRule: (id: string) => void;
  setSettings: (s: Settings) => void;
  importJSON: (text: string) => ImportResult | null;
  exportJSON: () => string;
}

export function serialize(s: PersistedState): string {
  return JSON.stringify(s);
}

export function deserialize(text: string): PersistedState | null {
  try {
    const p = JSON.parse(text);
    if (!Array.isArray(p.rules)) return null;
    if (typeof p.settings?.startingBalance !== "number" || typeof p.settings?.asOfDate !== "string") return null;
    return { rules: p.rules, settings: p.settings };
  } catch {
    return null;
  }
}

/**
 * Import adds, it does not overwrite: a file that happens to hold three rules
 * must never wipe the twenty already here. Ids already present are skipped, so
 * importing the same backup twice is a no-op rather than a pile of duplicates.
 * Settings only come along when there is nothing to protect — a restore onto an
 * empty app — because otherwise the live balance is the truer number.
 */
export function mergeImport(current: PersistedState, incoming: PersistedState): PersistedState & ImportResult {
  const seen = new Set(current.rules.map((r) => r.id));
  const added = incoming.rules.filter((r) => !seen.has(r.id));
  const tookSettings = current.rules.length === 0;
  return {
    rules: [...current.rules, ...added],
    settings: tookSettings ? incoming.settings : current.settings,
    added: added.length,
    skipped: incoming.rules.length - added.length,
    tookSettings,
  };
}

export function loadPersisted(storage: Pick<Storage, "getItem"> = safeStorage()): PersistedState & { corrupt: boolean } {
  const fallback = { rules: [] as Rule[], settings: { startingBalance: 0, asOfDate: todayLocal() } };
  let raw: string | null = null;
  try { raw = storage.getItem(KEY); } catch { /* storage unavailable */ }
  if (raw == null) return { ...fallback, corrupt: false };
  const parsed = deserialize(raw);
  return parsed ? { ...parsed, corrupt: false } : { ...fallback, corrupt: true };
}

function persist(s: PersistedState) {
  try { safeStorage().setItem(KEY, serialize(s)); } catch { /* quota/unavailable: keep in-memory */ }
}

export const useStore = create<StoreState>((set, get) => ({
  ...loadPersisted(),
  lastBatch: [],
  addRule: (r) => set((s) => {
    const next = { rules: [...s.rules, r], settings: s.settings };
    persist(next);
    return { ...next, lastBatch: [] };
  }),
  // One write for a whole batch, so a bulk add can't half-persist.
  addRules: (rs) => set((s) => {
    const next = { rules: [...s.rules, ...rs], settings: s.settings };
    persist(next);
    return { ...next, lastBatch: rs.map((r) => r.id) };
  }),
  undoLastBatch: () => {
    const { lastBatch, rules, settings } = get();
    if (!lastBatch.length) return 0;
    const ids = new Set(lastBatch);
    const next = { rules: rules.filter((r) => !ids.has(r.id)), settings };
    persist(next);
    set({ ...next, lastBatch: [] });
    return lastBatch.length;
  },
  clearLastBatch: () => set({ lastBatch: [] }),
  updateRule: (r) => set((s) => { const next = { rules: s.rules.map(x => x.id === r.id ? r : x), settings: s.settings }; persist(next); return next; }),
  deleteRule: (id) => set((s) => { const next = { rules: s.rules.filter(x => x.id !== id), settings: s.settings }; persist(next); return next; }),
  setSettings: (settings) => set((s) => { const next = { rules: s.rules, settings }; persist(next); return next; }),
  importJSON: (text) => {
    const parsed = deserialize(text);
    if (!parsed) return null;
    const merged = mergeImport({ rules: get().rules, settings: get().settings }, parsed);
    const next = { rules: merged.rules, settings: merged.settings };
    persist(next);
    set({ ...next, corrupt: false, lastBatch: [] });
    return { added: merged.added, skipped: merged.skipped, tookSettings: merged.tookSettings };
  },
  exportJSON: () => serialize({ rules: get().rules, settings: get().settings }),
}));
