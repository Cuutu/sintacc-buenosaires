/**
 * @hermetic @mobile — favoritos: unauth / loading / auth 500 (separados)
 */
import { test, expect } from "@playwright/test"
import {
  attachPageErrorGuards,
  assertNoAppCrash,
  assertPageErrorsClean,
  assertHappyPathNetwork,
  installHappyPathMocks,
} from "./helpers"

const host = () =>
  new URL(test.info().project.use.baseURL || "http://127.0.0.1:3000").host

test.describe("favoritos auth states @hermetic @mobile", () => {
  test("sesión válida no autenticada (200 null) → redirect/login", async ({ page, context }) => {
    await context.clearCookies()
    await installHappyPathMocks(page) // session null 200
    const guards = attachPageErrorGuards(page)
    const cancels: string[] = []

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/favoritos", { waitUntil: "domcontentloaded" })
    await Promise.race([
      page.waitForURL(/\/login/, { timeout: 12_000 }),
      page.locator('[data-auth-state="unauthenticated"]').waitFor({
        state: "visible",
        timeout: 12_000,
      }),
    ]).catch(() => null)

    await assertNoAppCrash(page)
    const url = page.url()
    const state = await page
      .locator("[data-auth-state]")
      .first()
      .getAttribute("data-auth-state")
      .catch(() => null)
    expect(/\/login/.test(url) || state === "unauthenticated").toBeTruthy()
    assertHappyPathNetwork(guards.responses500, guards.networkFailures)
    assertPageErrorsClean(guards.pageErrors, { baseHost: host(), webkitRscCancels: cancels })
  })

  test("sesión cargando → data-auth-state=loading", async ({ page, context }) => {
    await context.clearCookies()
    await installHappyPathMocks(page, { delaySessionMs: 8_000 })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/favoritos", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-auth-state="loading"]')).toBeVisible({ timeout: 3_000 })
    await assertNoAppCrash(page)
  })

  test("API auth session 500 → session_error recuperable, no vacío", async ({ page, context }) => {
    await context.clearCookies()
    // Solo session 500 — resto happy mocks
    await installHappyPathMocks(page, { sessionStatus: 500, session: { error: "e2e" } })
    const guards = attachPageErrorGuards(page)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/favoritos", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-auth-state="session_error"]')).toBeVisible({
      timeout: 12_000,
    })
    await expect(page.getByRole("button", { name: /Reintentar/i })).toBeVisible()
    await assertNoAppCrash(page)
    const text = (await page.locator("body").innerText()).trim()
    expect(text.length).toBeGreaterThan(20)
    // Este test INTENCIONALMENTE produce 500 en /api/auth/session
    expect(guards.responses500.some((r) => r.url.includes("/api/auth/session"))).toBeTruthy()
  })
})
