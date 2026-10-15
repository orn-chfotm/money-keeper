import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  isValidDate,
  monthOfDate,
  monthRange,
  shiftMonth,
  todayKst,
} from "./date";

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

describe("buildMonthGrid", () => {
  function dates(weeks: { date: string }[][]): string[] {
    return weeks.flat().map((cell) => cell.date);
  }

  it("builds Sunday-first weeks with padding for 2026-10", () => {
    const { weeks } = buildMonthGrid({ year: 2026, month: 10 });
    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    // 2026-10-01 is a Thursday, so Sun-Wed come from September.
    expect(weeks[0].map((cell) => cell.date)).toEqual([
      "2026-09-27",
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
    expect(weeks[0].map((cell) => cell.inMonth)).toEqual([false, false, false, false, true, true, true]);
    expect(weeks[4][6]).toEqual({ date: "2026-10-31", day: 31, inMonth: true });
    expect(weeks.flat().filter((cell) => cell.inMonth)).toHaveLength(31);
  });

  it("fills exactly four weeks for 2026-02 (starts on Sunday, 28 days)", () => {
    const { weeks } = buildMonthGrid({ year: 2026, month: 2 });
    expect(weeks).toHaveLength(4);
    expect(weeks[0][0]).toEqual({ date: "2026-02-01", day: 1, inMonth: true });
    expect(weeks[3][6]).toEqual({ date: "2026-02-28", day: 28, inMonth: true });
    expect(weeks.flat().every((cell) => cell.inMonth)).toBe(true);
  });

  it("starts without leading padding for a Sunday-start month (2026-03) and pads the end", () => {
    const { weeks } = buildMonthGrid({ year: 2026, month: 3 });
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toEqual({ date: "2026-03-01", day: 1, inMonth: true });
    expect(dates(weeks).slice(-5)).toEqual([
      "2026-03-31",
      "2026-04-01",
      "2026-04-02",
      "2026-04-03",
      "2026-04-04",
    ]);
    expect(weeks[4].map((cell) => cell.inMonth)).toEqual([true, true, true, false, false, false, false]);
  });

  it("crosses year boundaries in the padding", () => {
    const { weeks } = buildMonthGrid({ year: 2027, month: 1 });
    // 2027-01-01 is a Friday.
    expect(weeks[0][0].date).toBe("2026-12-27");
    expect(weeks[0][5]).toEqual({ date: "2027-01-01", day: 1, inMonth: true });
  });
});
