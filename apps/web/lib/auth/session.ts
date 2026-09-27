import "server-only"

import { EncryptJWT, jwtDecrypt } from "jose"
import { cookies } from "next/headers"

import { serverEnv } from "@/lib/env"

import { SESSION_COOKIE } from "./session-cookie"

/**
 * The session cookie holds the Laravel API token, encrypted (A256GCM) so it
 * is neither readable nor forgeable by the browser, and httpOnly so page
 * scripts cannot reach it. The API token is never sent to client components.
 */
export { SESSION_COOKIE }

export interface Session {
  token: string
  expiresAt: string
}

async function key(): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serverEnv.sessionSecret))
  return new Uint8Array(digest)
}

export async function sealSession(session: Session): Promise<string> {
  return new EncryptJWT({ token: session.token })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(new Date(session.expiresAt))
    .encrypt(await key())
}

export async function unsealSession(value: string | undefined): Promise<Session | null> {
  if (!value) return null
  try {
    const { payload } = await jwtDecrypt(value, await key())
    if (typeof payload.token !== "string" || typeof payload.exp !== "number") return null
    return {
      token: payload.token,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    }
  } catch {
    return null
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  return unsealSession(store.get(SESSION_COOKIE)?.value)
}

export async function createSession(session: Session): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, await sealSession(session), {
    httpOnly: true,
    secure: serverEnv.isProduction,
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expiresAt),
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
