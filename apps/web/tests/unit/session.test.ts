import { beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ cookies: vi.fn() }))

describe("session sealing", () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = "test-secret-that-is-definitely-long-enough-123"
    process.env.API_URL = "http://api.test"
  })

  it("round-trips the API token and does not expose it in plaintext", async () => {
    const { sealSession, unsealSession } = await import("@/lib/auth/session")
    const expiresAt = new Date(Date.now() + 3600_000).toISOString()

    const sealed = await sealSession({
      token: "1|super-secret-token",
      expiresAt,
    })

    expect(sealed).not.toContain("super-secret-token")
    expect(Buffer.from(sealed.split(".")[3] ?? "", "base64url").toString()).not.toContain("super-secret-token")
    const session = await unsealSession(sealed)
    expect(session?.token).toBe("1|super-secret-token")
  })

  it("rejects tampered, foreign and expired sessions", async () => {
    const { sealSession, unsealSession } = await import("@/lib/auth/session")
    const sealed = await sealSession({
      token: "t",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    })

    expect(await unsealSession(sealed.slice(0, -2) + "xx")).toBeNull()
    expect(await unsealSession("not-a-jwe")).toBeNull()
    expect(await unsealSession(undefined)).toBeNull()

    const expired = await sealSession({
      token: "t",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    })
    expect(await unsealSession(expired)).toBeNull()
  })
})
