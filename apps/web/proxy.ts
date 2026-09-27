import { type NextRequest, NextResponse } from "next/server"

import { SESSION_COOKIE } from "@/lib/auth/session-cookie"

/**
 * Optimistic route guard: send visitors without a session cookie to /login.
 * The real check happens server-side in requireMe(), and the API authorises
 * every request; this only avoids rendering protected pages needlessly.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE)
  const { pathname } = request.nextUrl

  if (!hasSession && pathname !== "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Everything except the BFF, Next internals, static files and the login page assets.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
}
