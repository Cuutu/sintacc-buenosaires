/**
 * @hermetic @critical — suite mínima contra next build + next start.
 * Happy-path: mocks 200, cero 500 allowlisted.
 */
import { test, expect } from "@playwright/test"
import {
  CRITICAL_OVERFLOW_VIEWPORTS,
  attachPageErrorGuards,
  assertNoAppCrash,
  assertBodyHasVisibleContent,
  assertNoAccidentalOverflow,
  assertHappyPathNetwork,
  assertPageErrorsClean,
  installHappyPathMocks,
  installMapboxE2eAdapter,
  readMapboxLifecycleStats,
  countMapCanvases,
  waitForMapAdapterOrFallback,
  softLeaveMapa,
  softEnterMapa,
} from "./helpers"
import { E2E_STATS } from "./fixtures/payloads"

const host = () =>
  new URL(test.info().project.use.baseURL || "http://127.0.0.1:3000").host

test.describe("suite crítica @hermetic @critical", () => {
  test("home + búsqueda + overflow document", async ({ page }) => {
    await installHappyPathMocks(page)
    const guards = attachPageErrorGuards(page)
    const cancels: string[] = []
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.waitForSelector('[data-testid="home-stats"]', { timeout: 10_000 })
    const stats = page.getByTestId("home-stats")
    await expect(stats.getByText(String(E2E_STATS.placesCount), { exact: true })).toBeVisible({
      timeout: 8_000,
    })
    await expect(stats.getByText("lugares en el mapa")).toBeVisible()
    await expect(stats.getByText(String(E2E_STATS.reviewsCountGoogle), { exact: true })).toBeVisible()
    await expect(stats.getByText("reseñas en Google")).toBeVisible()
    await expect(stats.getByText(String(E2E_STATS.usersCount), { exact: true })).toBeVisible()
    await expect(stats.getByText("usuarios registrados")).toBeVisible()
    await expect(stats.locator("li")).toHaveCount(3)
    await assertNoAppCrash(page)
    await assertBodyHasVisibleContent(page)
    await expect(page.getByTestId("home-search-bar")).toBeVisible()
    await expect(page.getByRole("link", { name: /Abrir el mapa/i })).toBeVisible()
    await assertNoAccidentalOverflow(page, "/")
    assertHappyPathNetwork(guards.responses500, guards.networkFailures)
    assertPageErrorsClean(guards.pageErrors, { baseHost: host(), webkitRscCancels: cancels })
  })

  for (const vp of CRITICAL_OVERFLOW_VIEWPORTS) {
    test(`overflow ${vp.name}`, async ({ page }) => {
      await installHappyPathMocks(page)
      await installMapboxE2eAdapter(page)
      const guards = attachPageErrorGuards(page)
      const cancels: string[] = []
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto("/", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(400)
      await assertNoAppCrash(page)
      const doc = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }))
      expect(doc.sw, `scrollWidth ${doc.sw} > clientWidth ${doc.cw}`).toBeLessThanOrEqual(
        doc.cw + 1
      )
      await assertNoAccidentalOverflow(page, `home@${vp.name}`)
      await page.goto("/mapa", { waitUntil: "domcontentloaded" })
      await waitForMapAdapterOrFallback(page)
      await assertNoAppCrash(page)
      await assertNoAccidentalOverflow(page, `mapa@${vp.name}`)
      assertHappyPathNetwork(guards.responses500, guards.networkFailures)
      assertPageErrorsClean(guards.pageErrors, { baseHost: host(), webkitRscCancels: cancels })
    })
  }

  test("favoritos sin sesión — mock unauth 200, no 500", async ({ page, context }) => {
    await context.clearCookies()
    await installHappyPathMocks(page)
    const guards = attachPageErrorGuards(page)
    const cancels: string[] = []
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/favoritos", { waitUntil: "domcontentloaded" })
    await Promise.race([
      page.waitForURL(/\/login/, { timeout: 12_000 }),
      page.locator('[data-auth-state="unauthenticated"]').waitFor({ state: "visible", timeout: 12_000 }),
      page.locator('[data-auth-state="loading"]').waitFor({ state: "visible", timeout: 12_000 }),
    ]).catch(() => null)
    await page.waitForTimeout(500)
    await assertNoAppCrash(page)
    const url = page.url()
    const state = await page.locator("[data-auth-state]").first().getAttribute("data-auth-state").catch(() => null)
    expect(
      /\/login/.test(url) || state === "unauthenticated" || state === "loading",
      `favoritos unauth falló url=${url} state=${state}`
    ).toBeTruthy()
    assertHappyPathNetwork(guards.responses500, guards.networkFailures)
    assertPageErrorsClean(guards.pageErrors, { baseHost: host(), webkitRscCancels: cancels })
  })

  test("mapa 10 ciclos — adapter mock + lifecycle stats", async ({ page }) => {
    await installHappyPathMocks(page)
    await installMapboxE2eAdapter(page)
    const guards = attachPageErrorGuards(page)
    const cancels: string[] = []
    await page.setViewportSize({ width: 390, height: 844 })

    await page.goto("/mapa", { waitUntil: "domcontentloaded" })
    const kind = await waitForMapAdapterOrFallback(page)
    expect(kind, "mapa debe montar adapter mock, no fallback init").toBe("mock")
    await expect(page.getByText(/No pudimos cargar el mapa/i)).toHaveCount(0)

    let stats = await readMapboxLifecycleStats(page)
    expect(stats, "stats window.__celimapMapboxStats").toBeTruthy()
    expect(stats!.active).toBe(1)
    expect(stats!.peakActive).toBe(1)

    for (let i = 0; i < 10; i++) {
      // SPA soft nav — full goto resetea módulo/window y no corre destroy
      await softLeaveMapa(page)
      stats = await readMapboxLifecycleStats(page)
      expect(stats, `ciclo ${i + 1} stats tras salir`).toBeTruthy()
      expect(stats!.active, `ciclo ${i + 1} active tras salir`).toBe(0)

      await softEnterMapa(page)
      await waitForMapAdapterOrFallback(page)
      stats = await readMapboxLifecycleStats(page)
      expect(stats!.active, `ciclo ${i + 1} active en mapa`).toBe(1)
      expect(stats!.peakActive).toBe(1)
      const canvases = await countMapCanvases(page)
      expect(canvases, `ciclo ${i + 1} canvases`).toBe(1)
    }

    stats = await readMapboxLifecycleStats(page)
    const canvases = await countMapCanvases(page)
    test.info().annotations.push({
      type: "mapbox-lifecycle",
      description: JSON.stringify({
        mode: "e2e-mock-adapter",
        webglReal: false,
        inits: stats?.inits,
        destroys: stats?.destroys,
        active: stats?.active,
        peakActive: stats?.peakActive,
        canvases,
      }),
    })

    expect(stats!.inits).toBeGreaterThanOrEqual(11)
    expect(stats!.destroys).toBeGreaterThanOrEqual(10)
    expect(stats!.active).toBe(1)
    expect(stats!.peakActive).toBe(1)
    expect(canvases).toBe(1)

    await assertNoAppCrash(page)
    assertHappyPathNetwork(guards.responses500, guards.networkFailures)
    assertPageErrorsClean(guards.pageErrors, { baseHost: host(), webkitRscCancels: cancels })
  })

  test("fallback error — /ruta-inexistente-e2e no Application error crash", async ({
    page,
  }) => {
    await installHappyPathMocks(page)
    const guards = attachPageErrorGuards(page)
    const cancels: string[] = []
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/ruta-inexistente-e2e-lote3", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(400)
    await assertNoAppCrash(page)
    await assertBodyHasVisibleContent(page)
    assertHappyPathNetwork(guards.responses500, guards.networkFailures)
    assertPageErrorsClean(guards.pageErrors, { baseHost: host(), webkitRscCancels: cancels })
  })
})
