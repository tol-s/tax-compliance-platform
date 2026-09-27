import "server-only"

import { redirect } from "next/navigation"
import { cache } from "react"

import { apiFetch } from "@/lib/api/server"
import { isApiError } from "@/lib/api/errors"
import { getSession } from "@/lib/auth/session"
import type { Me } from "@/types/api"

/** The authenticated principal for this render, fetched once per request. */
export const getMe = cache(async (): Promise<Me | null> => {
  if (!(await getSession())) return null
  try {
    const { data } = await apiFetch<{ data: Me }>("me")
    return data
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 403)) return null
    throw error
  }
})

/** Use in protected layouts and pages: redirects to login if there is no valid session. */
export async function requireMe(): Promise<Me> {
  const me = await getMe()
  if (!me) redirect("/login")
  return me
}
