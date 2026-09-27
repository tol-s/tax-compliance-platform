"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { isApiError } from "@/lib/api/errors"
import { apiFetch } from "@/lib/api/server"
import { createSession, destroySession, getSession } from "@/lib/auth/session"

const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(255),
  password: z.string().min(1, "Enter your password").max(255),
})

export interface LoginState {
  message?: string
  fieldErrors?: Partial<Record<"email" | "password", string[]>>
  email?: string
}

interface LoginResponse {
  data: { token: string; token_type: "Bearer"; expires_at: string | null }
}

export async function login(_state: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  const email = String(formData.get("email") ?? "")

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, email }
  }

  let token: string
  let expiresAt: string
  try {
    const { data } = await apiFetch<LoginResponse>("auth/login", {
      method: "POST",
      token: null,
      body: { ...parsed.data, device_name: "web" },
    })
    token = data.token
    expiresAt = data.expires_at ?? new Date(Date.now() + 8 * 3600_000).toISOString()

    // Confirm the user can enter at least one organisation before creating a session.
    await apiFetch("me", { token })
  } catch (error) {
    if (isApiError(error)) {
      if (error.code === "no_active_membership") {
        return {
          message: "Your account does not have access to any organisation yet. Ask an administrator to invite you.",
          email,
        }
      }
      if (error.code === "rate_limited") {
        return {
          message: "Too many sign-in attempts. Wait a minute and try again.",
          email,
        }
      }
      if (error.code === "validation_failed") {
        return { message: "Email or password is incorrect.", email }
      }
      return {
        message: `Sign-in failed. Reference: ${error.correlationId ?? "n/a"}`,
        email,
      }
    }
    return { message: "The service is unavailable. Try again shortly.", email }
  }

  await createSession({ token, expiresAt })
  redirect("/dashboard")
}

export async function logout(): Promise<void> {
  if (await getSession()) {
    // Revoke the API token; the local session is cleared regardless.
    await apiFetch("auth/logout", { method: "POST" }).catch(() => undefined)
  }
  await destroySession()
  redirect("/login")
}

const switchSchema = z.object({ organizationId: z.uuid() })

export async function switchOrganization(organizationId: string): Promise<{ ok: boolean; message?: string }> {
  const parsed = switchSchema.safeParse({ organizationId })
  if (!parsed.success) return { ok: false, message: "Invalid organisation." }

  try {
    await apiFetch("me/organization", {
      method: "POST",
      body: { organization_id: parsed.data.organizationId },
    })
  } catch (error) {
    if (isApiError(error) && error.status === 401) redirect("/login")
    return { ok: false, message: "You cannot switch to that organisation." }
  }
  redirect("/dashboard")
}
