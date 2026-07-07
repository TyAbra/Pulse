import { describe, it, expect } from "vitest";
import { project } from "./engine";
import type { Rule } from "./rules";

const paycheck: Rule = { id: "p", name: "Paycheck", amount: 2400, kind: "income", recurrence: "FREQ=WEEKLY;INTERVAL=2", startDate: "2026-07-17" };
const rent: Rule = { id: "r", name: "Rent", amount: 1800, kind: "expense", recurrence: "FREQ=MONTHLY;BYMONTHDAY=1", startDate: "2026-08-01" };
const oneOff: Rule = { id: "o", name: "Tax refund", amount: 500, kind: "income", recurrence: null, startDate: "2026-07-20" };
const settings = { startingBalance: 1000, asOfDate: "2026-07-06" };

describe("project", () => {
  it("expands biweekly paydays across month boundaries", () => {
    const { events } = project([paycheck], settings, "2026-07-01", "2026-08-31");
    expect(events.map(e => e.date)).toEqual(["2026-07-17", "2026-07-31", "2026-08-14", "2026-08-28"]);
  });

  it("expands 'monthly on 31st' rule to last day of short months", () => {
    const eom: Rule = { ...rent, id: "e", recurrence: "FREQ=MONTHLY;BYMONTHDAY=28,29,30,31;BYSETPOS=-1", startDate: "2026-01-31" };
    const { events } = project([eom], settings, "2026-01-01", "2026-04-30");
    expect(events.map(e => e.date)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("is stable across a US DST boundary (2026-03-08)", () => {
    const weekly: Rule = { ...paycheck, id: "w", recurrence: "FREQ=WEEKLY", startDate: "2026-03-06" };
    const { events } = project([weekly], settings, "2026-03-01", "2026-03-31");
    expect(events.map(e => e.date)).toEqual(["2026-03-06", "2026-03-13", "2026-03-20", "2026-03-27"]);
  });

  it("includes one-offs and respects endDate", () => {
    const ended: Rule = { ...paycheck, endDate: "2026-07-20" };
    const { events } = project([ended, oneOff], settings, "2026-07-01", "2026-08-31");
    expect(events.map(e => `${e.date}:${e.name}`)).toEqual(["2026-07-17:Paycheck", "2026-07-20:Tax refund"]);
  });

  it("computes running balance from starting balance with signed amounts", () => {
    const { dailyBalance } = project([paycheck, rent], settings, "2026-07-06", "2026-08-02");
    const at = (d: string) => dailyBalance.find(x => x.date === d)!.balance;
    expect(at("2026-07-06")).toBe(1000);
    expect(at("2026-07-17")).toBe(3400);       // +2400
    expect(at("2026-08-01")).toBe(5800 - 1800); // +2400 (Jul 31) then -1800 rent
  });

  it("summarizes months", () => {
    const { monthSummaries } = project([paycheck, rent], settings, "2026-07-01", "2026-08-31");
    expect(monthSummaries).toEqual([
      { month: "2026-07", in: 4800, out: 0, net: 4800 },
      { month: "2026-08", in: 4800, out: 1800, net: 3000 },
    ]);
  });

  it("clamps ranges beyond 5 years", () => {
    const { events } = project([paycheck], settings, "2026-01-01", "2099-01-01");
    const last = events[events.length - 1];
    expect(last.date < "2031-01-02").toBe(true);
  });
});
