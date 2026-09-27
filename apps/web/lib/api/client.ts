import { ApiError } from "./errors"

/** Client-side fetch through the BFF proxy (/api/bff/*). The session cookie is sent automatically. */
export async function bffFetch<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init
  const response = await fetch(`/api/bff/${path.replace(/^\//, "")}`, {
    ...rest,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })

  if (response.status === 204) return undefined as T
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, payload)
  return payload as T
}
