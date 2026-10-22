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

function renderGrid(props: Partial<Parameters<typeof CalendarGrid>[0]> = {}) {
  return render(
    <CalendarGrid
      month={OCTOBER}
      records={[]}
      selectedDate="2026-10-15"
      today="2026-10-15"
      onSelectDate={vi.fn()}
      {...props}
    />,
  );
}

describe("CalendarGrid", () => {
  afterEach(cleanup);

  it("renders one button per day of the month with per-kind count labels", () => {
    renderGrid({ records: [record(1, { kind: "income", incomeType: "salary" }), record(2), record(3)] });
    expect(screen.getAllByRole("button")).toHaveLength(31);
    expect(screen.getByRole("button", { name: "10월 15일, 수입 1건 지출 2건" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "10월 1일, 기록 없음" })).toBeTruthy();
  });

  it("shows counts per kind in 수입→지출→저축 order and omits kinds with no records", () => {
    const records = [
      record(1, { kind: "saving" }),
      record(2),
      record(3, { kind: "saving" }),
      record(4, { date: "2026-10-16", kind: "income", incomeType: "other" }),
    ];
    renderGrid({ records });

    const cell = screen.getByRole("button", { name: "10월 15일, 지출 1건 저축 2건" });
    expect(within(cell).getAllByTestId("calendar-count").map((item) => item.textContent)).toEqual([
      "지출 1건",
      "저축 2건",
    ]);
    expect(within(cell).getAllByTestId("calendar-badge").map((item) => item.textContent)).toEqual([
      "지1",
      "저2",
    ]);
    expect(within(cell).queryByText(/수입/)).toBeNull();

    const other = screen.getByRole("button", { name: "10월 16일, 수입 1건" });
    expect(within(other).getAllByTestId("calendar-count").map((item) => item.textContent)).toEqual([
      "수입 1건",
    ]);

    const empty = screen.getByRole("button", { name: "10월 1일, 기록 없음" });
    expect(within(empty).queryByTestId("calendar-count")).toBeNull();
    expect(within(empty).queryByTestId("calendar-badge")).toBeNull();
  });

  it("does not show titles or amounts in cells", () => {
    renderGrid({ records: [record(1, { title: "점심", amount: 12000 })] });
    const cell = screen.getByRole("button", { name: "10월 15일, 지출 1건" });
    expect(cell.textContent).not.toContain("점심");
    expect(cell.textContent).not.toContain("12,000");
  });

  it("marks the selected cell with aria-pressed and today with aria-current independently", () => {
    renderGrid({ selectedDate: "2026-10-20", today: "2026-10-15" });
    const selected = screen.getByRole("button", { name: "10월 20일, 기록 없음" });
    const today = screen.getByRole("button", { name: "10월 15일, 기록 없음" });

    expect(selected.getAttribute("aria-pressed")).toBe("true");
    expect(selected.getAttribute("aria-current")).toBeNull();
    expect(today.getAttribute("aria-pressed")).toBe("false");
    expect(today.getAttribute("aria-current")).toBe("date");
    expect(screen.getAllByRole("button", { pressed: true })).toEqual([selected]);
  });

  it("marks Saturdays and Sundays of the current month and the weekday header", () => {
    const { container } = renderGrid();
    expect(
      screen.getByRole("button", { name: "10월 3일, 기록 없음" }).getAttribute("data-weekend"),
    ).toBe("sat");
    expect(
      screen.getByRole("button", { name: "10월 4일, 기록 없음" }).getAttribute("data-weekend"),
    ).toBe("sun");
    expect(
      screen.getByRole("button", { name: "10월 5일, 기록 없음" }).getAttribute("data-weekend"),
    ).toBeNull();

    const marked = [...container.querySelectorAll("button[data-weekend]")].map((cell) =>
      cell.getAttribute("aria-label"),
    );
    expect(marked).toHaveLength(9);

    const header = [...container.querySelectorAll("span[data-weekend]")].map(
      (weekday) => `${weekday.textContent}:${weekday.getAttribute("data-weekend")}`,
    );
    expect(header).toEqual(["일:sun", "토:sat"]);
  });

  it("calls onSelectDate with the clicked date", async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    renderGrid({ onSelectDate });
    await user.click(screen.getByRole("button", { name: "10월 20일, 기록 없음" }));
    expect(onSelectDate).toHaveBeenCalledWith("2026-10-20");
  });

  it("renders adjacent-month padding as faded numbers without records, weekend marks or clicks", async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    // A record on a padding date must not be shown (the API only returns the month, but guard anyway).
    renderGrid({
      records: [record(1, { date: "2026-09-30", title: "9월기록" })],
      // Even if the selected date points at a padding day, the filler is never marked as selected.
      selectedDate: "2026-09-27",
      onSelectDate,
    });
    const fillers = screen.getAllByTestId("calendar-filler");
    expect(fillers.map((filler) => filler.textContent)).toEqual(["27", "28", "29", "30"]);
    for (const filler of fillers) {
      expect(filler.tagName).toBe("DIV");
      expect(filler.getAttribute("data-weekend")).toBeNull();
      expect(filler.getAttribute("aria-pressed")).toBeNull();
      await user.click(filler);
    }
    expect(onSelectDate).not.toHaveBeenCalled();
    expect(screen.queryByText(/9월기록/)).toBeNull();
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
  });
});
