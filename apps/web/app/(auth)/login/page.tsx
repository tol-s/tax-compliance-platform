import { LandmarkIcon } from "lucide-react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getMe } from "@/lib/auth/me"

import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage() {
  if (await getMe()) redirect("/dashboard")

  return (
    <main className="bg-muted/40 flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-3">
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md">
            <LandmarkIcon className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">Tax Compliance Platform</p>
            <p className="text-muted-foreground text-xs">Accounting firms and tax teams</p>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-6 shadow-xs">
          <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
          <p className="text-muted-foreground mt-1 mb-5 text-sm">Use your organisation account.</p>
          <LoginForm />
        </div>
        <p className="text-muted-foreground text-center text-xs">
          Access is logged. Contact your administrator if you cannot sign in.
        </p>
      </div>
    </main>
  )
}
