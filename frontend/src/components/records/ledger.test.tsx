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

const lunch: RecordDto = {
  id: 1,
  date: "2026-10-15",
  kind: "expense",
  incomeType: null,
  amount: 12000,
  title: "점심",
  memo: "",
};

async function openDay(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
  await user.click(await screen.findByRole("button", { name: label }));
  return screen.findByRole("dialog");
}

describe("Ledger", () => {
  let fetchMock: ReturnType<typeof createBackend>;

  beforeEach(() => {
    // Fake only Date so "today" (KST) is 2026-10-15 while timers stay real for user-event.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T03:00:00Z"));
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000");
    fetchMock = createBackend([lunch]);
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("opens on the current KST month", async () => {
    render(<Ledger />);
    expect(screen.getByRole("heading", { name: "2026년 10월" })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "10월 15일, 기록 1건" })).toBeTruthy();
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://localhost:4000/records?from=2026-10-01&to=2026-10-31",
    );
  });

  it("creates a record from the day dialog with the picked date and closes on save", async () => {
    const user = userEvent.setup();
    render(<Ledger />);
    const dialog = await openDay(user, /^10월 20일, 기록 0건$/);
    expect(within(dialog).getByText("이 날의 기록이 없습니다.")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "닫기" })).toBeTruthy();

    await user.click(within(dialog).getByRole("button", { name: "등록" }));
    expect((within(dialog).getByLabelText("날짜") as HTMLInputElement).value).toBe("2026-10-20");
    await user.type(within(dialog).getByLabelText("제목"), "저녁");
    await user.type(within(dialog).getByLabelText("금액(원)"), "15000");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByRole("button", { name: "10월 20일, 기록 1건" })).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(post?.[1]?.body as string)).toMatchObject({
      date: "2026-10-20",
      title: "저녁",
      amount: 15000,
    });
  });

  it("edits a record from the day dialog", async () => {
    const user = userEvent.setup();
    render(<Ledger />);
    const dialog = await openDay(user, /^10월 15일, 기록 1건$/);
    expect(within(dialog).getByText("점심")).toBeTruthy();

    await user.click(within(dialog).getByRole("button", { name: "수정" }));
    const title = within(dialog).getByLabelText("제목");
    expect((title as HTMLInputElement).value).toBe("점심");
    await user.clear(title);
    await user.type(title, "회식");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(String(put?.[0])).toBe("http://localhost:4000/records/1");
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "10월 15일, 기록 1건" }).textContent).toContain(
        "회식",
      ),
    );
  });

  it("returns from the form to the list on 취소", async () => {
    const user = userEvent.setup();
    render(<Ledger />);
    const dialog = await openDay(user, /^10월 15일, 기록 1건$/);
    await user.click(within(dialog).getByRole("button", { name: "등록" }));
    await user.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(within(dialog).getByText("점심")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "등록" })).toBeTruthy();
  });

  it("asks for confirmation before deleting", async () => {
    const user = userEvent.setup();
    render(<Ledger />);
    const dialog = await openDay(user, /^10월 15일, 기록 1건$/);

    await user.click(within(dialog).getByRole("button", { name: "삭제" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(within(confirm).getByText("이 기록을 삭제할까요?")).toBeTruthy();

    await user.click(within(confirm).getByRole("button", { name: "취소" }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "삭제" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "삭제" }),
    );
    await vi.waitFor(() =>
      expect(within(screen.getByRole("dialog")).getByText("이 날의 기록이 없습니다.")).toBeTruthy(),
    );
    const del = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE");
    expect(String(del?.[0])).toBe("http://localhost:4000/records/1");
  });

  it("keeps the viewed month and shows a notice when saved to another month", async () => {
    const user = userEvent.setup();
    render(<Ledger />);
    const dialog = await openDay(user, /^10월 31일, 기록 0건$/);
    await user.click(within(dialog).getByRole("button", { name: "등록" }));
    const date = within(dialog).getByLabelText("날짜");
    await user.clear(date);
    await user.type(date, "2026-11-01");
    await user.type(within(dialog).getByLabelText("제목"), "월세");
    await user.type(within(dialog).getByLabelText("금액(원)"), "500000");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((await screen.findByRole("status")).textContent).toBe("11월에 저장되었습니다");
    expect(screen.getByRole("heading", { name: "2026년 10월" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "10월 31일, 기록 0건" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "다음 달" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(await screen.findByRole("button", { name: "11월 1일, 기록 1건" })).toBeTruthy();
  });
});
