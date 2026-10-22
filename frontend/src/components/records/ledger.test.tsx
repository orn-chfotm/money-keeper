import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RecordDto, RecordInput } from "@/lib/records-api";
import { Ledger } from "./ledger";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function serverError(): Response {
  return jsonResponse({ error: { code: "INTERNAL", message: "서버 오류" } }, 500);
}

// In-memory backend: GET filters by range and keeps id order (date ASC, id ASC like the server).
function createBackend(initial: RecordDto[]) {
  let records = [...initial];
  let nextId = Math.max(0, ...records.map((r) => r.id)) + 1;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { pathname, searchParams } = new URL(url);
    const method = init?.method ?? "GET";
    if (method === "GET" && pathname === "/records") {
      const from = searchParams.get("from") ?? "";
      const to = searchParams.get("to") ?? "";
      const items = records
        .filter((r) => r.date >= from && r.date <= to)
        .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
      return jsonResponse({ items }, 200);
    }
    if (method === "POST" && pathname === "/records") {
      const input = JSON.parse(init?.body as string) as RecordInput;
      const created = { id: nextId++, ...input };
      records.push(created);
      return jsonResponse(created, 201);
    }
    const id = Number(pathname.split("/")[2]);
    if (method === "PUT") {
      const input = JSON.parse(init?.body as string) as RecordInput;
      const updated = { id, ...input };
      records = records.map((r) => (r.id === id ? updated : r));
      return jsonResponse(updated, 200);
    }
    if (method === "DELETE") {
      records = records.filter((r) => r.id !== id);
      return new Response(null, { status: 204 });
    }
    return jsonResponse({ error: { code: "NOT_FOUND", message: "없음" } }, 404);
  });
  return fetchMock;
}

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

const lunch = record(1, { amount: 12000, title: "점심" });

const NO_RECORDS = "이 날의 기록이 없습니다.";

function panel(label: string) {
  return screen.findByRole("region", { name: label });
}

function sectionHeadings(region: HTMLElement) {
  return within(region)
    .queryAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
}

describe("Ledger", () => {
  let fetchMock: ReturnType<typeof createBackend>;

  function stubBackend(initial: RecordDto[]) {
    fetchMock = createBackend(initial);
    vi.stubGlobal("fetch", fetchMock);
  }

  beforeEach(() => {
    // Fake only Date so "today" (KST) is 2026-10-15 while timers stay real for user-event.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T03:00:00Z"));
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000");
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    stubBackend([lunch]);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("opens on the current KST month with today selected and shown below the calendar", async () => {
    render(<Ledger />);
    expect(screen.getByRole("heading", { name: "2026년 10월" })).toBeTruthy();
    const today = await screen.findByRole("button", { name: "10월 15일, 지출 1건" });
    expect(today.getAttribute("aria-pressed")).toBe("true");
    expect(today.getAttribute("aria-current")).toBe("date");
    expect(await within(await panel("10월 15일")).findByText("점심")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://localhost:4000/records?from=2026-10-01&to=2026-10-31",
    );
  });

  it("switches the panel on date click without opening a dialog", async () => {
    const user = userEvent.setup();
    render(<Ledger />);
    await user.click(await screen.findByRole("button", { name: "10월 20일, 기록 없음" }));

    const region = await panel("10월 20일");
    expect(within(region).getByText(NO_RECORDS)).toBeTruthy();
    expect(screen.queryByRole("region", { name: "10월 15일" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByRole("button", { name: "10월 20일, 기록 없음" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "10월 15일, 지출 1건" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("selects the 1st on other months and today on the current month", async () => {
    const user = userEvent.setup();
    render(<Ledger />);
    await user.click(await screen.findByRole("button", { name: "10월 20일, 기록 없음" }));

    await user.click(screen.getByRole("button", { name: "다음 달" }));
    expect(await panel("11월 1일")).toBeTruthy();
    expect(
      (await screen.findByRole("button", { name: "11월 1일, 기록 없음" })).getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");

    await user.click(screen.getByRole("button", { name: "이전 달" }));
    await user.click(screen.getByRole("button", { name: "이전 달" }));
    expect(await panel("9월 1일")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "다음 달" }));
    expect(await within(await panel("10월 15일")).findByText("점심")).toBeTruthy();
  });

  it("groups the day into 수입→지출→저축 sections, hides empty ones and keeps server order inside", async () => {
    stubBackend([
      record(1, { kind: "saving", title: "적금" }),
      record(2, { title: "점심" }),
      record(3, { kind: "income", incomeType: "salary", title: "월급" }),
      record(4, { title: "커피" }),
      record(5, { date: "2026-10-16", title: "택시" }),
    ]);
    const user = userEvent.setup();
    render(<Ledger />);

    const region = await panel("10월 15일");
    await within(region).findByText("적금");
    expect(sectionHeadings(region)).toEqual(["수입", "지출", "저축"]);
    const expense = within(region).getByRole("region", { name: "지출" });
    expect(within(expense).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      expect.stringContaining("점심"),
      expect.stringContaining("커피"),
    ]);
    expect(within(within(region).getByRole("region", { name: "수입" })).getByText("수입·급여")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "10월 16일, 지출 1건" }));
    expect(sectionHeadings(await panel("10월 16일"))).toEqual(["지출"]);
  });

  it("shows loading instead of 기록 없음 while the next month is still loading", async () => {
    const backend = createBackend([lunch]);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes("from=2026-11-01")) await gate;
        return backend(url, init);
      }),
    );
    const user = userEvent.setup();
    render(<Ledger />);
    await within(await panel("10월 15일")).findByText("점심");

    await user.click(screen.getByRole("button", { name: "다음 달" }));
    const region = await panel("11월 1일");
    expect(within(region).getByText("불러오는 중…")).toBeTruthy();
    expect(within(region).queryByText(NO_RECORDS)).toBeNull();
    expect(within(region).getByRole("button", { name: "등록" })).toBeTruthy();

    release();
    expect(await within(region).findByText(NO_RECORDS)).toBeTruthy();
  });

  it("shows a load error instead of 기록 없음", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => serverError()),
    );
    render(<Ledger />);
    const region = await panel("10월 15일");
    expect(await within(region).findByText("기록을 불러오지 못했습니다.")).toBeTruthy();
    expect(within(region).queryByText(NO_RECORDS)).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("기록을 불러오지 못했습니다");
  });

  it("creates a record in the form dialog with the selected date and closes on save", async () => {
    const user = userEvent.setup();
    render(<Ledger />);
    await user.click(await screen.findByRole("button", { name: "10월 20일, 기록 없음" }));
    await user.click(within(await panel("10월 20일")).getByRole("button", { name: "등록" }));

    const dialog = await screen.findByRole("dialog", { name: "기록 등록" });
    expect((within(dialog).getByLabelText("날짜") as HTMLInputElement).value).toBe("2026-10-20");
    await user.type(within(dialog).getByLabelText("제목"), "저녁");
    await user.type(within(dialog).getByLabelText("금액(원)"), "15000");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByRole("button", { name: "10월 20일, 지출 1건" })).toBeTruthy();
    expect(await within(await panel("10월 20일")).findByText("저녁")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(post?.[1]?.body as string)).toMatchObject({
      date: "2026-10-20",
      title: "저녁",
      amount: 15000,
    });
  });

  it("edits a record in the form dialog and shows the change in the panel", async () => {
    const user = userEvent.setup();
    render(<Ledger />);
    const region = await panel("10월 15일");
    await user.click(await within(region).findByRole("button", { name: "수정" }));

    const dialog = await screen.findByRole("dialog", { name: "기록 수정" });
    const title = within(dialog).getByLabelText("제목");
    expect((title as HTMLInputElement).value).toBe("점심");
    await user.clear(title);
    await user.type(title, "회식");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(String(put?.[0])).toBe("http://localhost:4000/records/1");
    expect(await within(await panel("10월 15일")).findByText("회식")).toBeTruthy();
  });

  it("keeps the selected date when an edit moves the record to another date", async () => {
    const user = userEvent.setup();
    render(<Ledger />);
    await user.click(await within(await panel("10월 15일")).findByRole("button", { name: "수정" }));

    const dialog = await screen.findByRole("dialog", { name: "기록 수정" });
    const date = within(dialog).getByLabelText("날짜");
    await user.clear(date);
    await user.type(date, "2026-10-16");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByRole("button", { name: "10월 16일, 지출 1건" })).toBeTruthy();
    expect(await within(await panel("10월 15일")).findByText(NO_RECORDS)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "10월 15일, 기록 없음" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("closes the form dialog on 취소 without saving", async () => {
    const user = userEvent.setup();
    render(<Ledger />);
    await user.click(within(await panel("10월 15일")).getByRole("button", { name: "등록" }));
    const dialog = await screen.findByRole("dialog", { name: "기록 등록" });
    await user.click(within(dialog).getByRole("button", { name: "취소" }));

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(within(await panel("10월 15일")).getByText("점심")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("asks for confirmation before deleting from the panel", async () => {
    const user = userEvent.setup();
    render(<Ledger />);
    const region = await panel("10월 15일");

    await user.click(await within(region).findByRole("button", { name: "삭제" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(within(confirm).getByText("이 기록을 삭제할까요?")).toBeTruthy();

    await user.click(within(confirm).getByRole("button", { name: "취소" }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);

    await user.click(within(region).getByRole("button", { name: "삭제" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "삭제" }),
    );
    expect(await within(region).findByText(NO_RECORDS)).toBeTruthy();
    expect(screen.getByRole("button", { name: "10월 15일, 기록 없음" })).toBeTruthy();
    const del = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE");
    expect(String(del?.[0])).toBe("http://localhost:4000/records/1");
  });

  it("shows a delete error, reloads anyway and clears the error on date change", async () => {
    const backend = createBackend([lunch]);
    const fetchSpy = vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === "DELETE" ? serverError() : backend(url, init),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const user = userEvent.setup();
    render(<Ledger />);
    const region = await panel("10월 15일");

    await user.click(await within(region).findByRole("button", { name: "삭제" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "삭제" }),
    );
    expect((await within(region).findByRole("alert")).textContent).toBe("서버 오류");
    await vi.waitFor(() =>
      expect(fetchSpy.mock.calls.filter(([, init]) => !init?.method).length).toBe(2),
    );
    expect(within(region).getByText("점심")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "10월 20일, 기록 없음" }));
    await user.click(screen.getByRole("button", { name: "10월 15일, 지출 1건" }));
    expect(within(await panel("10월 15일")).queryByRole("alert")).toBeNull();
  });

  it("keeps the viewed month and selected date and shows a notice when saved to another month", async () => {
    const user = userEvent.setup();
    render(<Ledger />);
    await user.click(await screen.findByRole("button", { name: "10월 31일, 기록 없음" }));
    await user.click(within(await panel("10월 31일")).getByRole("button", { name: "등록" }));

    const dialog = await screen.findByRole("dialog", { name: "기록 등록" });
    const date = within(dialog).getByLabelText("날짜");
    await user.clear(date);
    await user.type(date, "2026-11-01");
    await user.type(within(dialog).getByLabelText("제목"), "월세");
    await user.type(within(dialog).getByLabelText("금액(원)"), "500000");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((await screen.findByRole("status")).textContent).toBe("11월에 저장되었습니다");
    expect(screen.getByRole("heading", { name: "2026년 10월" })).toBeTruthy();
    expect(await panel("10월 31일")).toBeTruthy();
    expect(screen.getByRole("button", { name: "10월 31일, 기록 없음" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "다음 달" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(await screen.findByRole("button", { name: "11월 1일, 지출 1건" })).toBeTruthy();
    expect(await within(await panel("11월 1일")).findByText("월세")).toBeTruthy();
  });
});
