import { describe, expect, it } from "vitest";
import { formatAmount, parseAmount, sanitizeAmountInput } from "./amount";

describe("sanitizeAmountInput", () => {
  it("keeps digits only", () => {
    expect(sanitizeAmountInput("1,234원")).toBe("1234");
    expect(sanitizeAmountInput("12.5")).toBe("125");
    expect(sanitizeAmountInput("-300")).toBe("300");
    expect(sanitizeAmountInput("abc")).toBe("");
  });

  it("drops leading zeros but keeps a single zero", () => {
    expect(sanitizeAmountInput("007")).toBe("7");
    expect(sanitizeAmountInput("000")).toBe("0");
  });
});

describe("parseAmount", () => {
  it("parses digit-only strings", () => {
    expect(parseAmount("0")).toBe(0);
    expect(parseAmount("999999999")).toBe(999_999_999);
  });

  it("returns null for empty or non-digit strings", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("1,000")).toBeNull();
    expect(parseAmount("1.5")).toBeNull();
  });
});

describe("formatAmount", () => {
  it("adds ko-KR thousands separators", () => {
    expect(formatAmount(1234567)).toBe("1,234,567");
    expect(formatAmount(999)).toBe("999");
  });
});
