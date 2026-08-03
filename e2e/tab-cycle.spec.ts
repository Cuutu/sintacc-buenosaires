/**
 * @hermetic @mobile @critical — BottomNav clicks reales, cadencia humana.
 */
import { test, expect } from "@playwright/test"
import {
  HUMAN_TAB_SETTLE_MS,
  attachPageErrorGuards,
  attachUnhandledRejectionGuard,
  assertNoAppCrash,
  assertNoRedirectLoop,
  assertPageErrorsClean,
  assertHappyPathNetwork,
  assertSingleChrome,
  clickBottomNav,
  drainUnhandledRejections,
  enableCelimapDiag,
  installHappyPathMocks,
  installMapboxE2eAdapter,
  readCelimapDiag,
  readMapboxLifecycleStats,
  waitForMapAdapterOrFallback,
} from "./helpers"
import { E2E_SESSION_AUTH } from "./fixtures/payloads"

const host = () =>
  new URL(test.info().project.use.baseURL || "http://127.0.0.1:3000").host

async function settle(page: import("@playwright/test").Page) {
  await page.waitForTimeout(HUMAN_TAB_SETTLE_MS)
  await assertNoAppCrash(page)
  await assertSingleChrome(page)
}

test.describe("BottomNav tab cycles @hermetic @mobile @critical", () => {
  test("unauth: Favoritos → Perfil → Favoritos", async ({ page, context }) => {
    await context.clearCookies()
    await context.route("**/sw.js", (r) => r.abort())
    await enableCelimapDiag(page)
    await installHappyPathMocks(page)
    const guards = attachPageErrorGuards(page)
    const cancels: string[] = []
    await attachUnhandledRejectionGuard(page)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("bottom-nav")).toBeVisible({ timeout: 12_000 })
    const diag0 = await readCelimapDiag(page)

    await clickBottomNav(page, "favoritos")
    await page.waitForURL(/\/(favoritos|login)/, { timeout: 12_000 })
    await settle(page)
    await clickBottomNav(page, "perfil")
    await page.waitForURL(/\/(perfil|login)/, { timeout: 12_000 })
    await settle(page)
    await clickBottomNav(page, "favoritos")
    await page.waitForURL(/\/(favoritos|login)/, { timeout: 12_000 })
    await settle(page)
    await assertNoRedirectLoop(page)

    const diag1 = await readCelimapDiag(page)
    expect(diag1?.layoutChromeMounts ?? 0).toBeLessThanOrEqual(
      (diag0?.layoutChromeMounts ?? 1) + 1
    )
    expect(diag1?.listenerAttachCycles ?? 0).toBeLessThanOrEqual(2)

    const rej = await drainUnhandledRejections(page)
    expect(rej).toEqual([])
    assertHappyPathNetwork(guards.responses500, guards.networkFailures)
    assertPageErrorsClean(guards.pageErrors, { baseHost: host(), webkitRscCancels: cancels })
  })

  test("auth: Favoritos → Perfil → Favoritos", async ({ page, context }) => {
    await context.clearCookies()
    await context.route("**/sw.js", (r) => r.abort())
    await installHappyPathMocks(page, { session: E2E_SESSION_AUTH })
    const guards = attachPageErrorGuards(page)
    const cancels: string[] = []
    await attachUnhandledRejectionGuard(page)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("bottom-nav")).toBeVisible({ timeout: 12_000 })

    await clickBottomNav(page, "favoritos")
    await page.waitForURL(/\/favoritos/, { timeout: 12_000 })
    await settle(page)
    await clickBottomNav(page, "perfil")
    await page.waitForURL(/\/perfil/, { timeout: 12_000 })
    await settle(page)
    await clickBottomNav(page, "favoritos")
    await page.waitForURL(/\/favoritos/, { timeout: 12_000 })
    await settle(page)

    expect(await drainUnhandledRejections(page)).toEqual([])
    assertHappyPathNetwork(guards.responses500, guards.networkFailures)
    assertPageErrorsClean(guards.pageErrors, { baseHost: host(), webkitRscCancels: cancels })
  })

  test("auth: Home → Mapa → Favoritos → Perfil → Home", async ({ page, context }) => {
    await context.clearCookies()
    await context.route("**/sw.js", (r) => r.abort())
    await installHappyPathMocks(page, { session: E2E_SESSION_AUTH })
    await installMapboxE2eAdapter(page)
    const guards = attachPageErrorGuards(page)
    const cancels: string[] = []
    await attachUnhandledRejectionGuard(page)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("bottom-nav")).toBeVisible({ timeout: 12_000 })
    await settle(page)

    await clickBottomNav(page, "home-map")
    await page.waitForURL(/\/mapa/, { timeout: 12_000 })
    await waitForMapAdapterOrFallback(page)
    await settle(page)

    await clickBottomNav(page, "favoritos")
    await page.waitForURL(/\/favoritos/, { timeout: 12_000 })
    await settle(page)

    await clickBottomNav(page, "perfil")
    await page.waitForURL(/\/perfil/, { timeout: 12_000 })
    await settle(page)

    // Home desde perfil: slot home-map apunta a /mapa; usar link Home solo en mapa.
    // Desde perfil vamos a mapa (home-map) luego Home en mapa → /
    await clickBottomNav(page, "home-map")
    await page.waitForURL(/\/mapa/, { timeout: 12_000 })
    await settle(page)
    await clickBottomNav(page, "home-map") // ahora es Home → /
    await page.waitForURL((u) => u.pathname === "/", { timeout: 12_000 })
    await settle(page)

    const stats = await readMapboxLifecycleStats(page)
    if (stats) expect(stats.active).toBeLessThanOrEqual(1)

    expect(await drainUnhandledRejections(page)).toEqual([])
    assertHappyPathNetwork(guards.responses500, guards.networkFailures)
    assertPageErrorsClean(guards.pageErrors, { baseHost: host(), webkitRscCancels: cancels })
  })

  test("auth loading: Perfil href estable /perfil (no /login hop)", async ({ page, context }) => {
    await context.clearCookies()
    await context.route("**/sw.js", (r) => r.abort())
    await installHappyPathMocks(page, {
      session: E2E_SESSION_AUTH,
      delaySessionMs: 4_000,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("bottom-nav")).toBeVisible({ timeout: 12_000 })
    const perfil = page.getByTestId("bottom-nav").locator('[data-nav-slot="perfil"]')
    await expect(perfil).toHaveAttribute("href", "/perfil")
    await assertNoAppCrash(page)
  })

  for (const mode of ["unauth", "auth"] as const) {
    test(`${mode}: 20 ciclos (cadencia humana)`, async ({ page, context }) => {
      test.setTimeout(240_000)
      await context.clearCookies()
      await context.route("**/sw.js", (r) => r.abort())
      await enableCelimapDiag(page)
      await installHappyPathMocks(
        page,
        mode === "auth" ? { session: E2E_SESSION_AUTH } : undefined
      )
      await installMapboxE2eAdapter(page)
      const guards = attachPageErrorGuards(page)
      const cancels: string[] = []
      await attachUnhandledRejectionGuard(page)

      let navCount = 0
      page.on("framenavigated", (frame) => {
        if (frame === page.mainFrame()) navCount += 1
      })

      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto("/", { waitUntil: "domcontentloaded" })
      await expect(page.getByTestId("bottom-nav")).toBeVisible({ timeout: 12_000 })
      const diagStart = await readCelimapDiag(page)

      const sequence: Array<"home-map" | "favoritos" | "sugerir" | "perfil"> = [
        "home-map",
        "favoritos",
        "sugerir",
        "perfil",
      ]

      for (let i = 0; i < 20; i++) {
        for (const slot of sequence) {
          await clickBottomNav(page, slot, { settleMs: HUMAN_TAB_SETTLE_MS })
          await assertNoAppCrash(page)
        }
        await assertSingleChrome(page)
      }

      const diagEnd = await readCelimapDiag(page)
      console.log(
        "[tab-cycle-metrics]",
        JSON.stringify({
          mode,
          navCount,
          diagStart,
          diagEnd,
          pageErrors: guards.pageErrors.length,
        })
      )

      // LayoutChrome / listeners no deben acumular mounts por cada tab
      expect(diagEnd?.layoutChromeMounts ?? 1).toBeLessThanOrEqual(
        (diagStart?.layoutChromeMounts ?? 1) + 2
      )
      expect(diagEnd?.listenerAttachCycles ?? 1).toBeLessThanOrEqual(3)

      expect(await drainUnhandledRejections(page)).toEqual([])
      expect(guards.pageErrors.length).toBe(0)
      assertPageErrorsClean(guards.pageErrors, { baseHost: host(), webkitRscCancels: cancels })
      assertHappyPathNetwork(guards.responses500, guards.networkFailures)
      const stats = await readMapboxLifecycleStats(page)
      if (stats) expect(stats.active).toBeLessThanOrEqual(1)
    })
  }
})
