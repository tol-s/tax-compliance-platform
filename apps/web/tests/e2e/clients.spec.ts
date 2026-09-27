import path from "node:path"

import { expect, test, type Page } from "@playwright/test"

const CERTIFICATE = path.join(__dirname, "fixtures", "certificate.pdf")

async function signIn(page: Page, email: string) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill("demo-password")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test("a manager adds a NON-VAT client from its certificate, then records a VAT registration with evidence", async ({
  page,
}) => {
  const name = `E2E Fictional Traders ${Date.now()}`
  await signIn(page, "tax-manager@demo.test")
  await page.goto("/clients")

  await page.getByRole("button", { name: "Add client" }).click()
  const sheet = page.getByRole("dialog", { name: "Add client" })
  await sheet.getByLabel("Registered legal name").fill(name)
  await sheet.getByLabel("Entity type").selectOption("CORPORATION")
  await sheet.getByLabel("VAT status").selectOption("NON_VAT")
  await sheet.getByLabel("Effective from").fill("2025-01-01")

  // The certificate is mandatory when the status is sourced from it.
  await sheet.getByRole("button", { name: "Add client" }).click()
  await expect(sheet.getByText("Upload the BIR Certificate of Registration")).toBeVisible()
  await sheet.getByLabel("Certificate of Registration").setInputFiles(CERTIFICATE)
  await sheet.getByRole("button", { name: "Add client" }).click()

  await expect(page).toHaveURL(/\/tax-profile$/)
  await expect(page.getByRole("heading", { name })).toBeVisible()
  await expect(page.getByTestId("registration-source")).toHaveText("BIR Certificate of Registration")

  await page.getByRole("button", { name: "Change status" }).click()
  const dialog = page.getByRole("dialog", { name: "Change registration status" })
  await dialog.getByLabel("VAT status").selectOption("VAT_REGISTERED")
  await dialog.getByLabel("Effective from").fill("2026-03-01")
  await dialog.getByLabel("Supporting document").setInputFiles(CERTIFICATE)
  await dialog.getByLabel("Reason").fill("Registered for VAT; updated certificate received from the client.")
  await dialog.getByRole("button", { name: "Record change" }).click()
  await expect(dialog).toBeHidden()

  const history = page.getByLabel("Registration history")
  await expect(history.getByText("1 Jan 2025 to 1 Mar 2026")).toBeVisible()
  await expect(history.getByText("1 Mar 2026 to present")).toBeVisible()

  await page.getByRole("link", { name: "Audit log" }).last().click()
  const events = page.getByLabel("Audit events")
  await expect(events.getByText("Registration status changed", { exact: true })).toBeVisible()
  await expect(events.getByText("Registration status recorded", { exact: true })).toBeVisible()
})

test("a preparer sees only assigned clients and cannot open others", async ({ page }) => {
  await signIn(page, "tax-preparer@demo.test")
  await page.goto("/clients")
  await expect(page.getByText("No clients yet")).toBeVisible()
  await expect(page.getByRole("button", { name: "Add client" })).toHaveCount(0)
})

test("the clients grid searches on the server", async ({ page }) => {
  await signIn(page, "reviewer@demo.test")
  await page.goto("/clients")
  await page.getByLabel("Search clients").fill("Sampaguita")
  await expect(page.getByText("Demo Sampaguita Design Studio")).toBeVisible()
  await expect(page.getByText("Demo Harbour Trading Corp")).toHaveCount(0)
  await page.getByLabel("Search clients").fill("000-111-222-00000")
  await expect(page.getByText("Demo Harbour Trading Corp")).toBeVisible()
})

test("administrators see the role matrix and member list", async ({ page }) => {
  await signIn(page, "admin@demo.test")
  await page.goto("/settings/roles")
  await expect(page.getByRole("columnheader", { name: "Tax Preparer" })).toBeVisible()
  await expect(page.getByText("calculations.approve")).toBeVisible()
  await page.goto("/settings/users")
  await expect(page.getByText("owner@demo.test")).toBeVisible()
})
