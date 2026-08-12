/**
 * @hermetic @resilience — 500 intencionales + fallbacks recuperables.
 * NO usar allowlist global: cada test provoca el error.
 */
import { test, expect } from "@playwright/test"
import {
  attachPageErrorGuards,
  assertNoAppCrash,
  installHappyPathMocks,
  installMapboxForceInitError,
  installMapboxE2eAdapter,
  waitForMapAdapterOrFallback,
} from "./helpers"
import { E2E_PLACES_LIST, E2E_STATS } from "./fixtures/payloads"

test.describe("resiliencia negativa @hermetic @resilience", () => {
  test("stats 500 → home estructura + fallback —", async ({ page }) => {
    await installHappyPathMocks(page)
    await page.unroute("**/api/stats**")
    await page.route("**/api/stats**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "e2e stats down" }),
      })
    })

    const guards = attachPageErrorGuards(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.waitForSelector('[data-testid="home-stats"]', { timeout: 10_000 })
    await expect(page.getByTestId("home-stats").locator("li")).toHaveCount(3)
    await expect(page.getByTestId("home-search-bar")).toBeVisible()
    // Fallback: em-dash, no numbers fixture
    await expect(page.getByText(String(E2E_STATS.placesCount))).toHaveCount(0)
    await expect(page.getByTestId("home-stats")).toContainText("—")
    await assertNoAppCrash(page)
    expect(guards.responses500.some((r) => r.url.includes("/api/stats"))).toBeTruthy()
  })

  test("places 500 → listado error recuperable", async ({ page }) => {
    await installHappyPathMocks(page)
    await installMapboxE2eAdapter(page)
    await page.unroute("**/api/places**")
    await page.route("**/api/places**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Error al obtener lugares" }),
      })
    })

    const guards = attachPageErrorGuards(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/mapa?list=open", { waitUntil: "domcontentloaded" })
    await waitForMapAdapterOrFallback(page)
    await expect(page.locator("[data-places-error]")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("button", { name: /Reintentar/i })).toBeVisible()
    await assertNoAppCrash(page)
    expect(guards.responses500.some((r) => r.url.includes("/api/places"))).toBeTruthy()
  })

  test("auth session 500 → favoritos session_error", async ({ page, context }) => {
    await context.clearCookies()
    await installHappyPathMocks(page, { sessionStatus: 500, session: { error: "e2e" } })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/favoritos", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-auth-state="session_error"]')).toBeVisible({
      timeout: 12_000,
    })
    await assertNoAppCrash(page)
  })

  test("fallo Mapbox → fallback recuperable", async ({ page }) => {
    await installHappyPathMocks(page)
    await installMapboxForceInitError(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/mapa", { waitUntil: "domcontentloaded" })
    await expect(page.getByText(/No pudimos cargar el mapa/i)).toBeVisible({ timeout: 10_000 })
    await assertNoAppCrash(page)
  })

  test("retry places: 500 luego 200 → lista recupera", async ({ page }) => {
    await installHappyPathMocks(page)
    await installMapboxE2eAdapter(page)

    let allowSuccess = false
    await page.unroute("**/api/places**")
    await page.route("**/api/places**", async (route) => {
      if (!allowSuccess) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Error al obtener lugares" }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(E2E_PLACES_LIST),
      })
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/mapa?list=open", { waitUntil: "domcontentloaded" })
    await expect(page.locator("[data-places-error]")).toBeVisible({ timeout: 15_000 })
    allowSuccess = true
    await page.getByRole("button", { name: /Reintentar/i }).click()
    await expect(page.locator("[data-places-error]")).toHaveCount(0, { timeout: 10_000 })
    await expect(page.getByText(/Local E2E Fixture/i)).toBeVisible({ timeout: 10_000 })
    await assertNoAppCrash(page)
  })
})
