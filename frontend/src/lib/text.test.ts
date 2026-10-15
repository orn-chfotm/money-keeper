import { describe, expect, it } from "vitest";
import { truncateText } from "./text";

describe("truncateText", () => {
  it("keeps text at or under the limit", () => {
    expect(truncateText({ text: "점심", maxLength: 10 })).toEqual({ text: "점심", isTruncated: false });
    expect(truncateText({ text: "가나다라마바사아자차", maxLength: 10 })).toEqual({
      text: "가나다라마바사아자차",
      isTruncated: false,
    });
  });

  it("cuts to the limit and appends an ellipsis", () => {
    expect(truncateText({ text: "가나다라마바사아자차카", maxLength: 10 })).toEqual({
      text: "가나다라마바사아자차…",
      isTruncated: true,
    });
  });

  it("counts emoji as one character and never splits surrogate pairs", () => {
    const emojiTen = "🍔".repeat(10);
    expect("🍔".length).toBe(2);
    expect(truncateText({ text: emojiTen, maxLength: 10 })).toEqual({
      text: emojiTen,
      isTruncated: false,
    });
    expect(truncateText({ text: "점심🍔버거세트🍟콜라추가", maxLength: 10 })).toEqual({
      text: "점심🍔버거세트🍟콜라…",
      isTruncated: true,
    });
  });
});
