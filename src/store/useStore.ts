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
interface StoreState extends PersistedState {
  corrupt: boolean;
  addRule: (r: Rule) => void;
  updateRule: (r: Rule) => void;
  deleteRule: (id: string) => void;
  setSettings: (s: Settings) => void;
  importJSON: (text: string) => boolean;
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
  addRule: (r) => set((s) => { const next = { rules: [...s.rules, r], settings: s.settings }; persist(next); return next; }),
  updateRule: (r) => set((s) => { const next = { rules: s.rules.map(x => x.id === r.id ? r : x), settings: s.settings }; persist(next); return next; }),
  deleteRule: (id) => set((s) => { const next = { rules: s.rules.filter(x => x.id !== id), settings: s.settings }; persist(next); return next; }),
  setSettings: (settings) => set((s) => { const next = { rules: s.rules, settings }; persist(next); return next; }),
  importJSON: (text) => {
    const parsed = deserialize(text);
    if (!parsed) return false;
    persist(parsed);
    set({ ...parsed, corrupt: false });
    return true;
  },
  exportJSON: () => serialize({ rules: get().rules, settings: get().settings }),
}));
