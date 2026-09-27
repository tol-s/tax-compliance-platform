import type { FieldValues, Path, UseFormSetError } from "react-hook-form"

import { isApiError } from "./errors"

/**
 * Maps the API's field errors onto a React Hook Form instance. Nested API
 * keys ("registration.vat_status") map to the form's field names when they
 * exist; everything else is returned as a general message.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldMap: Record<string, Path<T>> = {}
): string | null {
  if (!isApiError(error)) return "The request could not be completed. Check your connection and try again."
  if (!error.fieldErrors) {
    return error.status === 403
      ? "You do not have permission to do this."
      : `${error.message}${error.correlationId ? ` (reference ${error.correlationId})` : ""}`
  }

  const unmatched: string[] = []
  for (const [key, messages] of Object.entries(error.fieldErrors)) {
    const field = fieldMap[key] ?? (key as Path<T>)
    if (messages[0]) {
      try {
        setError(field, { type: "server", message: messages[0] })
      } catch {
        unmatched.push(messages[0])
      }
    }
  }
  return unmatched.length ? unmatched.join(" ") : null
}
