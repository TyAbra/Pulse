import { describe, it, expect } from "vitest";
import { bulkTotal, parseBulkLine, parseBulkLines, rowsToRules } from "./bulk";

describe("parseBulkLine", () => {
  it("reads 'name amount'", () => {
    expect(parseBulkLine("Costco 84.32")).toMatchObject({ name: "Costco", amount: 84.32 });
  });

  it("reads a leading dollar sign and thousands separators", () => {
    expect(parseBulkLine("Amazon $1,129.99")).toMatchObject({ name: "Amazon", amount: 1129.99 });
  });

  it("reads 'amount name'", () => {
    expect(parseBulkLine("$11.99 Spotify")).toMatchObject({ name: "Spotify", amount: 11.99 });
  });

  it("keeps multi-word names and strips separators", () => {
    expect(parseBulkLine("Car insurance - 142")).toMatchObject({ name: "Car insurance", amount: 142 });
  });

  it("takes the last number when the name contains one", () => {
    expect(parseBulkLine("Shell 76 51.10")).toMatchObject({ name: "Shell 76", amount: 51.1 });
  });

  it("prefers the amount with cents over a trailing store number", () => {
    // Real case from a scanned statement: taking the plain last number read this
    // $13.09 charge as $103.
    expect(parseBulkLine("-13.09 RAISING CANES 0103"))
      .toMatchObject({ name: "RAISING CANES 0103", amount: 13.09, kind: "expense" });
  });

  it("reads a trailing sign as the direction", () => {
    expect(parseBulkLine("FIDELITY 74468 P +2057.14")).toMatchObject({ amount: 2057.14, kind: "income" });
    expect(parseBulkLine("Corner Store -7.57")).toMatchObject({ amount: 7.57, kind: "expense" });
  });

  it("leaves kind unset when the line has no sign", () => {
    expect(parseBulkLine("Costco 84.32").kind).toBeUndefined();
  });

  it("falls back to a generic name when only an amount is given", () => {
    expect(parseBulkLine("25.00")).toMatchObject({ name: "Withdrawal", amount: 25 });
  });

  it("flags a line with no amount", () => {
    expect(parseBulkLine("coffee somewhere").error).toBe("No amount found");
  });

  it("flags a zero amount", () => {
    expect(parseBulkLine("Target 0").error).toBe("Amount must be greater than 0");
  });
});

describe("parseBulkLines", () => {
  const text = `Costco 84.32
Gas 51.10

Amazon 129.99
nonsense line`;

  it("skips blank lines and keeps flagged ones", () => {
    const rows = parseBulkLines(text);
    expect(rows).toHaveLength(4);
    expect(rows.filter((r) => r.error)).toHaveLength(1);
  });

  it("totals only the usable rows", () => {
    expect(bulkTotal(parseBulkLines(text))).toBeCloseTo(265.41, 10);
  });
});

describe("rowsToRules", () => {
  it("builds dated one-off rules and drops flagged rows", () => {
    const rules = rowsToRules(parseBulkLines("Costco 84.32\nbad line"), "expense", "2026-09-23");
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      name: "Costco", amount: 84.32, kind: "expense", recurrence: null, startDate: "2026-09-23",
    });
    expect(rules[0].id).toBeTruthy();
  });

  it("gives every rule a distinct id", () => {
    const rules = rowsToRules(parseBulkLines("A 1\nB 2\nC 3"), "expense", "2026-09-23");
    expect(new Set(rules.map((r) => r.id)).size).toBe(3);
  });
});

import { rowsToRules as toRules } from "./bulk";

describe("per-line dates", () => {
  it("reads an ISO date and keeps it off the name and amount", () => {
    expect(parseBulkLine("Costco -84.32 2026-09-22", 2026))
      .toMatchObject({ name: "Costco", amount: 84.32, date: "2026-09-22" });
  });

  it("reads M/D against the batch year", () => {
    expect(parseBulkLine("Gas 51.10 9/22", 2026)).toMatchObject({ amount: 51.1, date: "2026-09-22" });
  });

  it("reads a written month", () => {
    expect(parseBulkLine("Uber 22.41 Sep 21, 2026", 2026)).toMatchObject({ amount: 22.41, date: "2026-09-21" });
  });

  it("leaves date unset when the line has none", () => {
    expect(parseBulkLine("Costco 84.32", 2026).date).toBeUndefined();
  });

  it("ignores an impossible date instead of inventing one", () => {
    expect(parseBulkLine("Costco 84.32 13/45", 2026).date).toBeUndefined();
  });

  it("does not mistake a store number for a date", () => {
    expect(parseBulkLine("RAISING CANES 0103 -13.09", 2026))
      .toMatchObject({ name: "RAISING CANES 0103", amount: 13.09, date: undefined });
  });

  it("each row lands on its own date, falling back to the batch date", () => {
    const rows = parseBulkLines("Costco -84.32 2026-09-22\nGas -51.10", 2026);
    const rules = toRules(rows, "expense", "2026-09-23");
    expect(rules.map(r => r.startDate)).toEqual(["2026-09-22", "2026-09-23"]);
  });
});

describe("name cleanup", () => {
  it("does not leave the sign stuck to the name", () => {
    expect(parseBulkLine("FIDELITY 74468 P +2057.14", 2026).name).toBe("FIDELITY 74468 P");
    expect(parseBulkLine("-84.32 Costco", 2026).name).toBe("Costco");
  });
});
