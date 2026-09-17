import type { ApiFailure, ApiSuccess } from "./types";

export class AppError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "AppError";
  }
}

export function success<T>(data: T, status = 200) {
  return Response.json({ ok: true, data } satisfies ApiSuccess<T>, { status });
}

export function failure(error: unknown) {
  if (error instanceof AppError) {
    return Response.json({ ok: false, error: { code: error.code, message: error.message } } satisfies ApiFailure, { status: error.status });
  }
  console.error(error);
  return Response.json({ ok: false, error: { code: "INTERNAL_ERROR", message: "The server could not process this request." } } satisfies ApiFailure, { status: 500 });
}
