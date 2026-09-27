import type { ApiErrorBody } from "@/types/api"

/** An error returned by the API, carrying the envelope's code and correlation ID. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly correlationId?: string
  readonly fieldErrors?: Record<string, string[]>

  constructor(status: number, body: Partial<ApiErrorBody> | null) {
    super(body?.error?.message ?? `Request failed with status ${status}`)
    this.name = "ApiError"
    this.status = status
    this.code = body?.error?.code ?? "http_error"
    this.correlationId = body?.error?.correlation_id
    this.fieldErrors = body?.error?.details?.fields
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
