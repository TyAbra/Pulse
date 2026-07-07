import { describe, it, expect } from "vitest";
import { toUTCDate, fromUTCDate, addDays, addMonths, compare, monthKey, daysInMonth } from "./dates";

describe("dates", () => {
  it("round-trips a LocalDate through UTC Date", () => {
    expect(fromUTCDate(toUTCDate("2026-07-06"))).toBe("2026-07-06");
  });
  it("addDays crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("addMonths clamps to end of shorter month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });
  it("compare orders dates", () => {
    expect(compare("2026-03-01", "2026-03-02")).toBeLessThan(0);
    expect(compare("2026-03-02", "2026-03-02")).toBe(0);
  });
  it("monthKey and daysInMonth", () => {
    expect(monthKey("2026-07-06")).toBe("2026-07");
    expect(daysInMonth("2026-02")).toBe(28);
  });
});
