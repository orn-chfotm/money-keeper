import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecordDto } from "@/lib/records-api";
import { CalendarGrid } from "./calendar-grid";

function record(id: number, overrides: Partial<RecordDto> = {}): RecordDto {
  return {
    id,
    date: "2026-10-15",
    kind: "expense",
    incomeType: null,
    amount: 1000 * id,
    title: `기록${id}`,
    memo: "",
    ...overrides,
  };
}

const OCTOBER = { year: 2026, month: 10 };

describe("CalendarGrid", () => {
  afterEach(cleanup);

  it("renders one button per day of the month with date and count labels", () => {
    render(<CalendarGrid month={OCTOBER} records={[record(1)]} onSelectDate={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(31);
    expect(screen.getByRole("button", { name: "10월 15일, 기록 1건" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "10월 1일, 기록 0건" })).toBeTruthy();
  });

  it("shows up to 3 records as kind · title · amount and folds the rest into 외 N건", () => {
    const records = [
      record(1, { kind: "income", incomeType: "salary", title: "급여", amount: 3000000 }),
      record(2, { title: "점심" }),
      record(3, { kind: "saving", title: "적금" }),
      record(4, { title: "저녁" }),
      record(5, { title: "커피" }),
    ];
    render(<CalendarGrid month={OCTOBER} records={records} onSelectDate={vi.fn()} />);
    const cell = screen.getByRole("button", { name: "10월 15일, 기록 5건" });
    const items = within(cell).getAllByTestId("calendar-entry");
    expect(items.map((item) => item.textContent)).toEqual([
      "수입 · 급여 · 3,000,000원",
      "지출 · 점심 · 2,000원",
      "저축 · 적금 · 3,000원",
      "외 2건",
    ]);
    expect(within(cell).queryByText(/저녁/)).toBeNull();
  });

  it("shows short kind marks with +N for narrow screens", () => {
    const records = [
      record(1, { kind: "income", incomeType: "other" }),
      record(2),
      record(3, { kind: "saving" }),
      record(4),
    ];
    render(<CalendarGrid month={OCTOBER} records={records} onSelectDate={vi.fn()} />);
    const cell = screen.getByRole("button", { name: "10월 15일, 기록 4건" });
    expect(within(cell).getByText("수")).toBeTruthy();
    expect(within(cell).getByText("지")).toBeTruthy();
    expect(within(cell).getByText("저")).toBeTruthy();
    expect(within(cell).getByText("+1")).toBeTruthy();
  });

  it("truncates titles longer than 10 code points without splitting emoji", () => {
    const records = [
      record(1, { title: "가나다라마바사아자차카타" }),
      record(2, { date: "2026-10-16", title: "🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍟" }),
      record(3, { date: "2026-10-17", title: "가나다라마바사아자차" }),
    ];
    render(<CalendarGrid month={OCTOBER} records={records} onSelectDate={vi.fn()} />);
    const texts = screen.getAllByTestId("calendar-entry").map((item) => item.textContent);
    expect(texts).toEqual([
      "지출 · 가나다라마바사아자차… · 1,000원",
      `지출 · ${"🍔".repeat(10)}… · 2,000원`,
      "지출 · 가나다라마바사아자차 · 3,000원",
    ]);
  });

  it("calls onSelectDate with the clicked date", async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    render(<CalendarGrid month={OCTOBER} records={[]} onSelectDate={onSelectDate} />);
    await user.click(screen.getByRole("button", { name: "10월 15일, 기록 0건" }));
    expect(onSelectDate).toHaveBeenCalledWith("2026-10-15");
  });

  it("renders adjacent-month padding as faded numbers without records or clicks", async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    // A record on a padding date must not be shown (the API only returns the month, but guard anyway).
    render(
      <CalendarGrid
        month={OCTOBER}
        records={[record(1, { date: "2026-09-30", title: "9월기록" })]}
        onSelectDate={onSelectDate}
      />,
    );
    const fillers = screen.getAllByTestId("calendar-filler");
    expect(fillers.map((filler) => filler.textContent)).toEqual(["27", "28", "29", "30"]);
    for (const filler of fillers) {
      expect(filler.tagName).toBe("DIV");
      await user.click(filler);
    }
    expect(onSelectDate).not.toHaveBeenCalled();
    expect(screen.queryByText(/9월기록/)).toBeNull();
  });
});
