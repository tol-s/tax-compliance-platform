import { describe, expect, it } from "vitest"

import { isActivePath, navigation, visibleNavigation } from "@/lib/navigation"
import type { PermissionKey } from "@/types/api"

const titles = (permissions: PermissionKey[]) =>
  visibleNavigation(permissions).flatMap((group) => group.items.map((item) => item.title))

describe("navigation", () => {
  it("shows only the dashboard to a user without permissions", () => {
    expect(titles([])).toEqual(["Dashboard"])
  })

  it("hides administration from read-only users", () => {
    const visible = titles(["clients.view", "tax_profile.view", "tax_rules.view", "working_papers.view", "forms.view"])
    expect(visible).toContain("Clients")
    expect(visible).toContain("Tax engine")
    expect(visible).not.toContain("Users")
    expect(visible).not.toContain("Audit log")
  })

  it("drops groups that end up empty", () => {
    const groups = visibleNavigation(["clients.view"]).map((group) => group.label)
    expect(groups).not.toContain("Administration")
    expect(groups).not.toContain("Tax configuration")
  })

  it("covers every primary area of the information architecture", () => {
    const hrefs = navigation.flatMap((group) => group.items.map((item) => item.href))
    for (const href of [
      "/dashboard",
      "/clients",
      "/integrations",
      "/tax-engine",
      "/forms",
      "/reports",
      "/settings/users",
      "/settings/roles",
      "/settings/audit",
    ]) {
      expect(hrefs).toContain(href)
    }
  })

  it("matches nested routes as active without prefix collisions", () => {
    expect(isActivePath("/clients/abc/overview", "/clients")).toBe(true)
    expect(isActivePath("/clients", "/clients")).toBe(true)
    expect(isActivePath("/clientsx", "/clients")).toBe(false)
  })
})
