export type ErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL";

export type ErrorDetail = { path: string; message: string };

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: ErrorDetail[];

  constructor(status: number, code: ErrorCode, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(message = "Not Found"): AppError {
  return new AppError(404, "NOT_FOUND", message);
}
