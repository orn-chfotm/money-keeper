import { describe, expect, it } from "vitest";
import { isValidDate, monthOfDate, monthRange, shiftMonth, todayKst } from "./date";

describe("todayKst", () => {
  it("returns the KST date even when the UTC date is still the previous day", () => {
    expect(todayKst(new Date("2026-10-14T15:00:00Z"))).toBe("2026-10-15");
    expect(todayKst(new Date("2026-10-14T14:59:59Z"))).toBe("2026-10-14");
  });
});

describe("isValidDate", () => {
  it("accepts real calendar dates", () => {
    expect(isValidDate("2026-01-31")).toBe(true);
    expect(isValidDate("2028-02-29")).toBe(true);
  });

  it("rejects dates that do not exist on the calendar", () => {
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2027-02-29")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("2026-00-10")).toBe(false);
  });

  it("rejects malformed strings", () => {
    expect(isValidDate("")).toBe(false);
    expect(isValidDate("2026-1-01")).toBe(false);
    expect(isValidDate("2026/01/01")).toBe(false);
  });
});

describe("monthOfDate", () => {
  it("extracts year and month", () => {
    expect(monthOfDate("2026-10-15")).toEqual({ year: 2026, month: 10 });
  });
});

describe("shiftMonth", () => {
  it("moves across year boundaries", () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 5 }, 0)).toEqual({ year: 2026, month: 5 });
  });
});

describe("monthRange", () => {
  it("returns the inclusive first and last day of the month", () => {
    expect(monthRange({ year: 2026, month: 10 })).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(monthRange({ year: 2027, month: 2 })).toEqual({
      from: "2027-02-01",
      to: "2027-02-28",
    });
    expect(monthRange({ year: 2028, month: 2 }).to).toBe("2028-02-29");
  });
});
