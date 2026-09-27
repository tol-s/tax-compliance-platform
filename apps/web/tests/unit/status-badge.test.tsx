import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StatusBadge, statusLabel, statusTone } from "@/components/app/status-badge"

describe("status language", () => {
  it.each([
    ["APPROVED", "success"],
    ["REVIEW_REQUIRED", "warning"],
    ["EXCEPTIONS", "destructive"],
    ["CALCULATING", "info"],
    ["FINALIZED", "locked"],
    ["CROSSED_THRESHOLD", "destructive"],
    ["APPROACHING_THRESHOLD", "warning"],
    ["TOKEN_EXPIRED", "warning"],
    ["NON_VAT", "neutral"],
  ])("maps %s to the %s tone", (status, tone) => {
    expect(statusTone(status)).toBe(tone)
  })

  it("falls back to neutral for unknown statuses", () => {
    expect(statusTone("SOMETHING_NEW")).toBe("neutral")
  })

  it("renders human labels, including NON-VAT", () => {
    expect(statusLabel("REVIEW_REQUIRED")).toBe("REVIEW REQUIRED")
    expect(statusLabel("NON_VAT")).toBe("NON-VAT")
  })

  it("exposes status and tone for styling and testing", () => {
    render(<StatusBadge status="READY_FOR_APPROVAL" />)
    const badge = screen.getByText("READY FOR APPROVAL")
    expect(badge).toHaveAttribute("data-status", "READY_FOR_APPROVAL")
    expect(badge).toHaveAttribute("data-tone", "info")
  })
})
