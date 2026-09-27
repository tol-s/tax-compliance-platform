"use client"

import { TriangleAlertIcon } from "lucide-react"
import { useActionState } from "react"

import { Alert, AlertDescription } from "@/components/reui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { login } from "@/lib/auth/actions"

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined)
  const emailError = state?.fieldErrors?.email?.[0]
  const passwordError = state?.fieldErrors?.password?.[0]

  return (
    <form action={action} noValidate>
      <FieldGroup>
        {state?.message ? (
          <Alert variant="destructive" aria-live="assertive">
            <TriangleAlertIcon aria-hidden />
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={Boolean(emailError) || undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            defaultValue={state?.email}
            aria-invalid={Boolean(emailError) || undefined}
            aria-describedby={emailError ? "email-error" : undefined}
          />
          {emailError ? <FieldError id="email-error">{emailError}</FieldError> : null}
        </Field>
        <Field data-invalid={Boolean(passwordError) || undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(passwordError) || undefined}
            aria-describedby={passwordError ? "password-error" : undefined}
          />
          {passwordError ? <FieldError id="password-error">{passwordError}</FieldError> : null}
        </Field>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Spinner aria-hidden /> : null}
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  )
}
