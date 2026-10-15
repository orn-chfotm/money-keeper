import { apiFetch } from "@/lib/api-client";

export type RecordKind = "income" | "expense" | "saving";
export type IncomeType = "salary" | "other";

export type RecordDto = {
  id: number;
  date: string;
  kind: RecordKind;
  incomeType: IncomeType | null;
  amount: number;
  memo: string;
};

export type RecordInput = Omit<RecordDto, "id">;

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "INTERNAL"
  | "UNKNOWN";

export type ApiErrorDetail = { path: string; message: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ErrorBody = {
  error?: { code?: ApiErrorCode; message?: string; details?: ApiErrorDetail[] };
};

async function toApiError(res: Response): Promise<ApiError> {
  let body: ErrorBody | null = null;
  try {
    body = (await res.json()) as ErrorBody;
  } catch {
    // Non-JSON error body; fall back to the status code.
  }
  const error = body?.error;
  return new ApiError(
    res.status,
    error?.code ?? "UNKNOWN",
    error?.message ?? `요청이 실패했습니다 (HTTP ${res.status}).`,
    Array.isArray(error?.details) ? error.details : [],
  );
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw await toApiError(res);
  return res;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function listRecords(from: string, to: string): Promise<RecordDto[]> {
  const query = new URLSearchParams({ from, to });
  const res = await request(`/records?${query}`);
  const body = (await res.json()) as { items: RecordDto[] };
  return body.items;
}

export async function createRecord(input: RecordInput): Promise<RecordDto> {
  const res = await request("/records", jsonInit("POST", input));
  return (await res.json()) as RecordDto;
}

export async function updateRecord(id: number, input: RecordInput): Promise<RecordDto> {
  const res = await request(`/records/${id}`, jsonInit("PUT", input));
  return (await res.json()) as RecordDto;
}

export async function deleteRecord(id: number): Promise<void> {
  await request(`/records/${id}`, { method: "DELETE" });
}
