import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const getSession = vi.fn()
vi.mock("@/lib/auth/session", () => ({ getSession: () => getSession() }))

describe("BFF proxy", () => {
  beforeEach(() => {
    process.env.API_URL = "http://api.test"
    process.env.SESSION_SECRET = "test-secret-that-is-definitely-long-enough-123"
    getSession.mockReset()
    vi.restoreAllMocks()
  })

  const params = (path: string[]) => ({ params: Promise.resolve({ path }) })

  it("rejects cross-origin mutating requests before touching the API", async () => {
    const { POST } = await import("@/app/api/bff/[...path]/route")
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const request = new NextRequest("http://app.test/api/bff/clients", {
      method: "POST",
      headers: { origin: "http://evil.test" },
    })

    const response = await POST(request, params(["clients"]))

    expect(response.status).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("requires a session", async () => {
    const { GET } = await import("@/app/api/bff/[...path]/route")
    getSession.mockResolvedValue(null)

    const response = await GET(new NextRequest("http://app.test/api/bff/me"), params(["me"]))

    expect(response.status).toBe(401)
    expect((await response.json()).error.code).toBe("unauthenticated")
  })

  it("adds the bearer token server-side and forwards only safe headers", async () => {
    const { GET } = await import("@/app/api/bff/[...path]/route")
    getSession.mockResolvedValue({
      token: "1|secret",
      expiresAt: new Date().toISOString(),
    })
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "content-type": "application/json", "set-cookie": "x=y" },
      })
    )

    const response = await GET(
      new NextRequest("http://app.test/api/bff/clients?page=2", {
        headers: { cookie: "tcp_session=abc", "x-forwarded-for": "1.2.3.4" },
      }),
      params(["clients"])
    )

    const [url, init] = fetchSpy.mock.calls[0]!
    const headers = new Headers((init as RequestInit).headers)
    expect(String(url)).toBe("http://api.test/api/v1/clients?page=2")
    expect(headers.get("authorization")).toBe("Bearer 1|secret")
    expect(headers.get("cookie")).toBeNull()
    expect(headers.get("x-correlation-id")).toMatch(/^[0-9a-f-]{36}$/)
    expect(response.headers.get("set-cookie")).toBeNull()
    expect(response.headers.get("cache-control")).toBe("no-store")
  })

  it("adds the Vercel protection bypass secret only when configured", async () => {
    const { GET } = await import("@/app/api/bff/[...path]/route")
    getSession.mockResolvedValue({ token: "t", expiresAt: new Date().toISOString() })
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }))

    process.env.API_PROTECTION_BYPASS = "bypass-secret"
    await GET(new NextRequest("http://app.test/api/bff/me"), params(["me"]))
    delete process.env.API_PROTECTION_BYPASS
    await GET(new NextRequest("http://app.test/api/bff/me"), params(["me"]))

    const first = new Headers((fetchSpy.mock.calls[0]![1] as RequestInit).headers)
    const second = new Headers((fetchSpy.mock.calls[1]![1] as RequestInit).headers)
    expect(first.get("x-vercel-protection-bypass")).toBe("bypass-secret")
    expect(second.get("x-vercel-protection-bypass")).toBeNull()
  })

  it("rejects path traversal", async () => {
    const { GET } = await import("@/app/api/bff/[...path]/route")
    getSession.mockResolvedValue({
      token: "t",
      expiresAt: new Date().toISOString(),
    })

    const response = await GET(new NextRequest("http://app.test/api/bff/x"), params(["..", "admin"]))

    expect(response.status).toBe(400)
  })
})
