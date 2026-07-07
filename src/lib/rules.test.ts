import { describe, it, expect } from "vitest";
import { buildRecurrence, validateRule, type RuleInput } from "./rules";

const base: RuleInput = { name: "Paycheck", amount: 2400, kind: "income", startDate: "2026-07-17", repeat: "biweekly" };

describe("buildRecurrence", () => {
  it("none returns null", () => {
    expect(buildRecurrence({ ...base, repeat: "none" })).toBeNull();
  });
  it("biweekly builds FREQ=WEEKLY;INTERVAL=2", () => {
    expect(buildRecurrence(base)).toBe("FREQ=WEEKLY;INTERVAL=2");
  });
  it("monthly on day <= 28 uses BYMONTHDAY", () => {
    expect(buildRecurrence({ ...base, repeat: "monthly", startDate: "2026-07-01" })).toBe("FREQ=MONTHLY;BYMONTHDAY=1");
  });
  it("monthly on day >= 29 falls back to last available day", () => {
    expect(buildRecurrence({ ...base, repeat: "monthly", startDate: "2026-07-31" }))
      .toBe("FREQ=MONTHLY;BYMONTHDAY=28,29,30,31;BYSETPOS=-1");
  });
});

describe("validateRule", () => {
  it("accepts a valid rule", () => {
    expect(validateRule(base)).toEqual([]);
  });
  it("rejects non-positive amount and bad dates", () => {
    expect(validateRule({ ...base, amount: 0 })).toContain("Amount must be greater than 0");
    expect(validateRule({ ...base, startDate: "garbage" })).toContain("Start date is invalid");
    expect(validateRule({ ...base, endDate: "2026-01-01" })).toContain("End date must be after start date");
    expect(validateRule({ ...base, name: "  " })).toContain("Name is required");
  });
});
