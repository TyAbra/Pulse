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
