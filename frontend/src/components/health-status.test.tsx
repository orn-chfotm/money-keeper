import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HealthStatus } from "./health-status";

describe("HealthStatus", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("shows checking state before the response arrives", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    render(<HealthStatus />);
    expect(screen.getByText("서버 상태: 확인 중")).toBeTruthy();
  });

  it("shows 정상 when /health/ready returns 200", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 200 })),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<HealthStatus />);
    expect(await screen.findByText("서버 상태: 정상")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/health/ready",
      undefined,
    );
  });

  it("shows DB 오류 when /health/ready returns 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(null, { status: 503 }))),
    );
    render(<HealthStatus />);
    expect(await screen.findByText("서버 상태: DB 오류")).toBeTruthy();
  });

  it("shows 연결 실패 when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    );
    render(<HealthStatus />);
    expect(await screen.findByText("서버 상태: 연결 실패")).toBeTruthy();
  });
});
