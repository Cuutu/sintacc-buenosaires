/**
 * @hermetic @mobile — home con fixtures 200 (no skeleton-only)
 */
import { test, expect } from "@playwright/test"
import {
  attachPageErrorGuards,
  assertNoAppCrash,
  assertDocumentNoHorizontalScroll,
  assertHappyPathNetwork,
  installHappyPathMocks,
} from "./helpers"
import { E2E_STATS } from "./fixtures/payloads"

test.describe("home carrusel y buscador @hermetic @mobile", () => {
  test("stats block: fixture 200 visible, 3 métricas, sin overflow", async ({ page }) => {
    await installHappyPathMocks(page)
    const guards = attachPageErrorGuards(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.waitForSelector('[data-testid="home-stats"]', { timeout: 10_000 })
    await assertNoAppCrash(page)
    await assertDocumentNoHorizontalScroll(page)

    const stats = page.getByTestId("home-stats")
    await expect(stats).toBeVisible()
    await expect(stats.locator("li")).toHaveCount(3)

    await expect(stats.getByText(String(E2E_STATS.placesCount), { exact: true })).toBeVisible()
    await expect(stats.getByText("lugares")).toBeVisible()
    await expect(stats.getByText(String(E2E_STATS.reviewsCountGoogle), { exact: true })).toBeVisible()
    await expect(stats.getByText(String(E2E_STATS.usersCount), { exact: true })).toBeVisible()
    await expect(stats.getByText("usuarios")).toBeVisible()
    await expect(stats.locator(".animate-pulse")).toHaveCount(0)

    const box = await stats.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.x).toBeGreaterThanOrEqual(-2)
    expect(box!.x + box!.width).toBeLessThanOrEqual(390 + 2)

    assertHappyPathNetwork(guards.responses500, guards.networkFailures)
  })

  test("buscador integrado en una fila en 320 y 640", async ({ page }) => {
    await installHappyPathMocks(page)
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    const form = page.getByTestId("home-search-bar")
    await expect(form).toBeVisible()
    expect(
      await form.evaluate((el) => getComputedStyle(el).flexDirection === "row")
    ).toBe(true)

    await page.setViewportSize({ width: 640, height: 800 })
    await page.waitForTimeout(200)
    expect(
      await form.evaluate((el) => getComputedStyle(el).flexDirection === "row")
    ).toBe(true)
  })

  test("CTA Abrir el mapa visible", async ({ page }) => {
    await installHappyPathMocks(page)
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("link", { name: /Abrir el mapa/i })).toBeVisible()
  })
})
