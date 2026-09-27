import { expect, test, type Page } from "@playwright/test"

// Demo users seeded by apps/api DemoSeeder (DEMO_MODE=true). Tests use different users
// so repeated runs stay under the per-email login rate limit.
const PASSWORD = "demo-password"

async function signIn(page: Page, email: string) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test("redirects anonymous visitors to sign in @mobile", async ({ page }) => {
  await page.goto("/clients")
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
})

test("shows a generic error for bad credentials", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("owner@demo.test")
  await page.getByLabel("Password").fill("wrong-password")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("alert").filter({ hasText: "Email or password is incorrect." })).toBeVisible()
})

test("owner sees the full shell, demo banner and honest empty states", async ({ page }) => {
  await signIn(page, "owner@demo.test")

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  await expect(page.getByRole("note")).toContainText("Demo organisation")
  await expect(page.getByText("No clients yet")).toBeVisible()

  const nav = page.getByRole("navigation", { name: "Primary" }).or(page.locator("[data-sidebar=sidebar]"))
  for (const item of ["Clients", "Integrations", "Tax engine", "Forms", "Users", "Audit log"]) {
    await expect(nav.getByRole("link", { name: item, exact: true })).toBeVisible()
  }

  await page.screenshot({
    path: "test-results/dashboard-owner.png",
    fullPage: true,
  })
})

test("read-only users do not see administration", async ({ page }) => {
  await signIn(page, "read-only@demo.test")
  const nav = page.locator("[data-sidebar=sidebar]")
  await expect(nav.getByRole("link", { name: "Clients", exact: true })).toBeVisible()
  await expect(nav.getByRole("link", { name: "Users", exact: true })).toHaveCount(0)

  await page.goto("/settings/users")
  await expect(page.getByText("You do not have access to this area")).toBeVisible()
})

test("command palette opens with Ctrl+K and navigates", async ({ page }) => {
  await signIn(page, "admin@demo.test")
  const input = page.getByPlaceholder("Search pages, clients, periods, forms…")
  // The shortcut listener attaches on hydration; retry until the palette opens.
  await expect(async () => {
    if (!(await input.isVisible())) await page.keyboard.press("Control+k")
    await expect(input).toBeVisible({ timeout: 1000 })
  }).toPass()
  await input.fill("tax engine")
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/tax-engine$/)
  await expect(page.getByText("No rule sets loaded")).toBeVisible()
})

test("unknown client ids render not found, never a fabricated taxpayer", async ({ page }) => {
  await signIn(page, "tax-manager@demo.test")
  await page.goto("/clients/01a0e257-0000-7000-8000-000000000000/overview")
  await expect(page.getByText("This record does not exist")).toBeVisible()
})

test("sign out revokes the session", async ({ page }) => {
  await signIn(page, "tax-preparer@demo.test")
  await page.getByRole("button", { name: /Account menu/ }).click()
  await page.getByRole("button", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login$/)
})

test("mobile shows the dashboard @mobile", async ({ page }, testInfo) => {
  await signIn(page, "reviewer@demo.test")
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  await page.screenshot({
    path: `test-results/dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  })
})
