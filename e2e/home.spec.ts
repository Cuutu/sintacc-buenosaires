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
  test("stats carousel: fixture 200 visible, 3 cards, sin overflow", async ({ page }) => {
    await installHappyPathMocks(page)
    const guards = attachPageErrorGuards(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.waitForSelector('[data-carousel="stats"]', { timeout: 10_000 })
    await assertNoAppCrash(page)
    await assertDocumentNoHorizontalScroll(page)

    const carousel = page.locator('[data-carousel="stats"]')
    await expect(carousel).toBeVisible()
    const cards = carousel.locator("article")
    await expect(cards).toHaveCount(3)

    // Números del fixture — no solo skeleton/fallback "—"
    await expect(carousel.getByText(`${E2E_STATS.placesCount} locales`)).toBeVisible()
    await expect(carousel.getByText(`${E2E_STATS.reviewsCount} experiencias`)).toBeVisible()
    await expect(carousel.getByText(`${E2E_STATS.usersCount} usuarios`)).toBeVisible()
    await expect(carousel.locator(".animate-pulse")).toHaveCount(0)

    const firstBox = await cards.nth(0).boundingBox()
    expect(firstBox).toBeTruthy()
    expect(firstBox!.x).toBeGreaterThanOrEqual(-2)
    expect(firstBox!.x + firstBox!.width).toBeLessThanOrEqual(390 + 2)

    await carousel.evaluate((el) => {
      el.scrollLeft = el.scrollWidth
    })
    await page.waitForTimeout(300)

    const lastBox = await cards.nth(2).boundingBox()
    expect(lastBox).toBeTruthy()
    expect(lastBox!.x).toBeGreaterThanOrEqual(-2)
    expect(lastBox!.x + lastBox!.width).toBeLessThanOrEqual(390 + 4)
    assertHappyPathNetwork(guards.responses500, guards.networkFailures)
  })

  test("buscador apilado en 320 y en fila en 640", async ({ page }) => {
    await installHappyPathMocks(page)
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    const form = page.getByTestId("home-search-bar")
    await expect(form).toBeVisible()
    expect(
      await form.evaluate((el) => getComputedStyle(el).flexDirection === "column")
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
