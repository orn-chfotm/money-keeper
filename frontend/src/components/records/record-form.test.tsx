import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RecordDto } from "@/lib/records-api";
import { RecordForm } from "./record-form";

const savedRecord: RecordDto = {
  id: 1,
  date: "2026-10-15",
  kind: "income",
  incomeType: "salary",
  amount: 3000000,
  memo: "",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderForm(onSaved = vi.fn()) {
  render(<RecordForm defaultDate="2026-10-15" onSaved={onSaved} />);
  return onSaved;
}

function setAmount(value: string) {
  fireEvent.change(screen.getByLabelText("금액(원)"), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
}

describe("RecordForm", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000");
    fetchMock = vi.fn(() => Promise.resolve(jsonResponse(savedRecord, 201)));
    vi.stubGlobal("fetch", fetchMock);
    // Radix RadioGroup measures items with ResizeObserver, which jsdom lacks.
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
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("blocks a 0 won amount", () => {
    renderForm();
    setAmount("0");
    submit();
    expect(screen.getByText("금액은 1원 이상이어야 합니다.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks amounts of 1 billion won or more", () => {
    renderForm();
    setAmount("1000000000");
    submit();
    expect(screen.getByText("금액은 10억 원 미만이어야 합니다.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks an empty date", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("날짜"), { target: { value: "" } });
    setAmount("1000");
    submit();
    expect(screen.getByText("날짜를 입력하세요.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks a memo longer than 200 characters", () => {
    renderForm();
    setAmount("1000");
    fireEvent.change(screen.getByLabelText("메모"), { target: { value: "a".repeat(201) } });
    submit();
    expect(screen.getByText("메모는 200자 이하로 입력하세요.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows income types only when 수입 is selected", () => {
    renderForm();
    expect(screen.queryByRole("radio", { name: "급여" })).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "수입" }));
    expect(screen.getByRole("radio", { name: "급여" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "기타" })).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "저축" }));
    expect(screen.queryByRole("radio", { name: "급여" })).toBeNull();
  });

  it("requires an income type for 수입", async () => {
    const onSaved = renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "수입" }));
    setAmount("3000000");
    submit();
    expect(screen.getByText("수입 종류(급여·기타)를 선택하세요.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "급여" }));
    submit();
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith(savedRecord));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/records");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      date: "2026-10-15",
      kind: "income",
      incomeType: "salary",
      amount: 3000000,
      memo: "",
    });
  });

  it("sends incomeType null for non-income kinds", async () => {
    const onSaved = renderForm();
    setAmount("12000");
    submit();
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      kind: "expense",
      incomeType: null,
      amount: 12000,
    });
  });

  it("shows server VALIDATION_ERROR messages", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        jsonResponse(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "입력값이 올바르지 않습니다.",
              details: [{ path: "date", message: "존재하지 않는 날짜입니다." }],
            },
          },
          400,
        ),
      ),
    );
    const onSaved = renderForm();
    setAmount("1000");
    submit();
    expect(await screen.findByText("입력값이 올바르지 않습니다.")).toBeTruthy();
    expect(screen.getByText("존재하지 않는 날짜입니다.")).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
