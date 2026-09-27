import { type NextRequest, NextResponse } from "next/server"

import { getSession } from "@/lib/auth/session"
import { serverEnv } from "@/lib/env"

/**
 * Backend-for-frontend proxy used by client components (TanStack Query).
 * Adds the bearer token from the encrypted session cookie server-side, so
 * the API token never reaches the browser. Mutating requests must come from
 * this app's own origin (CSRF defence alongside SameSite=Lax cookies).
 */
const FORWARDED_REQUEST_HEADERS = ["accept", "content-type", "x-correlation-id"]
const FORWARDED_RESPONSE_HEADERS = ["content-type", "content-disposition", "x-correlation-id"]
const SAFE_METHODS = new Set(["GET", "HEAD"])

async function handle(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (!SAFE_METHODS.has(request.method)) {
    const origin = request.headers.get("origin")
    if (!origin || origin !== request.nextUrl.origin) {
      return errorResponse(403, "forbidden", "Cross-origin request rejected.")
    }
  }

  const session = await getSession()
  if (!session) return errorResponse(401, "unauthenticated", "Authentication is required.")

  const { path } = await params
  if (path.some((segment) => segment === ".." || segment.includes("/"))) {
    return errorResponse(400, "bad_request", "Invalid path.")
  }

  const url = new URL(`${serverEnv.apiUrl}/api/v1/${path.map(encodeURIComponent).join("/")}`)
  url.search = request.nextUrl.search

  const headers = new Headers({ Authorization: `Bearer ${session.token}` })
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (!headers.has("accept")) headers.set("accept", "application/json")
  if (!headers.has("x-correlation-id")) headers.set("x-correlation-id", crypto.randomUUID())

  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body: SAFE_METHODS.has(request.method) ? undefined : await request.arrayBuffer(),
    cache: "no-store",
    redirect: "manual",
  })

  const responseHeaders = new Headers({ "Cache-Control": "no-store" })
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) responseHeaders.set(name, value)
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE }
