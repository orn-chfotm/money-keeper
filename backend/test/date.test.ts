import { describe, expect, it } from "vitest";
import { daysBetween, isValidDate, todayKst } from "../src/domain/date.js";

describe("isValidDate", () => {
  it.each(["2026-01-01", "2026-12-31", "2028-02-29", "2000-02-29", "0001-01-01", "9999-12-31"])(
    "accepts %s",
    (value) => {
      expect(isValidDate(value)).toBe(true);
    },
  );

  it.each([
    "2026-02-30",
    "2027-02-29",
    "1900-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-00-10",
    "2026-01-00",
    "0000-01-01",
    "2026-1-01",
    "20260101",
    "2026-01-01T00:00:00Z",
    " 2026-01-01",
    "",
  ])("rejects %j", (value) => {
    expect(isValidDate(value)).toBe(false);
  });
});

describe("daysBetween", () => {
  it("counts calendar days across a leap day", () => {
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
    expect(daysBetween("2026-01-01", "2026-01-01")).toBe(0);
    expect(daysBetween("2028-01-01", "2028-12-31")).toBe(365);
  });
});

describe("todayKst", () => {
  it("returns the Asia/Seoul calendar date", () => {
    expect(todayKst(new Date("2026-03-31T14:59:59Z"))).toBe("2026-03-31");
    expect(todayKst(new Date("2026-03-31T15:00:00Z"))).toBe("2026-04-01");
    expect(todayKst(new Date("2026-12-31T15:00:00Z"))).toBe("2027-01-01");
  });
});
