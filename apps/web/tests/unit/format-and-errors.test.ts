import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/errors"
import { applyApiErrors } from "@/lib/api/form-errors"
import { auditActionLabel, formatBytes, formatDate, monthName } from "@/lib/format"

describe("formatting", () => {
  it("formats dates unambiguously and handles missing values", () => {
    expect(formatDate("2026-03-01")).toBe("1 Mar 2026")
    expect(formatDate(null)).toBe("–")
  })

  it("formats sizes and months", () => {
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(2048)).toBe("2.0 KB")
    expect(monthName(12)).toBe("December")
  })

  it("describes audit actions and falls back to the raw key", () => {
    expect(auditActionLabel("registration_status.changed")).toBe("Registration status changed")
    expect(auditActionLabel("future.action")).toBe("future.action")
  })
})

describe("applyApiErrors", () => {
  const validation = new ApiError(422, {
    error: {
      code: "validation_failed",
      message: "The given data was invalid.",
      details: { fields: { "registration.vat_status": ["Choose one"], unknown_field: ["Other problem"] } },
    },
  })

  it("maps nested API fields onto form fields", () => {
    const setError = vi.fn()
    applyApiErrors(validation, setError, { "registration.vat_status": "vat_status" as never })
    expect(setError).toHaveBeenCalledWith("vat_status", { type: "server", message: "Choose one" })
  })

  it("returns a permission message for 403s and a reference for server errors", () => {
    expect(applyApiErrors(new ApiError(403, null), vi.fn())).toBe("You do not have permission to do this.")
    const server = new ApiError(500, { error: { code: "server_error", message: "Oops", correlation_id: "abc" } })
    expect(applyApiErrors(server, vi.fn())).toBe("Oops (reference abc)")
  })
})
