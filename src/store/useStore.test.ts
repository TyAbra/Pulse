import { describe, it, expect } from "vitest";
import { loadPersisted, serialize, deserialize } from "./useStore";

describe("persistence", () => {
  it("serialize/deserialize round-trips", () => {
    const state = { rules: [{ id: "1", name: "Rent", amount: 1800, kind: "expense" as const, recurrence: "FREQ=MONTHLY;BYMONTHDAY=1", startDate: "2026-08-01" }], settings: { startingBalance: 500, asOfDate: "2026-07-06" } };
    expect(deserialize(serialize(state))).toEqual(state);
  });
  it("deserialize rejects garbage and wrong shapes", () => {
    expect(deserialize("not json")).toBeNull();
    expect(deserialize(JSON.stringify({ rules: "nope" }))).toBeNull();
    expect(deserialize(JSON.stringify({ rules: [], settings: { startingBalance: "x", asOfDate: "2026-01-01" } }))).toBeNull();
  });
  it("loadPersisted returns default state on corrupt storage", () => {
    const fake = { getItem: () => "{{{corrupt" } as unknown as Storage;
    const s = loadPersisted(fake);
    expect(s.rules).toEqual([]);
    expect(s.corrupt).toBe(true);
  });
});

import { mergeImport } from "./useStore";
import type { PersistedState } from "./useStore";

const rule = (id: string, name = id) => ({
  id, name, amount: 10, kind: "expense" as const, recurrence: null, startDate: "2026-09-01",
});

describe("mergeImport", () => {
  const existing: PersistedState = {
    rules: [rule("a"), rule("b")],
    settings: { startingBalance: 2024.2, asOfDate: "2026-09-23" },
  };

  it("adds incoming rules without dropping the ones already here", () => {
    const incoming: PersistedState = {
      rules: [rule("c")], settings: { startingBalance: 0, asOfDate: "2020-01-01" },
    };
    const merged = mergeImport(existing, incoming);
    expect(merged.rules.map(r => r.id)).toEqual(["a", "b", "c"]);
    expect(merged.added).toBe(1);
  });

  it("keeps the live balance rather than the file's", () => {
    const incoming: PersistedState = {
      rules: [rule("c")], settings: { startingBalance: 0, asOfDate: "2020-01-01" },
    };
    expect(mergeImport(existing, incoming).settings).toEqual(existing.settings);
  });

  it("is idempotent — importing the same backup twice adds nothing", () => {
    const again = mergeImport(existing, existing);
    expect(again.rules).toHaveLength(2);
    expect(again.added).toBe(0);
    expect(again.skipped).toBe(2);
  });

  it("restores settings when there is nothing to protect", () => {
    const empty: PersistedState = { rules: [], settings: { startingBalance: 0, asOfDate: "2026-09-23" } };
    const backup: PersistedState = {
      rules: [rule("a")], settings: { startingBalance: 900, asOfDate: "2026-09-01" },
    };
    const merged = mergeImport(empty, backup);
    expect(merged.tookSettings).toBe(true);
    expect(merged.settings.startingBalance).toBe(900);
  });
});
