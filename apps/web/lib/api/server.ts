import "server-only"

import { getSession } from "@/lib/auth/session"
import { serverEnv } from "@/lib/env"

import { ApiError } from "./errors"

export interface ApiRequestInit extends Omit<RequestInit, "body"> {
  body?: unknown
  /** Use an explicit token instead of the session (e.g. immediately after login). */
  token?: string | null
  correlationId?: string
}

/**
 * Server-side call to the Laravel API with the session's bearer token.
 * Throws ApiError with the API's error envelope on non-2xx responses.
 */
export async function apiFetch<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { body, token, correlationId, headers, ...rest } = init
  const bearer = token === undefined ? (await getSession())?.token : token

  const response = await fetch(`${serverEnv.apiUrl}/api/v1/${path.replace(/^\//, "")}`, {
    ...rest,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      "X-Correlation-ID": correlationId ?? crypto.randomUUID(),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) return undefined as T

  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, payload)

  return payload as T
}
