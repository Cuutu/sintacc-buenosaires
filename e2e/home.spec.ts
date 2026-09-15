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

test.describe("home carrusel y buscador @hermetic @mobile", () => {
  test("hero sin stats, CTA + buscador visibles, sin overflow", async ({ page }) => {
    await installHappyPathMocks(page)
    const guards = attachPageErrorGuards(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.waitForSelector('[data-testid="home-open-map"]', { timeout: 10_000 })
    await assertNoAppCrash(page)
    await assertDocumentNoHorizontalScroll(page)

    await expect(page.getByTestId("home-stats")).toHaveCount(0)
    await expect(page.getByTestId("home-open-map")).toBeVisible()
    await expect(page.getByTestId("home-search-bar")).toBeVisible()

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

  test("CTA Abrir el mapa visible sin scroll en mobile", async ({ page }) => {
    await installHappyPathMocks(page)
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    const cta = page.getByTestId("home-open-map")
    await expect(cta).toBeVisible()
    const box = await cta.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.y + box!.height).toBeLessThanOrEqual(667)
    await expect(page.locator("[data-store-banner]")).toHaveCount(0)
  })
})
