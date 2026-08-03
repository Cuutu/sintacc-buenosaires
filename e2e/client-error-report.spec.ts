/**
 * @hermetic @critical — reporter boundaries + eventId + sin PII + sin loops.
 */
import { test, expect } from "@playwright/test"
import {
  assertNoAppCrash,
  clickBottomNav,
  enableCelimapDiag,
  installHappyPathMocks,
} from "./helpers"
import { E2E_SESSION_AUTH } from "./fixtures/payloads"

test.describe("Client error observability @hermetic @critical", () => {
  test("page-boundary report: 1 evento, source, from/to/slot, retry + reset", async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000)
    await context.clearCookies()
    await context.route("**/sw.js", (r) => r.abort())
    await enableCelimapDiag(page)
    await installHappyPathMocks(page, { session: E2E_SESSION_AUTH })
    await page.addInitScript(() => {
      ;(window as Window & { __CELIMAP_E2E__?: boolean }).__CELIMAP_E2E__ = true
    })

    const posts: Array<Record<string, unknown>> = []
    await page.route("**/api/client-errors", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      posts.push(body)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ eventId: body.eventId || "E2E001" }),
      })
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("bottom-nav")).toBeVisible({ timeout: 12_000 })

    await clickBottomNav(page, "favoritos")
    await page.waitForURL(/\/favoritos/, { timeout: 12_000 })
    await expect(page.getByTestId("e2e-probe-page")).toBeAttached({ timeout: 8_000 })

    await page.evaluate(() => {
      const w = window as Window & {
        __CELIMAP_E2E__?: boolean
        __CELIMAP_E2E_FORCE_BOUNDARY__?: string
      }
      w.__CELIMAP_E2E__ = true
      w.__CELIMAP_E2E_FORCE_BOUNDARY__ = "page"
      window.dispatchEvent(new Event("celimap-e2e-force-boundary"))
    })
    await expect(page.getByTestId("app-error-boundary")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId("error-event-id")).toBeVisible()
    await expect(page.getByTestId("bottom-nav")).toBeVisible()

    await expect.poll(() => posts.length, { timeout: 8_000 }).toBeGreaterThanOrEqual(1)
    const ev = posts.find((p) => p.source === "page-boundary")!
    expect(ev).toBeTruthy()
    expect(String(ev.message || "")).toMatch(/E2E forced page/)
    expect(JSON.stringify(ev)).not.toMatch(/@gmail|Bearer |cookie=/i)
    // from/to/slot pueden venir del último intent BottomNav
    expect(
      (ev.navigation as { slot?: string } | undefined)?.slot === "favoritos" ||
        (ev.navigation as { slot?: string } | undefined)?.slot === "perfil" ||
        ev.navigation == null
    ).toBeTruthy()

    await page.getByRole("button", { name: "Reintentar" }).click()
    await expect(page.getByTestId("app-error-boundary")).toHaveCount(0, { timeout: 8_000 })

    await page.evaluate(() => {
      const w = window as Window & {
        __CELIMAP_E2E__?: boolean
        __CELIMAP_E2E_FORCE_BOUNDARY__?: string
      }
      w.__CELIMAP_E2E__ = true
      w.__CELIMAP_E2E_FORCE_BOUNDARY__ = "page"
      window.dispatchEvent(new Event("celimap-e2e-force-boundary"))
    })
    await expect(page.getByTestId("app-error-boundary")).toBeVisible({ timeout: 10_000 })
    await page.getByRole("button", { name: "Ir al inicio" }).click()
    await page.waitForURL((u) => u.pathname === "/", { timeout: 12_000 })

    await page.evaluate(() => {
      const w = window as Window & {
        __CELIMAP_E2E__?: boolean
        __CELIMAP_E2E_FORCE_BOUNDARY__?: string
      }
      w.__CELIMAP_E2E__ = true
      w.__CELIMAP_E2E_FORCE_BOUNDARY__ = "page"
      window.dispatchEvent(new Event("celimap-e2e-force-boundary"))
    })
    await expect(page.getByTestId("app-error-boundary")).toBeVisible({ timeout: 10_000 })
    await clickBottomNav(page, "home-map")
    await page.waitForTimeout(900)
    await expect(page.getByTestId("app-error-boundary")).toHaveCount(0)

    expect(posts.filter((p) => p.source === "page-boundary").length).toBeLessThanOrEqual(4)
    await assertNoAppCrash(page)
  })

  test("chrome boundary report + bottom-nav error UI", async ({ page, context }) => {
    await context.clearCookies()
    await context.route("**/sw.js", (r) => r.abort())
    await installHappyPathMocks(page)
    await page.addInitScript(() => {
      ;(window as Window & { __CELIMAP_E2E__?: boolean }).__CELIMAP_E2E__ = true
    })

    const posts: Array<Record<string, unknown>> = []
    await page.route("**/api/client-errors", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      posts.push(body)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ eventId: body.eventId || "E2E002" }),
      })
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("bottom-nav")).toBeVisible({ timeout: 12_000 })
    await expect(page.getByTestId("e2e-probe-chrome")).toBeAttached({ timeout: 8_000 })

    await page.evaluate(() => {
      const w = window as Window & {
        __CELIMAP_E2E__?: boolean
        __CELIMAP_E2E_FORCE_BOUNDARY__?: string
      }
      w.__CELIMAP_E2E__ = true
      w.__CELIMAP_E2E_FORCE_BOUNDARY__ = "chrome"
      window.dispatchEvent(new Event("celimap-e2e-force-boundary"))
    })

    await expect(page.getByTestId("bottom-nav-error-boundary")).toBeVisible({ timeout: 10_000 })
    await expect.poll(() => posts.some((p) => p.source === "bottom-nav-boundary")).toBeTruthy()
    const ev = posts.find((p) => p.source === "bottom-nav-boundary")!
    expect(String(ev.message || "")).toMatch(/E2E forced chrome/)
    expect(JSON.stringify(ev)).not.toMatch(/user@|Bearer /i)
  })
})
